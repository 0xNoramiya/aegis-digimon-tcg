import { afterEach, describe, expect, it, vi } from "vitest";
import type { Client } from "colyseus";
import { AegisRoom, MESSAGE_FLOOD_CLOSE_CODE } from "./AegisRoom.js";

function fakeClient(sessionId: string): Client {
  return { sessionId, send: vi.fn<() => void>(), leave: vi.fn<() => void>(), view: undefined } as unknown as Client;
}

function makeRoom(): AegisRoom {
  const room = new AegisRoom();
  room.lock = vi.fn<() => Promise<void>>(async () => {});
  room.unlock = vi.fn<() => Promise<void>>(async () => {});
  room.setMatchmaking = vi.fn<() => Promise<void>>(async () => {});
  room.onCreate({ seed: 1 });
  return room;
}

function admitter(room: AegisRoom): (client: Client) => boolean {
  return (room as unknown as { admitClientMessage: (c: Client) => boolean }).admitClientMessage.bind(room);
}

function send(admit: (client: Client) => boolean, client: Client, count: number): number {
  let admitted = 0;
  for (let i = 0; i < count; i++) if (admit(client)) admitted++;
  return admitted;
}

describe("AegisRoom message flood guard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("admits a burst, drops the excess, and refills over time", () => {
    const room = makeRoom();
    try {
      const now = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
      const admit = admitter(room);
      const client = fakeClient("session-a");
      expect(send(admit, client, 200)).toBe(120);
      now.mockReturnValue(1_000_000 + 250);
      expect(send(admit, client, 20)).toBe(10);
      expect(client.leave).not.toHaveBeenCalled();
    } finally {
      room.onDispose();
    }
  });

  it("meters each client separately", () => {
    const room = makeRoom();
    try {
      vi.spyOn(Date, "now").mockReturnValue(1_000_000);
      const admit = admitter(room);
      send(admit, fakeClient("session-a"), 200);
      expect(send(admit, fakeClient("session-b"), 10)).toBe(10);
    } finally {
      room.onDispose();
    }
  });

  it("disconnects a client that keeps flooding after its messages are dropped", () => {
    const room = makeRoom();
    try {
      vi.spyOn(Date, "now").mockReturnValue(1_000_000);
      const admit = admitter(room);
      const client = fakeClient("session-a");
      send(admit, client, 120 + 400);
      expect(client.leave).not.toHaveBeenCalled();
      send(admit, client, 1);
      expect(client.leave).toHaveBeenCalledWith(MESSAGE_FLOOD_CLOSE_CODE);
    } finally {
      room.onDispose();
    }
  });
});

import { describe, expect, it, vi } from "vitest";
import { CloseCode, type Client } from "colyseus";
import { CONNECTION_REPORT_CHANNEL } from "@aegis/shared/protocol/ConnectionReport";
import { AegisRoom } from "#api/rooms/AegisRoom";
import type { ConnectionDropStore } from "#api/connections/ConnectionDropStore";

type DropRecorder = Pick<ConnectionDropStore, "recordDrop" | "resolveDrop" | "recordClientReport">;

const EMPTY_DECK = { mainDeck: [], eggDeck: [] };
const report = { closeCode: 1006, offlineMs: 1_800, attempts: 1, hiddenAtDrop: true, onlineAtDrop: true };

class RecordingRoom extends AegisRoom {
  readonly drops: DropRecorder = {
    recordDrop: vi.fn<DropRecorder["recordDrop"]>(async () => 7),
    resolveDrop: vi.fn<DropRecorder["resolveDrop"]>(async () => {}),
    recordClientReport: vi.fn<DropRecorder["recordClientReport"]>(async () => {}),
  };

  protected override connectionDrops(): DropRecorder {
    return this.drops;
  }
}

function createClient(sessionId: string): Client {
  return { sessionId, send: vi.fn<Client["send"]>(), view: undefined } as unknown as Client;
}

function createSeatedRoom(): { room: RecordingRoom; dropped: Client; opponent: Client } {
  const room = new RecordingRoom();
  room.lock = vi.fn<AegisRoom["lock"]>(async () => {});
  room.unlock = vi.fn<AegisRoom["unlock"]>(async () => {});
  room.broadcast = vi.fn<AegisRoom["broadcast"]>(() => true);
  room.onCreate({ seed: 1 });
  room.broadcastPatch = vi.fn<AegisRoom["broadcastPatch"]>(() => false);
  const opponent = createClient("session-a");
  const dropped = createClient("session-b");
  room.clients.push(opponent);
  room.onJoin(opponent, { displayName: "Agumon", deck: EMPTY_DECK });
  room.clients.push(dropped);
  room.onJoin(dropped, { displayName: "Gabumon", deck: EMPTY_DECK });
  return { room, dropped, opponent };
}

function sendMessage(room: AegisRoom, client: Client, type: string, payload: unknown): void {
  const handlers = (
    room as unknown as { onMessageEvents: { events: Record<string, ((...args: unknown[]) => void)[]> } }
  ).onMessageEvents.events;
  for (const handler of handlers["*"] ?? []) {
    handler(client, type, payload);
  }
}

async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("connection drop history in a room", () => {
  it("records a dropped seat, resolves it as reconnected, and attaches the client's report", async () => {
    const { room, dropped } = createSeatedRoom();
    const reconnected = createClient(dropped.sessionId);
    room.allowReconnection = vi.fn<() => Promise<Client>>(
      async () => reconnected,
    ) as unknown as AegisRoom["allowReconnection"];

    await room.onLeave(dropped, CloseCode.ABNORMAL_CLOSURE);
    sendMessage(room, reconnected, CONNECTION_REPORT_CHANNEL, report);
    await flushPromises();

    expect(room.drops.recordDrop).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: room.roomId,
        matchId: room.state.matchLogId,
        displayName: "Gabumon",
        seat: 1,
        closeCode: CloseCode.ABNORMAL_CLOSURE,
      }),
    );
    expect(room.drops.resolveDrop).toHaveBeenCalledWith(expect.objectContaining({ id: 7, outcome: "reconnected" }));
    expect(room.drops.recordClientReport).toHaveBeenCalledWith({ id: 7, report });
  });

  it("accepts one report per reconnect and ignores reports from the other seat", async () => {
    const { room, dropped, opponent } = createSeatedRoom();
    const reconnected = createClient(dropped.sessionId);
    room.allowReconnection = vi.fn<() => Promise<Client>>(
      async () => reconnected,
    ) as unknown as AegisRoom["allowReconnection"];

    await room.onLeave(dropped, CloseCode.ABNORMAL_CLOSURE);
    sendMessage(room, opponent, CONNECTION_REPORT_CHANNEL, report);
    sendMessage(room, reconnected, CONNECTION_REPORT_CHANNEL, report);
    sendMessage(room, reconnected, CONNECTION_REPORT_CHANNEL, report);
    await flushPromises();

    expect(room.drops.recordClientReport).toHaveBeenCalledTimes(1);
  });

  it("resolves the drop as expired when the reconnect window closes", async () => {
    const { room, dropped } = createSeatedRoom();
    room.allowReconnection = vi.fn<() => Promise<Client>>(async () => {
      throw new Error("grace expired");
    }) as unknown as AegisRoom["allowReconnection"];

    await room.onLeave(dropped, CloseCode.ABNORMAL_CLOSURE);
    sendMessage(room, dropped, CONNECTION_REPORT_CHANNEL, report);
    await flushPromises();

    expect(room.drops.resolveDrop).toHaveBeenCalledWith(expect.objectContaining({ id: 7, outcome: "expired" }));
    expect(room.drops.recordClientReport).not.toHaveBeenCalled();
  });

  it("does not record a consented leave", async () => {
    const { room, dropped } = createSeatedRoom();

    await room.onLeave(dropped, CloseCode.CONSENTED);

    expect(room.drops.recordDrop).not.toHaveBeenCalled();
  });
});

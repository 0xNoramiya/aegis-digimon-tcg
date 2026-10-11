import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { Client } from "@colyseus/sdk";
import { Phase, ROOM_TYPE_BOT, type GameState, type CardInstance } from "@aegis/shared";
import { roomRegistry } from "@aegis-api/rooms/AegisRoom.js";
import { RED_DECK } from "@aegis-api/engine/testDecks.js";
import type { ScenarioFixture } from "@aegis-api/engine/scenario/types.js";
import { configureLocalScenario, clearLocalScenario } from "@aegis-api/engine/scenario/local.js";
const fixtures = Object.values(
  import.meta.glob<{ default: ScenarioFixture }>("../../api/src/engine/scenarios/*.fixture.ts", { eager: true }),
).map((module) => module.default);
import { startTestServer, type TestServer } from "./scenarioHarness/server";

const visibleIdentity = (card: CardInstance) => (card.faceUp || card.ownerSeat === 0 ? card.cardId : undefined);

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.close();
});

it.each(fixtures)("sends the complete $name board on its first connection", async (fixture) => {
  configureLocalScenario(fixture);
  const room = await new Client(server.endpoint).create<GameState>(ROOM_TYPE_BOT, {
    displayName: "Scenario viewer",
    deck: RED_DECK,
    devScenario: "local-fixture",
  });
  room.onMessage("*", () => {});
  try {
    const host = roomRegistry.get(room.roomId)!;
    expect(host.addBot()).toBe(true);
    await vi.waitFor(() => expect(room.state.phase).not.toBe(Phase.None));
    await vi.waitFor(() => {
      for (const seat of [0, 1] as const) {
        const actual = room.state.players[seat]!;
        const expected = host.state.players[seat]!;
        expect(
          actual.battleArea.map((permanent) => ({
            card: permanent.topCard?.cardId,
            sources: permanent.stack.map((card) => card.cardId),
          })),
        ).toEqual(
          expected.battleArea.map((permanent) => ({
            card: permanent.topCard.cardId,
            sources: permanent.stack.map(visibleIdentity),
          })),
        );
        expect(actual.breeding?.topCard?.cardId).toBe(expected.breeding?.topCard?.cardId);
        expect(actual.breeding?.stack.map((card) => card.cardId)).toEqual(
          expected.breeding?.stack.map(visibleIdentity),
        );
        expect(actual.trash.map((card) => card.cardId)).toEqual(expected.trash.map(visibleIdentity));
      }
      expect(room.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
        host.state.players[0]!.hand.map((card) => card.cardId),
      );
      expect(room.state.players[1]!.hand?.length ?? 0).toBe(0);
    });
  } finally {
    await room.leave();
    clearLocalScenario();
  }
});

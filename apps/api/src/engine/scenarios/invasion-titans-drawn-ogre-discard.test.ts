import { readFileSync } from "node:fs";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { runReplay, type ReplayRecord } from "../../replays/inputs/index.js";
import type { ScenarioFixture } from "../scenario/fixture.js";
import { advance } from "../testkit/advance.js";
import { settle, type EngineSetup } from "../testkit/harness.js";
import { setupScenario } from "../testkit/scenario.js";
import { invasionTitansDrawnOgreDiscard } from "./invasion-titans-drawn-ogre-discard.fixture.js";

async function withScenario(
  fixture: ScenarioFixture,
  selectedAliases: string[],
  verify: (s: EngineSetup) => Promise<void>,
  preferTriggerKeys?: string[],
) {
  const preferred: string[] = [];
  const s = setupScenario(fixture, { autoSelectCards: true, preferInstanceIds: preferred, preferTriggerKeys });
  preferred.push(...selectedAliases.map((alias) => s.inst(alias).instanceId));
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await verify(s);
  } finally {
    if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat as 0 | 1, { type: "surrender" });
    await loop;
  }
}

async function useInvasion(s: EngineSetup) {
  const invasionId = s.inst("invasion").instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: invasionId })).toEqual({ ok: true });
  await settle(
    () => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === invasionId) && !s.state.pendingDecision,
  );
}

describe("Invasion of the Titans: discarding newly drawn Ogres", () => {
  it.each(["BT24-013", "BT24-026", "BT24-045", "BT26-069", "BT14-100", "BT6-108", "BT7-076"])(
    "draws once after discarding a newly drawn %s and another Digimon",
    async (ogreCardId) => {
      await withScenario(
        invasionTitansDrawnOgreDiscard({ ogreCardId }),
        ["newlyDrawnOgre", "discardFodder"],
        async (s) => {
          const deckBefore = s.state.players[0]!.deck.length;
          expect(s.state.players[0]!.hand).toHaveLength(5);
          await useInvasion(s);
          expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([
            s.inst("discardFodder").instanceId,
            s.inst("newlyDrawnOgre").instanceId,
          ]);
          expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("secondDraw").instanceId);
          expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("bonusDraw").instanceId);
          expect(s.state.players[0]!.hand).toHaveLength(5);
          expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 3);
          expect(s.state.memory).toBe(2);
          expect(s.state.turnSeat).toBe(0);
          expect(s.state.phase).toBe(Phase.Main);
        },
      );
    },
  );

  it.each(["BT24-013", "BT24-026", "BT24-045", "BT26-069"])(
    "does not draw for newly drawn %s when six cards remain",
    async (ogreCardId) => {
      await withScenario(
        invasionTitansDrawnOgreDiscard({ ogreCardId, handSizeAfterDiscard: 6 }),
        ["newlyDrawnOgre", "discardFodder"],
        async (s) => {
          const deckBefore = s.state.players[0]!.deck.length;
          await useInvasion(s);
          expect(s.state.players[0]!.hand).toHaveLength(6);
          expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 2);
          expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("bonusDraw").instanceId);
          expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([
            s.inst("discardFodder").instanceId,
            s.inst("newlyDrawnOgre").instanceId,
          ]);
          expect(s.state.memory).toBe(2);
          expect(s.state.turnSeat).toBe(0);
        },
      );
    },
  );

  it.each(["BT24-013", "BT24-026"])(
    "two newly drawn Ogres draw only once with %s resolving first",
    async (firstCardId) => {
      // Official Q5583: the hand-size condition is checked when each pending effect activates.
      await withScenario(
        invasionTitansDrawnOgreDiscard({ ogreCardId: "BT24-013", twoOgres: true }),
        ["newlyDrawnOgre", "secondDraw"],
        async (s) => {
          const deckBefore = s.state.players[0]!.deck.length;
          await useInvasion(s);
          expect(s.state.players[0]!.hand).toHaveLength(6);
          expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 3);
          expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("bonusDraw").instanceId);
          expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("extraDraw").instanceId);
          expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([
            s.inst("newlyDrawnOgre").instanceId,
            s.inst("secondDraw").instanceId,
          ]);
          expect(s.state.memory).toBe(2);
          expect(s.state.turnSeat).toBe(0);
          const order = s.events
            .filter((event) => event.kind === "resolutionOrderChosen")
            .flatMap((event) => event.entries)
            .filter((entry) => entry.sourceCardId === "BT24-013" || entry.sourceCardId === "BT24-026");
          expect(order[0]?.sourceCardId).toBe(firstCardId);
        },
        [firstCardId],
      );
    },
  );

  it("replays the recorded discard without divergence before input 10, then draws for Ogremon", async () => {
    const record = JSON.parse(
      readFileSync(new URL("./invasion-titans-drawn-ogre-discard.replay.json", import.meta.url), "utf8"),
    ) as ReplayRecord;
    const replay = await runReplay(record, { untilInput: 10 });
    try {
      expect(replay.divergences).toEqual([]);
      const player = replay.state.players[0]!;
      expect(player.hand).toHaveLength(6);
      const input = record.inputs[10]!;
      if (
        input.kind !== "intent" ||
        input.intent.type !== "respondDecision" ||
        input.intent.response.kind !== "selectCards"
      )
        throw new Error("Expected the recorded two-card discard at input 10");
      const discardedIds = input.intent.response.instanceIds;
      expect(discardedIds.map((id) => player.hand.find((c) => c.instanceId === id)?.cardId)).toEqual([
        "BT24-075",
        "BT24-045",
      ]);
      const bonusId = player.deck[0]!.instanceId;
      expect(await replay.applyIntent(input.seat, input.intent)).toEqual({ ok: true });
      expect(player.trash.map((c) => c.instanceId)).toEqual(discardedIds);
      expect(player.hand).toHaveLength(5);
      expect(player.hand.map((c) => c.instanceId)).toContain(bonusId);
      expect(player.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT24-098"]);
      expect(player.security).toHaveLength(5);
      expect(replay.state.pendingDecision).toBeUndefined();
      expect(replay.state.turnSeat).toBe(1);
      expect(replay.state.memory).toBe(3);
    } finally {
      await replay.applyIntent(replay.state.turnSeat as 0 | 1, { type: "surrender" });
    }
  });
});

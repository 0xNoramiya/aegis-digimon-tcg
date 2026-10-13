import fixture, { ouryumonTurnFixture } from "./turn-player-memory-gain-before-opponent-delete.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import type { ScenarioFixture } from "../scenario/types.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

async function openMainPhase(scenario: ScenarioFixture) {
  const s = setupEngine({ 0: {}, 1: {} });
  layScenarioFixture(s.state, scenario, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

describe("an effect adding security to the hand triggers hand-add and security-removal watchers together", () => {
  it("resolves the turn player's MirageGaogamon memory gain before the opponent's Ouryumon deletes it", async () => {
    const { s, loop } = await openMainPhase(fixture);
    try {
      expect(s.state.memory).toBe(4);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: fixturePermanentId("mirage-monzaemon"),
          instanceId: fixtureInstanceId("mirage-gaogamon-card"),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 0);

      expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(
        fixtureInstanceId("ouryumon-security-0"),
      );
      expect(s.state.players[1]!.hand).toHaveLength(4);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
        fixtureInstanceId("mirage-gaogamon-card"),
      );
      expect(s.state.memory).toBe(1);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("resolves the turn player's Ouryumon deletion first, so the opponent's MirageGaogamon never gains memory", async () => {
    const { s, loop } = await openMainPhase(ouryumonTurnFixture);
    try {
      expect(s.state.memory).toBe(4);
      expect(
        s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("security-to-hand-option") }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.battleArea.length === 0);

      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
        fixtureInstanceId("ouryumon-security-0"),
      );
      expect(s.state.players[0]!.hand).toHaveLength(4);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(
        fixtureInstanceId("mirage-gaogamon-card"),
      );
      expect(s.state.memory).toBe(2);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});

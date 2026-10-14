import { describe, expect, it } from "vitest";
import type { DecisionResponse } from "@aegis/shared";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { drainMicrotasks, settle, type EngineSetup } from "#api/engine/testkit/harness";
import { fixtureInstanceId, fixturePermanentId } from "#api/engine/scenario/references";
import fixture from "#api/engine/scenarios/suspended-tyrantkabuterimon-ignores-paladin-mode.fixture";
import "#api/cards/index";

const SUSPEND_CLAUSE =
  "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may suspend 1 of your opponent's Digimon.";
const BATTLE_CLAUSE =
  "Then, you may return all digivolution cards of 1 of their Digimon to the bottom of the deck and have this Digimon battle it. Compare the number of digivolution cards instead of DP in this battle.";
const RETURN_CLAUSE =
  "[All Turns] [Once Per Turn] When this Digimon wins a battle, you may return 1 of your opponent's Digimon to the bottom of the deck.";
const UNSUSPEND_CLAUSE = "Then, this Digimon may unsuspend.";

const tyrant = fixturePermanentId("tyrantKabuterimon");
const rookie = fixturePermanentId("sourcelessRookie");
const tyrantSources = ["tyrantSourceBottom", "tyrantSourceMiddle", "tyrantSourceTop"].map(fixtureInstanceId);

async function answer(s: EngineSetup, emphasis: string, response: DecisionResponse): Promise<void> {
  await settle(() => s.state.pendingDecision !== undefined);
  const { req } = s.decisions.at(-1)!;
  expect(req.options?.effectTextEmphasis).toBe(emphasis);
  expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: req.decisionId, response })).toEqual({
    ok: true,
  });
  await settle(() => s.state.pendingDecision?.decisionId !== req.decisionId);
}

async function attackAndSuspendTyrant(s: EngineSetup): Promise<void> {
  await advance(s.engine).waitForMainPhase(0);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: fixturePermanentId("paladinMode"),
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await answer(s, SUSPEND_CLAUSE, { kind: "chooseTargets", instanceIds: [tyrant] });
  expect(s.perm("tyrantKabuterimon").isSuspended).toBe(true);
  await answer(s, BATTLE_CLAUSE, { kind: "optional", accept: true });
}

function tyrantStack(s: EngineSetup): string[] | undefined {
  return s.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === tyrant)?.stack.map(
    (card) => card.instanceId,
  );
}

describe("suspended TyrantKabuterimon against Imperialdramon: Paladin Mode", () => {
  it("keeps its digivolution cards and wins the source-count battle after being suspended", async () => {
    const s = setupScenario(fixture, { autoOrderTriggers: true });
    const loop = s.engine.startTurnLoop();
    try {
      await attackAndSuspendTyrant(s);
      await answer(s, BATTLE_CLAUSE, { kind: "chooseTargets", instanceIds: [tyrant] });
      await settle(() => s.state.pendingDecision === undefined && s.state.combatWindow === undefined);
      await drainMicrotasks();

      expect(tyrantStack(s)).toEqual(tyrantSources);
      expect(s.events.find((event) => event.kind === "battleCompared")).toMatchObject({
        defenderPermanentId: tyrant,
        loserPermanentIds: [fixturePermanentId("paladinMode")],
      });
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(tyrant);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("stays in the battle area when the battle-won return chooses it", async () => {
    const s = setupScenario(fixture, { autoOrderTriggers: true });
    const loop = s.engine.startTurnLoop();
    try {
      await attackAndSuspendTyrant(s);
      await answer(s, BATTLE_CLAUSE, { kind: "chooseTargets", instanceIds: [rookie] });
      await answer(s, RETURN_CLAUSE, { kind: "chooseTargets", instanceIds: [tyrant] });
      await answer(s, UNSUSPEND_CLAUSE, { kind: "optional", accept: false });
      await settle(() => s.state.pendingDecision === undefined && s.state.combatWindow === undefined);
      await drainMicrotasks();

      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([tyrant]);
      expect(s.perm("tyrantKabuterimon").isSuspended).toBe(true);
      expect(tyrantStack(s)).toEqual(tyrantSources);
      expect(s.state.players[1]!.deck.map((card) => card.instanceId)).not.toContain(
        fixtureInstanceId("tyrantKabuterimon"),
      );
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});

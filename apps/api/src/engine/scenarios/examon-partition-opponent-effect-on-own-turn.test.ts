import { describe, expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle, type EngineSetup } from "#api/engine/testkit/harness";
import { fixtureInstanceId, fixturePermanentId } from "#api/engine/scenario/references";
import {
  examonPartitionOpponentEffectOnOwnTurn,
  type ExamonPartitionRemoval,
} from "#api/engine/scenarios/examon-partition-opponent-effect-on-own-turn.fixture";
import "#api/cards/index";

const LEVEL_FIVE_SOURCES = ["blueLevelFiveWingdramon", "greenLevelFiveGroundramon"] as const;

function partitionDecisions(s: EngineSetup) {
  return s.decisions.filter(({ req }) => req.options?.selectionContext === "partitionActivation");
}

function battleAreaInstanceIds(s: EngineSetup, seat: 0 | 1) {
  return s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard.instanceId);
}

const attackTargets: Record<
  ExamonPartitionRemoval,
  () => { kind: "player" } | { kind: "permanent"; permanentId: string }
> = {
  securityOption: () => ({ kind: "player" }),
  retaliation: () => ({ kind: "permanent", permanentId: fixturePermanentId("retaliationWizardmon") }),
};

describe("Examon's Partition against an opponent's effect during Examon's own turn", () => {
  for (const removal of ["securityOption", "retaliation"] as const) {
    it(`offers Partition to Examon's controller and plays both Lv.5 sources (${removal})`, async () => {
      const s = setupScenario(examonPartitionOpponentEffectOnOwnTurn(removal), {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
      });
      const loop = s.engine.startTurnLoop();
      try {
        await advance(s.engine).waitForMainPhase(0);
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: fixturePermanentId("examon"),
            target: attackTargets[removal](),
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.pendingDecision === undefined &&
            s.state.combatWindow === undefined &&
            LEVEL_FIVE_SOURCES.every((alias) => battleAreaInstanceIds(s, 0).includes(fixtureInstanceId(alias))),
        );

        expect(partitionDecisions(s).map(({ seat, req }) => ({ seat, sourceCardId: req.sourceCardId }))).toEqual([
          { seat: 0, sourceCardId: "BT23-047" },
        ]);
        expect(battleAreaInstanceIds(s, 0).sort()).toEqual(
          LEVEL_FIVE_SOURCES.map((alias) => fixtureInstanceId(alias)).sort(),
        );
        expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual([
          "BT21-046",
          "BT23-047",
          "EX13-005",
          "EX13-018",
        ]);
        expect(s.state.memory).toBe(3);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    });
  }
});

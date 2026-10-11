import fixtureTrainingUseMemory from "./training-use-memory.fixture.js";
import fixtureTrainingDelayPaid from "./training-delay-paid.fixture.js";
import fixtureTrainingDelayFree from "./training-delay-free.fixture.js";
import fixtureTrainingDelayCostChoice from "./training-delay-cost-choice.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture, type ScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../testkit/harness.js";

describe("Treadmill Training current-behavior arenas", () => {
  it("pays 2 before the search, finishes placement, then starts the opponent's turn at 1", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(s.state, fixtureTrainingUseMemory, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.memory).toBe(1);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("training-card") })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      expect(s.state.memory).toBe(-1);
      expect(s.state.turnSeat).toBe(0);
      const request = s.decisions.at(-1)!.req;
      expect(request.options?.candidateInstanceIds).toEqual([fixtureInstanceId("deck-1-card")]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: { kind: "selectCards", instanceIds: [fixtureInstanceId("deck-1-card")] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      const human = s.state.players[0]!;
      // Engine memory is relative to the current turn player and flips when the turn changes.
      expect(s.state.memory).toBe(1);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(human.battleArea.map((p) => p.topCard.cardId)).toEqual(["LM-054"]);
      expect(human.hand.map((c) => c.cardId)).toEqual(["BT1-009", "BT1-051"]);
      expect(human.deck.at(-1)?.cardId).toBe("BT1-013");
      expect(human.trash).toHaveLength(0);
    } finally {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  const delayCases: { scenario: ScenarioFixture; evolution: string; choice: number; memory: number }[] = [
    { scenario: fixtureTrainingDelayPaid, evolution: "BT1-054", choice: 0, memory: 2 },
    { scenario: fixtureTrainingDelayFree, evolution: "BT1-051", choice: 0, memory: 3 },
    { scenario: fixtureTrainingDelayCostChoice, evolution: "EX5-054", choice: 0, memory: 1 },
    { scenario: fixtureTrainingDelayCostChoice, evolution: "EX5-054", choice: 1, memory: 2 },
  ];
  it.each(delayCases)(
    "$scenario choice $choice finishes at $memory memory",
    async ({ scenario, evolution, choice, memory }) => {
      const s = setupEngine(
        { 0: {}, 1: {} },
        { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: choice },
      );
      layScenarioFixture(s.state, scenario, [BLUE_DECK, RED_DECK], true);
      const training = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "LM-054")!;
      const trainingId = training.topCard.instanceId;
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.memory).toBe(3);
        const [ability] = JSON.parse(training.activatableEffectsJson) as { effectKey: string }[];
        expect(ability).toBeDefined();
        expect(
          s.engine.applyIntent(0, {
            type: "activateEffect",
            sourceInstanceId: trainingId,
            effectKey: ability!.effectKey,
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === evolution) &&
            s.state.pendingDecision === undefined,
        );
        await drainMicrotasks();
        expect(s.state.memory).toBe(memory);
        expect(s.state.turnSeat).toBe(0);
        expect(s.state.phase).toBe(Phase.Main);
        const human = s.state.players[0]!;
        expect(human.trash.map((c) => c.instanceId)).toEqual([trainingId]);
        expect(human.hand.map((c) => c.cardId)).toEqual(["BT1-009", "BT1-009"]);
        expect(human.battleArea).toHaveLength(1);
        expect(human.battleArea[0]!.stack.map((c) => c.cardId)).toEqual([
          evolution === "EX5-054" ? "BT14-038" : "BT1-046",
        ]);
        const choices = s.decisions.flatMap(({ req }) => {
          const costChoice = req.options?.digivolveCostChoice;
          return costChoice ? [{ costs: costChoice.costs, costDelta: costChoice.costDelta }] : [];
        });
        expect(choices).toEqual(evolution === "EX5-054" ? [{ costs: [4, 3], costDelta: -2 }] : []);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );

  it("declining digivolution after activating Delay preserves 3 memory and the host", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
    layScenarioFixture(s.state, fixtureTrainingDelayPaid, [BLUE_DECK, RED_DECK], true);
    const training = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "LM-054")!;
    const trainingId = training.topCard.instanceId;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const [ability] = JSON.parse(training.activatableEffectsJson) as { effectKey: string }[];
      expect(ability).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: trainingId,
          effectKey: ability!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.trash.some((c) => c.instanceId === trainingId) && s.state.pendingDecision === undefined,
      );
      await drainMicrotasks();
      expect(s.state.memory).toBe(3);
      expect(s.state.turnSeat).toBe(0);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT1-046"]);
      expect(s.state.players[0]!.hand.map((c) => c.cardId)).toContain("BT1-054");
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});

import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { mainActions } from "../training/actions.js";
import { trainingObservation } from "../training/observation.js";
import type { TrainingWindow } from "../training/policy.js";
import { actionFeatures, chooseHeuristic, parseHeuristic, SEED_HEURISTIC } from "./heuristic.js";
import "../../cards/index.js";

describe("evolved heuristic interpreter", () => {
  it("applies a deck-specific preference only in its declared context", async () => {
    const setup = setupEngine({ 0: { hand: ["BT1-010", "BT1-011"] } });
    await setup.ready();
    const window: TrainingWindow = {
      observation: trainingObservation(setup.state, 0),
      kind: "main",
      selected: [],
      actions: mainActions(setup.engine, 0),
    };
    const program = parseHeuristic({
      schemaVersion: 1,
      title: "Conditional pilot",
      rules: [
        {
          feature: "bias",
          weight: 10,
          advice: "Prioritize this rookie when affordable.",
          when: { kind: "main", sourceCardIds: ["BT1-010"], maximum: { cost: 3 } },
        },
      ],
    });
    const choice = window.actions[chooseHeuristic(program, window)]!;
    expect(choice.sourceId).toBe(setup.state.players[0]!.hand.find((card) => card.cardId === "BT1-010")!.instanceId);
    expect(chooseHeuristic(program, { ...window, kind: "different" })).toBe(0);
  });
  it("rejects unknown features, nonfinite weights, and missing guide text", () => {
    for (const rule of [
      { feature: "readOpponentHand", weight: 1, advice: "Cheat" },
      { feature: "cost", weight: Infinity, advice: "Invalid" },
      { feature: "cost", weight: 1, advice: "" },
    ])
      expect(() => parseHeuristic({ schemaVersion: 1, title: "Pilot", rules: [rule] })).toThrow(
        "Invalid heuristic rule",
      );
    expect(parseHeuristic(SEED_HEURISTIC)).toEqual(SEED_HEURISTIC);
  });

  it("chooses the available winning attack through the real engine action surface", async () => {
    const setup = setupEngine({
      0: { battleArea: [{ card: "BT1-025", as: "attacker" }], hand: ["BT1-010"] },
      1: { security: [] },
    });
    await setup.ready();
    const window: TrainingWindow = {
      observation: trainingObservation(setup.state, 0),
      kind: "main",
      selected: [],
      actions: mainActions(setup.engine, 0),
    };
    for (let index = 0; index < window.actions.length; index++)
      expect(Object.values(actionFeatures(window, index)).every(Number.isFinite)).toBe(true);
    const action = window.actions[chooseHeuristic(SEED_HEURISTIC, window)]!;
    expect(action.intent.type).toBe("attack");
    expect(setup.engine.applyIntent(0, action.intent)).toEqual({ ok: true });
  });

  it("accounts for memory handover and uses public card metadata for plays", async () => {
    const setup = setupEngine({ 0: { hand: ["BT1-010", "BT1-085"] } });
    await setup.ready();
    setup.state.memory = 1;
    const window: TrainingWindow = {
      observation: trainingObservation(setup.state, 0),
      kind: "main",
      selected: [],
      actions: mainActions(setup.engine, 0),
    };
    const index = window.actions.findIndex((action) => action.intent.type === "playCard" && action.projectedCost === 4);
    const features = actionFeatures(window, index);
    expect(features.playTamer).toBe(1);
    expect(features.handover).toBe(3);
  });
});

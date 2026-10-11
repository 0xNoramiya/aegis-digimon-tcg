import fixtureBt11HadesForceTargetSelection from "./bt11-hades-force-target-selection.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it.each([
  { choice: "Hexeblaumon", ids: [fixturePermanentId("opponent-hades-hexeblau")], survivors: ["BT4-093", "EX4-015"] },
  {
    choice: "two cheap targets",
    ids: [fixturePermanentId("opponent-hades-tamer"), fixturePermanentId("opponent-hades-rookie")],
    survivors: ["EX7-023"],
  },
  { choice: "nothing", ids: [], survivors: ["BT4-093", "EX4-015", "EX7-023"] },
  {
    choice: "illegal over-budget response",
    ids: [fixturePermanentId("opponent-hades-hexeblau"), fixturePermanentId("opponent-hades-tamer")],
    survivors: ["BT4-093", "EX4-015", "EX7-023"],
  },
])(": selects $choice with a 12-cost budget", async ({ ids, survivors }) => {
  const s = setupEngine({ 0: {}, 1: {} });
  layScenarioFixture(s.state, fixtureBt11HadesForceTargetSelection, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("hades-option-card") })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.decisions.some(({ req }) => req.kind === "chooseTargets" && req.options?.maxTotalPlayCost === 12),
    );
    const { seat, req: selection } = s.decisions.find(
      ({ req }) => req.kind === "chooseTargets" && req.options?.maxTotalPlayCost === 12,
    )!;
    expect(selection.options).toMatchObject({ min: 0, max: 3, maxTotalPlayCost: 12, targetFate: "delete" });
    expect(selection.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([
        fixturePermanentId("opponent-hades-tamer"),
        fixturePermanentId("opponent-hades-rookie"),
        fixturePermanentId("opponent-hades-hexeblau"),
      ]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(3);
    expect(
      s.engine.applyIntent(seat, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "chooseTargets", instanceIds: ids },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const attack = s.decisions.find(({ req }) => req.kind === "optional")!;
    expect(
      s.engine.applyIntent(attack.seat, {
        type: "respondDecision",
        decisionId: attack.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some((card) => card.instanceId === fixtureInstanceId("hades-option-card")),
    );
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(survivors);
    expect(s.state.memory).toBe(5);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

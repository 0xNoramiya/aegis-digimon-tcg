import { expect, it } from "vitest";
import type { DecisionResponse } from "@aegis/shared";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle, type EngineSetup } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/leave-prevention-cost-payer-stays.fixture";
import "#api/cards/AD1/AD1-025";
import "#api/cards/EX13/EX13-038";
import "#api/cards/EX13/EX13-043";

async function answer(s: EngineSetup, seat: 0 | 1, kind: DecisionResponse["kind"], response: DecisionResponse) {
  await settle(() => s.state.pendingDecision?.seat === seat && s.state.pendingDecision.kind === kind);
  expect(
    s.engine.applyIntent(seat, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

it("keeps the suspended Digimon unsuspended to pay a they-don't-leave cost with the others it saves", async () => {
  const s = setupScenario(fixture, { autoOrderTriggers: true });
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(1);
    const savedIds = ["salamon", "leopardmon", "goblimon"].map((alias) => s.perm(alias).permanentId);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("phoenixmon").permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.seat === 0 && s.state.pendingDecision.kind === "optional");
    expect(s.decisions.at(-1)?.req.options?.affectedPermanentIds).toEqual(savedIds);
    await answer(s, 0, "optional", { kind: "optional", accept: true });
    await answer(s, 0, "chooseTargets", { kind: "chooseTargets", instanceIds: [s.perm("leopardmon").permanentId] });
    await answer(s, 1, "chooseTargets", { kind: "chooseTargets", instanceIds: [s.perm("goblimon").permanentId] });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 2);

    const battleArea = s.state.players[0]!.battleArea;
    expect(battleArea.map(({ permanentId }) => permanentId)).toEqual(savedIds.slice(0, 2));
    expect(battleArea.map(({ isSuspended }) => isSuspended)).toEqual([true, false]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("goblimon").instanceId);
    expect(s.state.players[0]!.deck.some(({ cardId }) => cardId !== "BT1-009")).toBe(false);
  } finally {
    s.engine.applyIntent(1, { type: "surrender" });
    await loop;
  }
});

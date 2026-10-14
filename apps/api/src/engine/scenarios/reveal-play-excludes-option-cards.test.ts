import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/reveal-play-excludes-option-cards.fixture";
import "#api/cards/EX12/EX12-055";
import "#api/cards/EX12/EX12-058";
import "#api/cards/EX12/EX12-053";

it.each(["andromon", "hiAndromon"])(
  "%s reveal play offers only Digimon and Tamer cards and trashes revealed Options",
  async (played) => {
    const s = setupScenario(fixture);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(played).instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const selection = s.decisions.at(-1)!.req;
      expect(selection).toMatchObject({
        kind: "selectCards",
        options: { candidateInstanceIds: [s.inst("hagurumon").instanceId], min: 0, max: 1 },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: selection.decisionId,
          response: { kind: "selectCards", instanceIds: [s.inst("giantMeat").instanceId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
      const human = s.state.players[0]!;
      const handIds = human.hand.map((card) => card.instanceId);
      const trashIds = human.trash.map((card) => card.instanceId);
      expect(handIds).not.toContain(s.inst("giantMeat").instanceId);
      expect(handIds).not.toContain(s.inst("metalEmpire").instanceId);
      expect(trashIds).toEqual(
        expect.arrayContaining([
          s.inst("giantMeat").instanceId,
          s.inst("metalEmpire").instanceId,
          s.inst("hagurumon").instanceId,
        ]),
      );
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);

it("Andromon plays the chosen revealed Digimon card", async () => {
  const s = setupScenario(fixture);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("andromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("hagurumon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
    const human = s.state.players[0]!;
    expect(human.battleArea.map((permanent) => permanent.topCard?.instanceId)).toContain(
      s.inst("hagurumon").instanceId,
    );
    expect(human.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("giantMeat").instanceId, s.inst("metalEmpire").instanceId]),
    );
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

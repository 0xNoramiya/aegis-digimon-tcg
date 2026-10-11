import fixtureBt26CerberusmonOptionalCost from "./bt26-cerberusmon-optional-cost.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("BT26 Cerberusmon optional cost arena scenario", () => {
  it.each([true, false])(
    "pays the cost before the optional Option and consumes the use (use: %s)",
    async (useOption) => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoChooseOption: true });
      layScenarioFixture(s.state, fixtureBt26CerberusmonOptionalCost, [BLUE_DECK, RED_DECK], true);
      s.engine.startTurnLoop();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const opponent = s.state.players[1]!;
      const hostId = fixturePermanentId("own-cerberusmon-base");
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: hostId,
          instanceId: fixtureInstanceId("bt26-cerberusmon-card"),
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(human.trash.some(({ instanceId }) => instanceId === fixtureInstanceId("cerberusmon-hand-cost-card"))).toBe(
        true,
      );
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: useOption },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.memory).toBe(useOption ? 6 : 7);
      expect(opponent.battleArea[0]!.topCard.cardId).toBe(useOption ? "BT1-009" : "BT1-019");
      expect(human.trash.some(({ instanceId }) => instanceId === fixtureInstanceId("cerberusmon-hand-cost-card"))).toBe(
        true,
      );
      const decisions = s.decisions.length;
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(() => opponent.security.length === 2 && s.state.pendingDecision === undefined);
      expect(s.decisions.slice(decisions).some(({ req }) => req.sourceCardId === "BT26-074")).toBe(false);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    },
  );

  it("can decline on evolution and accept the cost on attack", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(s.state, fixtureBt26CerberusmonOptionalCost, [BLUE_DECK, RED_DECK], true);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const hostId = fixturePermanentId("own-cerberusmon-base");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: fixtureInstanceId("bt26-cerberusmon-card"),
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const hand = human.hand.map(({ instanceId }) => instanceId);
    const trash = human.trash.map(({ instanceId }) => instanceId);
    expect(s.decisions.at(-1)!.req.options?.min).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(human.hand.map(({ instanceId }) => instanceId)).toEqual(hand);
    expect(human.trash.map(({ instanceId }) => instanceId)).toEqual(trash);
    expect(s.state.memory).toBe(7);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [fixtureInstanceId("cerberusmon-hand-cost-card")] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(human.trash.some(({ instanceId }) => instanceId === fixtureInstanceId("cerberusmon-hand-cost-card"))).toBe(
      true,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.security.length === 2 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(7);
    expect(
      human.trash.some(({ instanceId }) => instanceId === fixtureInstanceId("cerberusmon-titan-option-card")),
    ).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  });
});

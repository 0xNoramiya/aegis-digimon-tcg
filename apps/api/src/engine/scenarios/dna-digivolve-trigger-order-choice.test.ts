import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import fixture from "#api/engine/scenarios/dna-digivolve-trigger-order-choice.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, settle } from "#api/engine/testkit/harness";
import "#api/cards/index";

describe("DNA digivolve trigger order choice", () => {
  it.each([
    { first: "BT16-085", opponentSuspended: true },
    { first: "BT16-025", opponentSuspended: false },
  ])(
    "lets the turn player resolve $first first when Paildramon DNA digivolves beside Davis & Ken",
    async ({ first, opponentSuspended }) => {
      const s = setupScenario(fixture, { autoOrderTriggers: false, autoAcceptOptional: true, autoSelectCards: true });
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);

        expect(
          s.engine.applyIntent(0, {
            type: "dnaDigivolve",
            instanceId: s.inst("paildramon").instanceId,
            materialPermanentIds: [s.perm("blue").permanentId, s.perm("green").permanentId],
          }),
        ).toEqual({ ok: true });

        await settle(() => s.state.pendingDecision !== undefined);
        const order = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
        expect(order.kind).toBe("orderTriggers");
        expect(order.seat).toBe(0);
        const cardIds = order.options?.triggerCardIds ?? [];
        expect([...cardIds].sort()).toEqual(["BT16-025", "BT16-085"]);
        const firstKey = order.options!.triggerKeys![cardIds.indexOf(first)]!;
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: order.decisionId,
            response: { kind: "orderTriggers", order: [firstKey] },
          }),
        ).toEqual({ ok: true });

        await settle(() => s.state.pendingDecision === undefined && s.state.memory === 7);
        const opponent = s.state.players[1]!.battleArea.find(
          (permanent) => permanent.permanentId === s.perm("threeSources").permanentId,
        )!;
        expect(opponent.stack).toHaveLength(0);
        expect(opponent.isSuspended).toBe(opponentSuspended);
        expect(s.perm("davisAndKen").isSuspended).toBe(true);
        assertNoLoudGap(s);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );
});

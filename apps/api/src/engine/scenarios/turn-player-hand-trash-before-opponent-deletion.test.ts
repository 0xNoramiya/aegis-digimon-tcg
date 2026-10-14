import { describe, expect, it } from "vitest";
import type { DecisionResponse, Seat } from "@aegis/shared";
import { Phase } from "@aegis/shared/schema/enums";
import fixture from "#api/engine/scenarios/turn-player-hand-trash-before-opponent-deletion.fixture";
import { fixtureInstanceId, fixturePermanentId } from "#api/engine/scenario/references";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle, settleAcrossTimers } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";

describe("Turn player's hand-trash watcher before the opponent's On Deletion", () => {
  it("resolves Plutomon's new hand-trash trigger from Witchmon before Gladimon's On Deletion", async () => {
    const s = setupScenario(fixture, { autoOrderTriggers: false });
    const loop = s.engine.startTurnLoop();
    const answer = async (
      seat: Seat,
      sourceCardId: string | undefined,
      kind: DecisionResponse["kind"],
      response: DecisionResponse,
    ) => {
      await settleAcrossTimers(() => s.state.pendingDecision !== undefined);
      const pending = s.state.pendingDecision!;
      const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect({ seat: request.seat, sourceCardId: request.sourceCardId, kind: request.kind }).toEqual({
        seat,
        sourceCardId,
        kind,
      });
      expect(s.engine.applyIntent(seat, { type: "respondDecision", decisionId: request.decisionId, response })).toEqual(
        {
          ok: true,
        },
      );
      return request;
    };
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: fixturePermanentId("plutomon"),
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });

      await answer(0, "BT26-059", "selectCards", {
        kind: "selectCards",
        instanceIds: [fixtureInstanceId("plutomon-cost-card")],
      });
      await answer(0, "BT26-059", "optional", { kind: "optional", accept: true });
      await answer(0, "BT26-059", "selectCards", {
        kind: "selectCards",
        instanceIds: [fixtureInstanceId("witchmon-card")],
      });
      await settleAcrossTimers(() => s.state.pendingDecision?.kind === "orderTriggers");
      const order = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
      expect(order.options?.triggerCardIds).toEqual(["BT25-080", "BT26-059"]);
      await answer(0, undefined, "orderTriggers", {
        kind: "orderTriggers",
        order: [order.options!.triggerKeys![0]!],
      });
      await answer(0, "BT25-080", "selectCards", {
        kind: "selectCards",
        instanceIds: [fixtureInstanceId("witchmon-cost-card")],
      });
      await answer(0, "BT25-080", "optional", { kind: "optional", accept: true });
      await answer(0, "BT25-080", "chooseTargets", {
        kind: "chooseTargets",
        instanceIds: [fixturePermanentId("gladimon")],
      });

      const plutomon = await answer(0, "BT26-059", "optional", { kind: "optional", accept: true });
      expect(plutomon.promptText).toBe("Delete all target(s)");
      await settleAcrossTimers(() => s.state.pendingDecision !== undefined);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      await answer(1, "EX13-052", "chooseTargets", {
        kind: "chooseTargets",
        instanceIds: [fixturePermanentId("plutomon")],
      });
      await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      expect(
        s.events.flatMap((event) =>
          event.kind === "effectTriggered" ? [`${event.seat}:${event.sourceCardId}:${event.timing}`] : [],
        ),
      ).toEqual([
        "0:BT26-059:OnUseAttack",
        "0:BT25-080:OnPlay",
        "0:BT26-059:whenHandTrashed",
        "1:EX13-052:OnDestroyedAnyone",
      ]);
      expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
        expect.arrayContaining([fixtureInstanceId("gladimon-card"), fixtureInstanceId("agumon-card")]),
      );
    } finally {
      s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  });
});

import { describe, expect, it } from "vitest";
import type { DecisionResponse, Seat } from "@aegis/shared";
import { Phase } from "@aegis/shared/schema/enums";
import fixture from "#api/engine/scenarios/crowmon-digivolves-after-own-tamer-trash-and-discard.fixture";
import { fixtureInstanceId, fixturePermanentId } from "#api/engine/scenario/references";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle, settleAcrossTimers } from "#api/engine/testkit/harness";
import "#api/cards/index";

describe("Crowmon's [Your Turn] digivolve after its own When Digivolving", () => {
  for (const [position, offeredIndex] of [
    ["first", 0],
    ["second", 1],
  ] as const) {
    it(`digivolves into Ravemon from the trash when the ${position} offered occurrence resolves first`, async () => {
      const s = setupScenario(fixture, { autoOrderTriggers: false });
      const loop = s.engine.startTurnLoop();
      const answer = async (
        seat: Seat,
        sourceCardId: string | undefined,
        kind: DecisionResponse["kind"],
        respond: (options: NonNullable<(typeof s.decisions)[number]["req"]["options"]>) => DecisionResponse,
      ) => {
        await settleAcrossTimers(() => s.state.pendingDecision !== undefined);
        const pending = s.state.pendingDecision!;
        const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
        expect({ seat: request.seat, sourceCardId: request.sourceCardId, kind: request.kind }).toEqual({
          seat,
          sourceCardId,
          kind,
        });
        expect(
          s.engine.applyIntent(seat, {
            type: "respondDecision",
            decisionId: request.decisionId,
            response: respond(request.options ?? {}),
          }),
        ).toEqual({ ok: true });
        return request;
      };
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);

        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: fixturePermanentId("sunflowmon"),
            instanceId: fixtureInstanceId("crowmon-card"),
            alternateRequirementIndex: 0,
          }),
        ).toEqual({ ok: true });

        await answer(0, "BT26-076", "optional", () => ({ kind: "optional", accept: true }));
        await answer(1, "BT26-076", "selectCards", () => ({
          kind: "selectCards",
          instanceIds: [fixtureInstanceId("discarded-card")],
        }));
        const order = await answer(0, "BT26-076", "orderTriggers", (options) => ({
          kind: "orderTriggers",
          order: [options.triggerKeys![offeredIndex]!],
        }));
        expect(order.options?.triggerCardIds).toEqual(["BT26-076", "BT26-076"]);
        await answer(0, "BT26-076", "optional", () => ({ kind: "optional", accept: true }));
        await settleAcrossTimers(
          () =>
            s.state.pendingDecision === undefined &&
            s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX4-058"),
        );

        const crowmonHost = s.state.players[0]!.battleArea.find(
          ({ permanentId }) => permanentId === fixturePermanentId("sunflowmon"),
        )!;
        expect(crowmonHost.topCard.instanceId).toBe(fixtureInstanceId("ravemon-card"));
        expect(crowmonHost.stack.map(({ instanceId }) => instanceId)).toEqual([
          fixtureInstanceId("sunflowmon-card"),
          fixtureInstanceId("crowmon-card"),
        ]);
        expect(s.state.memory).toBe(0);
        expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
          fixtureInstanceId("tamer-face-down-card"),
        ]);
        expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toEqual([fixtureInstanceId("kept-card")]);
        expect(s.state.players[1]!.battleArea).toHaveLength(0);
        expect(
          s.events.flatMap((event) =>
            event.kind === "effectTriggered" ? [`${event.sourceCardId}:${event.timing}`] : [],
          ),
        ).toEqual([
          "BT26-076:WhenDigivolving",
          expect.stringMatching(/^BT26-076:(whenHandTrashed|whenDigivolutionTrashed)$/),
        ]);
      } finally {
        s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
        await loop;
      }
    });
  }
});

import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import fixture from "#api/engine/scenarios/decoy-confirmation-on-board.fixture";
import { fixtureInstanceId, fixturePermanentId } from "#api/engine/scenario/references";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle, settleAcrossTimers } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";

describe("Decoy confirmation answered on the board", () => {
  it("asks Sistermon Blanc's controller to pick the holder on the field, then saves Huckmon", async () => {
    const s = setupScenario(fixture);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);

      const sistermon = fixtureInstanceId("own-card-sistermon-blanc-card");
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: fixturePermanentId("own-titamon"),
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(() => s.state.pendingDecision?.seat === 0);

      const pending = s.state.pendingDecision!;
      const decoy = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(decoy).toMatchObject({
        kind: "selectCards",
        promptText: "＜Decoy＞: delete this Digimon to prevent the other Digimon's deletion?",
        sourceCardId: "ST12-12",
      });
      expect(decoy.options).toMatchObject({ candidateInstanceIds: [sistermon], min: 0, max: 1 });
      expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === sistermon)).toBe(true);

      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decoy.decisionId,
          response: { kind: "selectCards", instanceIds: [sistermon] },
        }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      expect(s.events.find((event) => event.kind === "deletionPrevented")).toMatchObject({
        keyword: "Decoy",
        permanentId: fixturePermanentId("own-huckmon"),
        paidPermanentId: fixturePermanentId("own-sistermon-blanc"),
      });
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual([
        "BT1-080",
        "ST12-04",
      ]);
    } finally {
      s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  });
});

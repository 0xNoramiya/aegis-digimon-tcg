import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import type { DecisionResponse } from "@aegis/shared/protocol/intents";
import "#api/cards/index";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { allianceGrantOptionalAttack } from "#api/engine/scenarios/alliance-grant-optional-attack.fixture";

describe("Alliance grant with an independently optional attack", () => {
  it.each([false, true])(
    "retains Alliance after declining attacks with simultaneous watcher %s",
    async (simultaneousWatcher) => {
      const s = setupScenario(allianceGrantOptionalAttack({ simultaneousWatcher }), { autoOrderTriggers: false });
      const loop = s.engine.startTurnLoop();
      let attackChoices = 0;
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await settle(() => s.state.phase === Phase.Main);
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedAdventure").instanceId })).toEqual(
          { ok: true },
        );
        const expectedAttackChoices = simultaneousWatcher ? 2 : 1;
        while (attackChoices < expectedAttackChoices) {
          await settle(() => s.state.pendingDecision !== undefined);
          const decision = s.decisions.at(-1)!.req;
          expect(["orderTriggers", "chooseTargets", "optional"]).toContain(decision.kind);
          expect(decision.options?.selectionContext === "attackSource").toBe(decision.kind === "optional");
          let response: DecisionResponse;
          if (decision.kind === "orderTriggers") {
            response = { kind: "orderTriggers", order: decision.options!.triggerKeys! };
          } else if (decision.kind === "chooseTargets") {
            response = { kind: "chooseTargets", instanceIds: [s.perm("allianceRecipient").permanentId] };
          } else {
            attackChoices += 1;
            response = { kind: "optional", accept: false };
          }
          expect(
            s.engine.applyIntent(0, { type: "respondDecision", decisionId: decision.decisionId, response }),
          ).toEqual({ ok: true });
          await settle(() => s.state.pendingDecision?.decisionId !== decision.decisionId);
        }
        await settle(() => s.state.pendingDecision === undefined);
        expect(observe(s.engine).hasKeyword(s.perm("allianceRecipient"), "Alliance")).toBe(true);
        expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
        expect(s.state.players[0]!.battleArea.every((permanent) => !permanent.isSuspended)).toBe(true);
        expect(s.state.players[1]!.security).toHaveLength(2);
        expect(s.state.memory).toBe(7);
        expect(s.state.phase).toBe(Phase.Main);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );
});

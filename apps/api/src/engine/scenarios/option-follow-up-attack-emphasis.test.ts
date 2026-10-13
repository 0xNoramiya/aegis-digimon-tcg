import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import "#api/cards/index";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import optionFollowUpAttackEmphasis from "#api/engine/scenarios/option-follow-up-attack-emphasis.fixture";

describe("Option follow-up attack emphasis", () => {
  it("emphasizes only the follow-up attack clause after the Option's buffs resolve", async () => {
    const s = setupScenario(optionFollowUpAttackEmphasis, { autoOrderTriggers: true });
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.phase === Phase.Main);
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("finalJudgment").instanceId,
          useAs: "option",
        } as never),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision !== undefined);
      const decision = s.decisions.at(-1)!.req;
      expect(decision.kind).toBe("optional");
      expect(decision.options).toMatchObject({
        selectionContext: "attackSource",
        effectText: expect.stringContaining("Then, it may attack."),
        effectTextEmphasis: "Then, it may attack.",
      });
      expect(observe(s.engine).hasKeyword(s.perm("gekkomon"), "Rush")).toBe(true);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
      expect(s.state.players[1]!.security).toHaveLength(3);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});

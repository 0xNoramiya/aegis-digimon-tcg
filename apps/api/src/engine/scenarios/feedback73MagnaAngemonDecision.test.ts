import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import { layDevScenario } from "../devScenario.js";
import { RED_DECK, BLUE_DECK } from "../testDecks.js";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";
import { advance } from "../testkit/advance.js";
import "../../cards/index.js";

it.each(["low", "high"] as const)(
  "Feedback #73: recovery completes before required %s target choice and Main resumes",
  async (target) => {
    const options = {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
      preferInstanceIds: ["feedback73-security-0-0", "feedback73-replacement"],
    };
    const s = setupEngine(options);
    layDevScenario("arena-feedback73-magnaangemon-decision", s.state, [RED_DECK, BLUE_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const p = s.state.players[0]!;
      await settle(
        () =>
          p.battleArea.some(
            (perm) =>
              perm.permanentId === "dev-perm-0-feedback73-base" &&
              perm.topCard.instanceId === "feedback73-security-0-0",
          ) &&
          s.state.memory === 7 &&
          !s.state.pendingDecision,
      );
      expect(p.security).toHaveLength(5);
      expect(p.security.some((card) => card.instanceId === "feedback73-replacement")).toBe(true);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: "dev-perm-0-feedback73-other",
          instanceId: "feedback73-other-evolution",
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.state.memory === 5 && s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision,
      );
      options.autoSelectCards = false;
      const base = p.battleArea.find((perm) => perm.permanentId === "dev-perm-0-feedback73-base")!;
      const sources = base.stack.map((card) => card.instanceId);
      const oldTop = base.topCard.instanceId;
      const deck = p.deck.length;
      expect(
        s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: "feedback73-magna" }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      const req = s.decisions.at(-1)!.req;
      expect(req).toMatchObject({
        sourceCardId: "BT14-037",
        sourceInstanceId: "feedback73-magna",
        sourcePermanentId: base.permanentId,
      });
      expect(req.options).toMatchObject({
        min: 1,
        max: 1,
        candidateInstanceIds: ["dev-perm-1-feedback73-low", "dev-perm-1-feedback73-high"],
        visibleInstanceIds: ["dev-perm-1-feedback73-low", "dev-perm-1-feedback73-high"],
      });
      expect(p.security).toHaveLength(6);
      expect(p.security[0]!.instanceId).toBe("feedback73-deck-0-5");
      expect(p.hand.map((card) => card.instanceId)).toEqual([
        "feedback73-reserve",
        "feedback73-deck-0-0",
        "feedback73-deck-0-1",
        "feedback73-deck-0-2",
        "feedback73-deck-0-3",
        "feedback73-deck-0-4",
      ]);
      expect(s.state.memory).toBe(2);
      expect(p.trash).toHaveLength(0);
      expect(p.battleArea.some((perm) => perm.topCard.instanceId === "dev-field-0-feedback73-training")).toBe(true);
      expect(s.state.players[1]!.battleArea.map((perm) => perm.currentDP)).toEqual([1000, 8000]);
      // While the mandatory target is unanswered, the game is deliberately pending, not stuck.
      expect(s.engine.applyIntent(0, { type: "endPhase" }).ok).toBe(false);
      expect(s.state.pendingDecision!.decisionId).toBe(req.decisionId);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "chooseTargets", instanceIds: [`dev-perm-1-feedback73-${target}`] },
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      expect(base.topCard.instanceId).toBe("feedback73-magna");
      expect(base.stack.map((card) => card.instanceId)).toEqual([...sources, oldTop]);
      expect(p.deck).toHaveLength(deck - 2);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.memory).toBe(target === "low" ? 3 : 2);
      const opponent = s.state.players[1]!;
      expect(opponent.battleArea.map((perm) => perm.permanentId)).toEqual(
        target === "low" ? ["dev-perm-1-feedback73-high"] : ["dev-perm-1-feedback73-low", "dev-perm-1-feedback73-high"],
      );
      expect(opponent.battleArea.map((perm) => perm.currentDP)).toEqual(target === "low" ? [8000] : [1000, 2000]);
      expect(opponent.trash.map((card) => card.instanceId)).toEqual(
        target === "low" ? ["dev-stack-1-feedback73-low-0", "dev-field-1-feedback73-low"] : [],
      );
      const trigger = s.events.findIndex(
        (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT14-037",
      );
      const recovery = s.events.findIndex(
        (event, index) => index > trigger && event.kind === "securityRecovered" && event.seat === 0,
      );
      const completed = s.events.findIndex(
        (event) => event.kind === "effectResolved" && event.sourceCardId === "BT14-037",
      );
      expect(trigger).toBeGreaterThan(-1);
      expect(recovery).toBeGreaterThan(trigger);
      expect(completed).toBeGreaterThan(recovery);
      expect(
        s.events.flatMap((event) =>
          event.kind === "memoryChanged" && event.reason === "digivolve" ? [[event.from, event.to]] : [],
        ),
      ).toEqual([
        [7, 5],
        [5, 2],
      ]);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.state.memory).toBe(3);
      expect(opponent.battleArea.find((perm) => perm.permanentId === "dev-perm-1-feedback73-high")!.currentDP).toBe(
        8000,
      );
      expect(p.security).toHaveLength(6);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);

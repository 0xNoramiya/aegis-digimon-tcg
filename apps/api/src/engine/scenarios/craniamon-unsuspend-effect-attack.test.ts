import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const FILLER = "BT1-009";
const DECK = Array(20).fill(FILLER) as string[];

// GitHub #5425: an attack ordered by GrapLeomon's effect is blocked by Craniamon. Guardromon's
// inherited effect unsuspends Craniamon during that paused attack, which triggers Craniamon's
// [All Turns] +3000 DP. That derived trigger must resolve before the older pending trigger and
// before the battle (CR 15-4-5-2), not after the ordering effect finishes.
describe("Craniamon's unsuspend boost during an effect-ordered attack", () => {
  for (const first of ["EX13-051", "EX13-062"]) {
    it(`resolves before the battle when ${first} is ordered first`, async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX13-062", as: "craniamon", under: [{ card: "P-144" }, { card: "EX13-051" }] }],
            hand: [{ card: FILLER, as: "spare" }],
            deck: DECK,
            security: [FILLER, FILLER, FILLER],
          },
          1: {
            battleArea: [
              { card: "BT4-065", as: "attacker", dp: 12000 },
              { card: "BT1-009", as: "cheap" },
            ],
            hand: [
              { card: "BT25-016", as: "grapleomon" },
              { card: FILLER, as: "spare1" },
            ],
            deck: DECK,
            security: [FILLER, FILLER, FILLER],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferTriggerKeys: [first] },
      );
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      const craniamonId = s.perm("craniamon").permanentId;
      s.state.players[0]!.battleArea.find((p) => p.permanentId === craniamonId)!.isSuspended = false;
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      s.state.memory = 10;
      const start = s.events.length;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("grapleomon").instanceId })).toEqual({
        ok: true,
      });
      await settleAcrossTimers(() => s.events.slice(start).some(({ kind }) => kind === "blockWindowOpened"));
      expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: craniamonId })).toEqual({ ok: true });
      await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      await settle();

      const events = s.events.slice(start);
      const boost = events.findIndex(
        (event) =>
          event.kind === "effectResolved" &&
          event.sourceCardId === "EX13-062" &&
          /unsuspends/i.test(event.description ?? ""),
      );
      const battle = events.findIndex((event) => event.kind === "battleCompared");
      expect(boost).toBeGreaterThanOrEqual(0);
      expect(boost).toBeLessThan(battle);
      const sweep = events.findIndex(
        (event) =>
          event.kind === "effectResolved" &&
          event.sourceCardId === "EX13-062" &&
          /suspends, you may/i.test(event.description ?? ""),
      );
      expect(sweep).toBeGreaterThanOrEqual(0);
      // The derived boost goes ahead of the older sweep only when Guardromon resolved first.
      expect(boost < sweep).toBe(first === "EX13-051");
      expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === craniamonId)).toBe(true);
      s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    });
  }
});

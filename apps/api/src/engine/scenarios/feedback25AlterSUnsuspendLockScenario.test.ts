import { Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const ALTER_S = "dev-perm-0-feedback25-alter-s";
const KUWAGAMON = "dev-perm-1-feedback25-kuwagamon";
const LOCK = "unsuspendDuringOwnUnsuspendPhase";

type Engine = ReturnType<typeof setupEngine>;

async function enterMain(s: Engine, seat: Seat): Promise<void> {
  await settle(() => s.state.turnSeat === seat && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(seat);
}

// Feedback #25 (match 199f5242): the reporter's Omnimon Alter-S (EX9-021) stayed suspended for
// three of their turns. EX9-037 and then EX9-038 (twice) each gave it "can't unsuspend in their
// next unsuspend phase". The later locks hit an already-suspended Alter-S; per Q4790/Q4792 the
// lock still applies, so each skipped unsuspend phase was legal.
describe("Feedback #25 playable Alter-S unsuspend-lock scenario", () => {
  it("re-locks an already-suspended Alter-S for one unsuspend phase, then lets it unsuspend", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-feedback25-alter-s-unsuspend-lock", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    const alterS = () => s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === ALTER_S)!;

    const attackEndedBy = (attacker: string) =>
      s.events.some((event) => event.kind === "attackEnded" && event.attackerPermanentId === attacker) &&
      !observe(s.engine).isAttacking() &&
      s.state.pendingDecision === undefined;

    await enterMain(s, 0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: ALTER_S, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => attackEndedBy(ALTER_S));
    expect(alterS().isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(alterS(), LOCK)).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await enterMain(s, 1);
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: KUWAGAMON, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => attackEndedBy(KUWAGAMON));
    const kuwagamon = s.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === KUWAGAMON)!;
    expect(kuwagamon.stack.map(({ faceUp }) => faceUp)).toEqual([false]);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(alterS().isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(alterS(), LOCK)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await enterMain(s, 0);
    expect(alterS().isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(alterS(), LOCK)).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await enterMain(s, 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await enterMain(s, 0);
    expect(alterS().isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    s.engine.expireMatchTimer(0);
    await loop;
  });

  it("matches the production chain: EX9-037 locks, then EX9-038's On Play re-locks the suspended target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-021", as: "alterS" }], deck: Array(8).fill("BT1-027") },
        1: {
          // The automatic cost choice takes the first hand card, so the payments come first.
          hand: ["BT1-027", "BT1-027", { card: "EX9-037", as: "garurumon" }, { card: "EX9-038", as: "kuwagamon" }],
          deck: Array(8).fill("BT1-027"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const lockedFor = () => observe(s.engine).isRestricted(s.perm("alterS"), LOCK);

    const playOnBotTurn = async (handAs: string) => {
      s.state.turnSeat = 1;
      s.state.memory = 10;
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(1);
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst(handAs).instanceId })).toEqual({
        ok: true,
      });
      await settle(() => lockedFor() && s.state.pendingDecision === undefined);
      advance(s.engine).endMainPhaseIfOpen(1);
      await turn;
    };
    const runOwnTurn = async () => {
      s.state.turnSeat = 0;
      s.state.memory = 3;
      await advance(s.engine).runTurn(0);
    };

    await playOnBotTurn("garurumon");
    expect(s.perm("alterS").isSuspended).toBe(true);
    await runOwnTurn();
    expect(s.perm("alterS").isSuspended).toBe(true);
    expect(lockedFor()).toBe(false);

    await playOnBotTurn("kuwagamon");
    expect(s.perm("alterS").isSuspended).toBe(true);
    await runOwnTurn();
    expect(s.perm("alterS").isSuspended).toBe(true);
    expect(lockedFor()).toBe(false);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("alterS").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});

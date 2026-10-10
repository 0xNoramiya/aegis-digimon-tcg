import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers, type EngineSetup } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const DORUGREYMON = "dev-perm-0-feedback31-dorugreymon";
const ATTACKER = "dev-perm-1-feedback31-attacker";
const DORUGORAMON = "dev-feedback31-dorugoramon";

function declineOptional(s: EngineSetup): void {
  const decision = s.state.pendingDecision!;
  expect(decision).toMatchObject({ seat: 0, kind: "optional" });
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "optional", accept: false },
    }),
  ).toEqual({ ok: true });
}

describe("Feedback #31 DoruGreymon block arena scenario", () => {
  it("feedback #31: blocking with DoruGreymon switches the attack target and offers its free digivolution", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-feedback31-dorugreymon-block-digivolve", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.seat === 0);
    declineOptional(s);
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: ATTACKER, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.combatWindow?.kind === "block");
    expect(s.state.combatWindow!.eligiblePermanentIds).toContain(DORUGREYMON);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: DORUGREYMON })).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.seat === 0);
    const offer = s.state.pendingDecision!;
    expect(offer).toMatchObject({ kind: "optional", promptText: "Digivolve" });
    expect(JSON.parse(offer.payloadJson).effectText).toContain("When an attack target is switched");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: offer.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard?.cardId === "BT16-064");

    // Dorugoramon (BT16-064) then offers its own unsuspend when the attacker is deleted.
    await settle(() => s.state.pendingDecision?.seat === 0);
    declineOptional(s);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    const doru = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === DORUGREYMON);
    expect(doru?.topCard?.cardId).toBe("BT16-064");
    expect(doru?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT16-087", "BT16-061"]));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === DORUGORAMON)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === ATTACKER)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });
});

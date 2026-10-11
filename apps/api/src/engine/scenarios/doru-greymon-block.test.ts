import fixtureDorugreymonBlockDigivolve from "./dorugreymon-block-digivolve.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers, type EngineSetup } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const DORUGREYMON = fixturePermanentId("own-dorugreymon");
const ATTACKER = fixturePermanentId("opponent-attacker");
const DORUGORAMON = fixtureInstanceId("dorugoramon-card");

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

describe("DoruGreymon block arena scenario", () => {
  it("blocking with DoruGreymon switches the attack target and offers its free digivolution", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(s.state, fixtureDorugreymonBlockDigivolve, [BLUE_DECK, RED_DECK], true);
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

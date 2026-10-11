import fixtureGreymonSecurityTwoZones from "./greymon-security-two-zones.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const ATTACKER_ID = fixturePermanentId("opponent-greymon-zones-attacker");

// Discord 1558643290751115264: the client's dialog for this decision grew below the screen and
// hid its actions. This pins the server decision the arena scenario and the layout rely on.
describe("ST15-08 Greymon security picks from hand and trash", () => {
  it("offers six hand cards and six trash cards, and plays Tai Kamiya for free", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(s.state, fixtureGreymonSecurityTwoZones, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: ATTACKER_ID, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.pendingDecision?.seat === 0);
    const activation = s.state.pendingDecision!;
    expect(activation.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activation.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(
      () => s.state.pendingDecision?.seat === 0 && s.state.pendingDecision.decisionId !== activation.decisionId,
    );
    const pendingId = s.state.pendingDecision!.decisionId;
    const decision = s.decisions.find(({ req }) => req.decisionId === pendingId)!.req;
    expect(decision.sourceCardId).toBe("ST15-08");
    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.trash).toHaveLength(6);
    expect(decision.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([
        fixtureInstanceId("greymon-zones-tai-card"),
        fixtureInstanceId("greymon-zones-agumon-card"),
      ]),
    );
    expect(decision.options?.min).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pendingId,
        response: {
          kind: decision.kind as "chooseTargets",
          instanceIds: [fixtureInstanceId("greymon-zones-tai-card")],
        },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const human = s.state.players[0]!;
    expect(human.hand.map((card) => card.instanceId)).not.toContain(fixtureInstanceId("greymon-zones-tai-card"));
    expect(human.battleArea.some((permanent) => permanent.topCard?.cardId === "ST15-14")).toBe(true);

    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  });
});

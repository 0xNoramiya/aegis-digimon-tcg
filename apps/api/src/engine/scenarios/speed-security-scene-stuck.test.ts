import fixtureSpeedSecuritySceneStuck from "./speed-security-scene-stuck.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const ATTACKER_ID = fixturePermanentId("opponent-speed-monodramon");

// Discord suggestion 1558288251029032970 (match 2e2a3231): a removal reaction deleted the
// attacker before its battle, so the check closed as `trashed` with no battle. The client left
// the revealed Magnamon on screen for the rest of the match. This pins the server stream the
// arena and the browser spec rely on.
describe("game-speed report: a security check whose attacker leaves before the battle", () => {
  it("reveals the Digimon, lets Dynasmon delete the attacker, and closes the check as trashed", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(s.state, fixtureSpeedSecuritySceneStuck, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    const start = s.events.length;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: ATTACKER_ID, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(
      () => s.state.pendingDecision?.kind === "chooseTargets" && s.state.pendingDecision.seat === 0,
    );
    const pendingId = s.state.pendingDecision!.decisionId;
    const reaction = s.decisions.find(({ req }) => req.decisionId === pendingId)!.req;
    expect(reaction.sourceCardId).toBe("AD1-017");
    expect(reaction.options?.candidateInstanceIds).toEqual([ATTACKER_ID]);
    expect(reaction.options?.min).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: reaction.decisionId,
        response: { kind: "chooseTargets", instanceIds: [ATTACKER_ID] },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const events = s.events.slice(start);
    const revealed = events.findIndex((event) => event.kind === "securityRevealed");
    const deleted = events.findIndex(
      (event) =>
        event.kind === "cardsMoved" &&
        (event.deletedPermanents ?? []).some((permanent) => permanent.permanentId === ATTACKER_ID),
    );
    const closed = events.findIndex((event) => event.kind === "securityChecked");
    expect(events[revealed]).toMatchObject({ revealedCardId: "BT23-054", isDigimon: true, seat: 0 });
    expect(revealed).toBeLessThan(deleted);
    expect(deleted).toBeLessThan(closed);
    expect(events[closed]).toMatchObject({ revealedCardId: "BT23-054", resolution: "trashed" });
    expect(events.some((event) => event.kind === "battleCompared")).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT23-054");
    expect(s.state.players[0]!.security).toHaveLength(2);

    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  });
});

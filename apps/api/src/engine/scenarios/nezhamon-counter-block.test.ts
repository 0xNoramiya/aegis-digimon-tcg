import fixtureNezhamonCounterBlock from "./nezhamon-counter-block.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const NEZHAMON = fixturePermanentId("opponent-nezhamon");
const TAKUTOUMON = fixturePermanentId("own-takutoumon");
const HAKUBAMON = fixturePermanentId("own-hakubamon");

describe("Nezhamon Counter and block arena scenario", () => {
  it("opens Counter Timing and then the Collision block window after the redirect is declined", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(s.state, fixtureNezhamonCounterBlock, [BLUE_DECK, RED_DECK], true);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: NEZHAMON, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.seat === 0);
    const redirect = s.state.pendingDecision!;
    expect(redirect.kind).toBe("optional");
    expect(redirect.promptText).toBe("RedirectAttack");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: redirect.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.combatWindow !== undefined);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.combatWindow).toMatchObject({ kind: "counter", seat: 0, attackerPermanentId: NEZHAMON });
    const counter = s.events.find((event) => event.kind === "counterWindowOpened");
    expect(
      counter?.kind === "counterWindowOpened" ? counter.eligibleCounters.map(({ effectKey }) => effectKey) : [],
    ).toEqual([expect.stringContaining("EX12-057")]);

    expect(s.engine.applyIntent(0, { type: "respondCounter" })).toEqual({ ok: true });
    await settle(() => s.state.combatWindow?.kind === "block");
    expect(s.state.combatWindow).toMatchObject({ seat: 0, attackerPermanentId: NEZHAMON, mustBlock: true });
    expect([...s.state.combatWindow!.eligiblePermanentIds].sort()).toEqual([HAKUBAMON, TAKUTOUMON]);
    expect(s.engine.applyIntent(0, { type: "declineBlock" }).ok).toBe(false);

    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: HAKUBAMON })).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.events.find((event) => event.kind === "blocked")).toMatchObject({ blockerPermanentId: HAKUBAMON });
    // ＜Piercing＞ checks one security after Nezhamon deletes the blocker in battle.
    expect(s.state.players[0]!.security).toHaveLength(4);
    const defenderIds = s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId);
    expect(defenderIds).toContain(TAKUTOUMON);
    expect(defenderIds).not.toContain(HAKUBAMON);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX12-043");
  });
});

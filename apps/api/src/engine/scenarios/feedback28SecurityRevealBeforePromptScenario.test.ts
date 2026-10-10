import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

// DB feedback #28 (match cf59b069, timed): the attacker was asked to use ＜Decoy＞ before the
// client showed the security card whose effect caused it. The rules reveal the card first
// (manual: "The player reveals their top security card ... If a card with a [Security] effect is
// checked, that effect activates immediately"), and the server stream already does. This pins
// that order, which the client presentation and the browser spec rely on.
describe("DB feedback #28: a security effect's protection prompt follows the reveal", () => {
  it("reveals BT8-097 before Sinduramon's Decoy asks to save Sandiramon", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-feedback28-security-reveal-before-prompt", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    const sinduramon = human.battleArea.find((permanent) => permanent.topCard.cardId === "EX5-050")!;
    const sandiramon = human.battleArea.find((permanent) => permanent.topCard.cardId === "BT10-079")!;
    const start = s.events.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sinduramon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.pendingDecision?.seat === 0);
    const pending = s.state.pendingDecision!;
    const decoy = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    expect(decoy.promptText).toContain("Decoy");
    expect(decoy.sourceCardId).toBe("EX5-050");

    const beforePrompt = s.events.slice(start);
    const revealed = beforePrompt.findIndex((event) => event.kind === "securityRevealed");
    const triggered = beforePrompt.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT8-097",
    );
    expect(beforePrompt[revealed]).toMatchObject({
      revealedCardId: "BT8-097",
      seat: 1,
      hasSecurityEffect: true,
      isDigimon: false,
    });
    expect(revealed).toBeGreaterThanOrEqual(0);
    expect(revealed).toBeLessThan(triggered);
    expect(beforePrompt.some((event) => event.kind === "securityChecked")).toBe(false);

    const candidates = (decoy.options?.candidateInstanceIds ?? []) as string[];
    expect(candidates.length).toBeGreaterThan(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decoy.decisionId,
        response: { kind: "selectCards", instanceIds: [candidates[0]!] },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const events = s.events.slice(start);
    expect(events.find((event) => event.kind === "securityChecked")).toMatchObject({
      revealedCardId: "BT8-097",
      resolution: "effect",
    });
    expect(events.find((event) => event.kind === "deletionPrevented")).toMatchObject({
      keyword: "Decoy",
      permanentId: sandiramon.permanentId,
      paidPermanentId: sinduramon.permanentId,
    });
    expect(human.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT10-079"]);

    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  });
});

import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { RED_DECK, BLUE_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

it("Feedback #65/#67: Dracomon reveals, adds and publicly orders the two leftovers", async () => {
  const s = setupEngine({ autoOrderCards: false });
  layDevScenario("arena-feedback65-dracomon-selection", s.state, [RED_DECK, BLUE_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const deck = human.deck.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "feedback65-dracomon" })).toEqual({ ok: true });
    await settle(() => !!s.state.pendingDecision);
    const add = s.decisions.at(-1)!.req;
    expect(add).toMatchObject({ kind: "selectCards", sourceCardId: "EX13-008" });
    expect(add.options?.candidateInstanceIds).toEqual(["feedback65-reveal-match"]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: add.decisionId,
        response: { kind: "selectCards", instanceIds: ["feedback65-reveal-match"] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = s.decisions.at(-1)!.req;
    expect(order.options?.candidateInstanceIds).toEqual(["feedback65-reveal-first", "feedback65-reveal-second"]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderCards", order: ["feedback65-reveal-first", "feedback65-reveal-second"] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
    expect(human.deck).toHaveLength(deck - 1);
    expect(human.deck.slice(-2).map((c) => c.instanceId)).toEqual([
      "feedback65-reveal-first",
      "feedback65-reveal-second",
    ]);
    expect(human.hand.map((c) => c.instanceId)).toEqual([
      "feedback65-reserve",
      "feedback65-turn-draw",
      "feedback65-reveal-match",
    ]);
    expect(human.battleArea[0]!.topCard.instanceId).toBe("feedback65-dracomon");
    expect(human.trash).toHaveLength(0);
    expect(human.security).toHaveLength(3);
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

import prepared0 from "./dracomon-selection.fixture.js";
import { fixtureVariant, fixtureInstanceId } from "../scenario/references.js";

import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";

import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

const preparedFixtures = { "dracomon-selection": prepared0 };

it("Feedback #65/#67: Dracomon reveals, adds and publicly orders the two leftovers", async () => {
  const s = setupEngine({ autoOrderCards: false });
  layScenarioFixture(s.state, fixtureVariant(preparedFixtures, "dracomon-selection"));
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const deck = human.deck.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("feedback65-dracomon") })).toEqual(
      { ok: true },
    );
    await settle(() => !!s.state.pendingDecision);
    const add = s.decisions.at(-1)!.req;
    expect(add).toMatchObject({ kind: "selectCards", sourceCardId: "EX13-008" });
    expect(add.options?.candidateInstanceIds).toEqual([fixtureInstanceId("feedback65-reveal-match")]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: add.decisionId,
        response: { kind: "selectCards", instanceIds: [fixtureInstanceId("feedback65-reveal-match")] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = s.decisions.at(-1)!.req;
    expect(order.options?.candidateInstanceIds).toEqual([
      fixtureInstanceId("feedback65-reveal-first"),
      fixtureInstanceId("feedback65-reveal-second"),
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: {
          kind: "orderCards",
          order: [fixtureInstanceId("feedback65-reveal-first"), fixtureInstanceId("feedback65-reveal-second")],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
    expect(human.deck).toHaveLength(deck - 1);
    expect(human.deck.slice(-2).map((c) => c.instanceId)).toEqual([
      fixtureInstanceId("feedback65-reveal-first"),
      fixtureInstanceId("feedback65-reveal-second"),
    ]);
    expect(human.hand.map((c) => c.instanceId)).toEqual([
      fixtureInstanceId("feedback65-reserve"),
      fixtureInstanceId("feedback65-turn-draw"),
      fixtureInstanceId("feedback65-reveal-match"),
    ]);
    expect(human.battleArea[0]!.topCard.instanceId).toBe(fixtureInstanceId("feedback65-dracomon"));
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

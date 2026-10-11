import prepared0 from "./poseidomon-unsuspend-cost.fixture.js";
import { fixtureVariant, fixtureInstanceId } from "../scenario/references.js";

const preparedFixtures = { "poseidomon-unsuspend-cost": prepared0 };

/* oxlint-disable vitest/no-conditional-expect -- Fixed acceptance cases exercise distinct public continuation intents. */
import { expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

it.each([true, false])("Feedback #58: unpaid Link preserves the later unsuspend use, accept=%s", async (accept) => {
  const declinePrompts: string[] = [];
  const s = setupEngine({
    autoAcceptOptional: true,
    autoSelectCards: true,
    preferInstanceIds: [
      fixtureInstanceId("feedback58-link-first"),
      fixtureInstanceId("feedback58-link-second"),
      fixtureInstanceId("feedback58-link-third"),
    ],
    declinePrompts,
  });
  layScenarioFixture(s.state, fixtureVariant(preparedFixtures, "poseidomon-unsuspend-cost"));
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const host = human.battleArea[0]!;
    const lower = opponent.battleArea[0]!;
    const highest = opponent.battleArea[1]!;
    const initialTop = host.topCard.instanceId;
    const deckBefore = human.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: host.permanentId,
        instanceId: fixtureInstanceId("feedback58-poseidomon"),
        linkedInstanceId: fixtureInstanceId("feedback58-beautymon"),
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.pendingDecision &&
        host.linked.some((c) => c.instanceId === fixtureInstanceId("feedback58-link-first")),
    );
    expect(host.stack.map((c) => c.instanceId)).toEqual([initialTop, fixtureInstanceId("feedback58-beautymon")]);
    expect(human.deck).toHaveLength(deckBefore - 1);
    expect(s.state.memory).toBe(5);
    expect(host.isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(lower, "suspend")).toBe(false);
    const costPromptCount = () =>
      s.decisions.filter(({ req }) => req.sourceCardId === "BT23-024" && req.promptText === "ArmSuspendRestriction")
        .length;
    expect(costPromptCount()).toBe(0);
    if (!accept) declinePrompts.push("ArmSuspendRestriction");
    const securityBefore = opponent.security.length;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && opponent.security.length === securityBefore - 1);
    expect(host.linked.map((c) => c.instanceId)).toEqual([
      fixtureInstanceId("feedback58-link-second"),
      fixtureInstanceId("feedback58-link-first"),
    ]);
    expect(host.isSuspended).toBe(!accept);
    expect(observe(s.engine).isRestricted(lower, "suspend")).toBe(accept);
    expect(observe(s.engine).isRestricted(highest, "suspend")).toBe(false);
    expect(costPromptCount()).toBe(1);
    expect(s.state.memory).toBe(5);
    // A paid use stays consumed; refusing before activation leaves a later legal Link available.
    declinePrompts.length = 0;
    if (accept) {
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && opponent.security.length === securityBefore - 2);
      expect(host.isSuspended).toBe(true);
      expect(costPromptCount()).toBe(1);
    } else {
      expect(
        s.engine.applyIntent(0, {
          type: "linkCard",
          instanceId: fixtureInstanceId("feedback58-link-third"),
          targetPermanentId: host.permanentId,
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.pendingDecision && !host.isSuspended);
      expect(costPromptCount()).toBe(2);
      expect(s.state.memory).toBe(4);
    }
    expect(host.linked.map((c) => c.instanceId)).toEqual([
      fixtureInstanceId("feedback58-link-third"),
      fixtureInstanceId("feedback58-link-first"),
    ]);
    expect(human.trash.map((c) => c.instanceId)).toEqual([fixtureInstanceId("feedback58-link-second")]);
    expect(observe(s.engine).isRestricted(lower, "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(highest, "suspend")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: lower.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    const humanSecurityBefore = human.security.length;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: highest.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && human.security.length === humanSecurityBefore - 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).isRestricted(lower, "suspend")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

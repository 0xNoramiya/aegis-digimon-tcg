import prepared0 from "./justimon-end-turn-copy.fixture.js";
import { fixtureVariant } from "../scenario/references.js";

const preparedFixtures = { "justimon-end-turn-copy": prepared0 };

import { expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../testkit/advance.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { RED_DECK } from "../testDecks.js";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";
import "../../cards/index.js";

it.each(
  (["accept", "refuse", "declineEgg"] as const).flatMap((mode) => [
    { mode, arena: false },
    { mode, arena: true },
  ]),
)("Feedback #91: End of Turn copy eligibility, $mode / playable arena $arena", async ({ mode, arena }) => {
  const preferred: string[] = [];
  const declined: string[] = [];
  const endedUsage: number[][] = [];
  const s = setupEngine(
    arena
      ? { 0: {}, 1: {} }
      : {
          0: {
            battleArea: [
              { card: "BT23-059", as: "host", under: [{ card: "EX13-006", as: "egg" }] },
              { card: "LM-058", as: "first" },
              { card: "LM-058", as: "second" },
              { card: "LM-058", as: "third" },
            ],
            hand: [
              { card: "P-203", as: "accel" },
              { card: "EX8-054", as: "x" },
            ],
            deck: Array(20).fill("BT1-009"),
            security: Array(5).fill("BT1-009"),
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "bait" },
              { card: "BT1-076", as: "victim", under: ["BT1-066", "BT1-073"] },
              { card: "BT1-081", as: "other" },
            ],
            hand: ["BT1-009"],
            deck: Array(20).fill("BT1-009"),
            security: Array(9).fill("BT1-009"),
          },
        },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: preferred,
      preferTriggerKeys: ["EX13-006"],
      declinePrompts: declined,
      onEvent(event): void {
        if (event.kind !== "turnEnded" || event.endingSeat !== 0) return;
        // Observe usage before the next turn resets all per-turn ledgers.
        const tracker = advance(s.engine).ledgers.tracker;
        endedUsage.push([
          tracker.count(blitzId, "BT23-059/ir-shared-0"),
          tracker.count(accelId, "P-203/ir-shared-0"),
          tracker.count(xId, "EX8-054/ir-12-0"),
        ]);
      },
    },
  );
  if (arena) layScenarioFixture(s.state, fixtureVariant(preparedFixtures, "justimon-end-turn-copy"));
  else s.state.memory = 6;
  await s.ready();
  const own = s.state.players[0]!;
  const opposing = s.state.players[1]!;
  const host = own.battleArea.find((p) => p.topCard.cardId === "BT23-059")!;
  const victim = opposing.battleArea.find((p) => p.topCard.cardId === "BT1-076")!;
  const hostId = host.permanentId;
  const eggId = host.stack[0]!.instanceId;
  const blitzId = host.topCard.instanceId;
  const accelId = own.hand.find((c) => c.cardId === "P-203")!.instanceId;
  const xId = own.hand.find((c) => c.cardId === "EX8-054")!.instanceId;
  const victimId = victim.permanentId;
  const optionIds = own.battleArea.filter((p) => p.topCard.cardId === "LM-058").map((p) => p.topCard.instanceId);
  expect(optionIds).toHaveLength(3);
  const firstId = optionIds[0]!;
  const secondId = optionIds[1]!;
  const thirdId = optionIds[2]!;
  const baitId = opposing.battleArea.find((p) => p.topCard.cardId === "BT1-009")!.topCard.instanceId;
  const securityIds = [...opposing.security].map((c) => c.instanceId);
  const originalVictimTop = victim.topCard.instanceId;
  const victimLevel4 = victim.stack[1]!.instanceId;
  preferred.push(firstId, victimId);
  const loop = s.engine.startTurnLoop();
  try {
    if (arena) {
      await settle(() => s.state.phase === Phase.Breeding);
      s.engine.applyIntent(0, { type: "endPhase" });
    }
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((e) => e.kind === "attackEnded").length === 1 &&
        !s.state.pendingDecision &&
        s.engine.mainVerbContinuationsInFlight === 0,
    );
    expect(host.isSuspended).toBe(false);
    expect(advance(s.engine).ledgers.tracker.count(blitzId, "BT23-059/ir-shared-0")).toBe(1);
    preferred.length = 0;
    preferred.push(victimId, secondId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: accelId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        host.topCard.instanceId === accelId && !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0,
    );
    expect(s.state.memory).toBe(5);
    expect(victim.topCard.cardId).toBe("BT1-073");
    expect(advance(s.engine).ledgers.tracker.count(accelId, "P-203/ir-shared-0")).toBe(1);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([firstId, secondId]);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((e) => e.kind === "attackEnded").length === 2 &&
        !s.state.pendingDecision &&
        s.engine.mainVerbContinuationsInFlight === 0,
    );
    expect(host.isSuspended).toBe(true);
    expect(victim.topCard.instanceId).toBe(victimLevel4);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: xId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => host.topCard.instanceId === xId && !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0,
    );
    expect(s.state.memory).toBe(4);
    expect(host.stack.map((c) => c.instanceId)).toEqual([eggId, blitzId, accelId]);
    preferred.length = 0;
    preferred.push(accelId, victimId, thirdId);
    if (mode === "refuse") declined.push("by trashing 1 Option card");
    if (mode === "declineEgg") declined.push("paying 1 cost");
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && !s.state.pendingDecision);
    expect(endedUsage).toEqual([[1, 1, mode === "declineEgg" ? 0 : 1]]);
    /* oxlint-disable vitest/no-conditional-expect -- This fixed parameter selects the distinct refusal endpoint; assertions do not depend on observed state. */
    if (mode === "declineEgg") {
      // The legal-attack prerequisite is distinct from a spent lender's copy eligibility.
      expect(s.state.memory).toBe(3);
      expect(host.isSuspended).toBe(true);
      expect(host.topCard.instanceId).toBe(xId);
      expect(host.stack.map((c) => c.instanceId)).toEqual([eggId, blitzId, accelId]);
      expect(victim.topCard.instanceId).toBe(victimLevel4);
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([firstId, secondId]);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === thirdId)).toBe(true);
      expect(s.state.players[1]!.security).toHaveLength(6);
      expect(s.events.filter((e) => e.kind === "attackEnded")).toHaveLength(2);
      expect(s.decisions.filter(({ req }) => req.kind === "selectCards" && req.sourceCardId === "EX8-054")).toEqual([]);
      expect(s.events.filter((e) => e.kind === "memoryChanged" && e.reason === "gainMemory")).toEqual([]);
      assertNoLoudGap(s);
      return;
    }
    /* oxlint-enable vitest/no-conditional-expect */
    expect(s.state.memory).toBe(4);
    expect(host.permanentId).toBe(hostId);
    expect(host.topCard.instanceId).toBe(xId);
    expect(host.stack.map((c) => c.instanceId)).toEqual([eggId, blitzId, accelId]);
    expect(victim.topCard.cardId).toBe("BT1-066");
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toEqual([
      baitId,
      securityIds[0],
      originalVictimTop,
      securityIds[1],
      securityIds[2],
      victimLevel4,
      ...securityIds.slice(3, mode === "accept" ? 7 : 6),
    ]);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual(
      mode === "accept" ? [firstId, secondId, thirdId] : [firstId, secondId],
    );
    expect(s.state.players[0]!.hand).toHaveLength(arena ? 3 : 2);
    expect(s.state.players[0]!.deck).toHaveLength(arena ? 17 : 18);
    expect(s.state.players[1]!.security).toHaveLength(mode === "accept" ? 2 : 3);
    expect(s.events.filter((e) => e.kind === "attackEnded")).toHaveLength(3);
    expect(
      s.events.filter(
        (e) => e.kind === "effectTriggered" && e.sourceCardId === "EX8-054" && e.printedTiming === "WhenAttacking",
      ),
    ).toHaveLength(1);
    const lenderChoice = s.decisions.find(
      ({ req }) =>
        req.kind === "selectCards" &&
        req.sourceCardId === "EX8-054" &&
        req.options?.candidateInstanceIds?.includes(accelId),
    );
    expect(lenderChoice?.req.options?.candidateInstanceIds).toEqual([blitzId, accelId]);
    expect(
      s.events.flatMap((e) => (e.kind === "memoryChanged" && e.reason === "payCost" ? [[e.from, e.to]] : [])),
    ).toEqual([
      [6, 5],
      [5, 4],
    ]);
    expect(
      s.events.flatMap((e) => (e.kind === "memoryChanged" && e.reason === "gainMemory" ? [[e.from, e.to]] : [])),
    ).toEqual([[-3, -4]]);
    const eggPaid = s.events.findIndex((e) => e.kind === "memoryChanged" && e.from === -3 && e.to === -4);
    const unsuspended = s.events.findIndex(
      (e, i) => i > eggPaid && e.kind === "cardsMoved" && e.to === "unsuspended" && e.instanceIds.includes(hostId),
    );
    const forcedAttack = s.events.findIndex((e) => e.kind === "attackDeclared" && e.attackerCardId === "EX8-054");
    const copiedResult = s.events.findIndex(
      (e) => e.kind === "effectResolved" && e.effectKey === "P-203/borrowed/WhenDigivolving",
    );
    const turnEnded = s.events.findIndex((e) => e.kind === "turnEnded");
    expect(eggPaid).toBeGreaterThanOrEqual(0);
    expect(unsuspended).toBeGreaterThan(eggPaid);
    expect(forcedAttack).toBeGreaterThan(unsuspended);
    expect(copiedResult).toBeGreaterThan(forcedAttack);
    expect(turnEnded).toBeGreaterThan(copiedResult);
    assertNoLoudGap(s);
  } finally {
    if (s.state.phase === Phase.Breeding) {
      const cleanupSeat = s.state.turnSeat;
      s.engine.applyIntent(cleanupSeat, { type: "endPhase" });
      await advance(s.engine).waitForMainPhase(cleanupSeat);
    }
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

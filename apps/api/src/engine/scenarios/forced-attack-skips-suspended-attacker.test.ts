import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import {
  forcedAttackSkipsSuspendedAttacker,
  type ForcedAttackerAlias,
} from "#api/engine/scenarios/forced-attack-skips-suspended-attacker.fixture";
import "#api/cards/EX3/EX3-024";
import "#api/cards/BT7/BT7-103";

async function forceOpponentAttack(attacker: ForcedAttackerAlias) {
  const preferred: string[] = [];
  const s = setupScenario(forcedAttackSkipsSuspendedAttacker(attacker), {
    autoAcceptOptional: true,
    autoSelectCards: true,
    preferInstanceIds: preferred,
  });
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  preferred.push(s.perm("lockedAttacker").topCard.instanceId);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mugen").instanceId })).toEqual({ ok: true });
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
  expect(s.perm("lockedAttacker").isSuspended).toBe(true);
  preferred.splice(0, preferred.length, s.perm(attacker).topCard.instanceId);
  const eventsBeforeOpponentTurn = s.events.length;
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
  const opponentTurnEvents = s.events.slice(eventsBeforeOpponentTurn);
  const attackerChoice = s.decisions.find(
    ({ seat, req }) => seat === 1 && req.kind === "chooseTargets" && req.sourceCardId === "EX3-024",
  );
  const cleanup = async () => {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  };
  return { s, opponentTurnEvents, attackerChoice, cleanup };
}

describe("Slayerdramon's forced attack", () => {
  it("lets the opponent choose a suspended Digimon, which then does not attack", async () => {
    const { s, opponentTurnEvents, attackerChoice, cleanup } = await forceOpponentAttack("lockedAttacker");
    try {
      expect(s.state.turnSeat).toBe(1);
      expect(attackerChoice?.req.options?.candidateInstanceIds).toEqual([
        s.perm("lockedAttacker").permanentId,
        s.perm("readyAttacker").permanentId,
      ]);
      expect(opponentTurnEvents.some((event) => event.kind === "attackDeclared")).toBe(false);
      expect(s.perm("lockedAttacker").isSuspended).toBe(true);
      expect(s.perm("readyAttacker").isSuspended).toBe(false);
      expect(s.state.players[0]!.security).toHaveLength(3);
    } finally {
      await cleanup();
    }
  });

  it("declares the attack when the opponent chooses an unsuspended Digimon", async () => {
    const { s, opponentTurnEvents, cleanup } = await forceOpponentAttack("readyAttacker");
    try {
      const declarations = opponentTurnEvents.filter((event) => event.kind === "attackDeclared");
      expect(declarations).toHaveLength(1);
      expect(declarations[0]).toMatchObject({ seat: 1, attackerPermanentId: s.perm("readyAttacker").permanentId });
      expect(s.perm("readyAttacker").isSuspended).toBe(true);
    } finally {
      await cleanup();
    }
  });
});

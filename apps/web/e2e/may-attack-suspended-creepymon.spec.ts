import { test, expect } from "./scenario-page";

const CREEPYMON_ID = "dev-perm-0-may-attack-creepymon";

// Feedback #5 follow-up: "[End of Your Turn] This Digimon may attack" (EX10-009) asks nothing
// when Creepymon is suspended, because it can't attack (KB Q2490).
test("may attack: a suspended Creepymon gets no end-of-turn attack prompt", async ({ scenario }) => {
  await scenario.open("arena-may-attack-suspended-creepymon");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.attack(CREEPYMON_ID);
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      !s.combatWindow &&
      s.players[0]!.battleArea.find((p) => p.permanentId === CREEPYMON_ID)?.isSuspended === true,
  );

  const offered: string[] = [];
  await scenario.page.getByRole("button", { name: /^End turn$/i }).click();
  await scenario.resolveUntil(
    (s) => s.turnSeat === 1 && !s.pendingDecision,
    (decision) => {
      if (decision.kind === "optional" && decision.sourceCardId) offered.push(decision.sourceCardId);
      return { accept: false };
    },
  );

  expect(offered).not.toContain("EX10-009");
  const creepymon = (await scenario.snapshot()).players[0]!.battleArea.find((p) => p.permanentId === CREEPYMON_ID);
  expect(creepymon?.isSuspended).toBe(true);
  await scenario.healthy();
});

test("may attack control: an unsuspended Creepymon is offered the attack, and declining keeps it", async ({
  scenario,
}) => {
  await scenario.open("arena-may-attack-suspended-creepymon");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);

  const offered: string[] = [];
  await scenario.page.getByRole("button", { name: /^End turn$/i }).click();
  await scenario.resolveUntil(
    (s) => s.turnSeat === 1 && !s.pendingDecision,
    (decision) => {
      if (decision.kind === "optional" && decision.sourceCardId) offered.push(decision.sourceCardId);
      return { accept: false };
    },
  );

  expect(offered.filter((cardId) => cardId === "EX10-009")).toHaveLength(1);
  const after = await scenario.snapshot();
  const creepymon = after.players[0]!.battleArea.find((p) => p.permanentId === CREEPYMON_ID);
  expect(creepymon?.isSuspended).toBe(false);
  expect(after.players[1]!.securityCount).toBe(4);
  await scenario.healthy();
});

import { forcedAttackSkipsSuspendedAttacker } from "../../api/src/engine/scenarios/forced-attack-skips-suspended-attacker.fixture";
import { test, expect } from "./scenario-page";

test.use({ holdBotAfterTurn: 3 });

test("Slayerdramon's forced attack does nothing when the opponent picks a suspended Digimon", async ({
  scenario,
  page,
}) => {
  test.setTimeout(120_000);
  const refs = await scenario.openFixture(forcedAttackSkipsSuspendedAttacker("lockedAttacker"));
  const lockedAttacker = refs.permanentId("lockedAttacker");
  const readyAttacker = refs.permanentId("readyAttacker");
  await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);

  await scenario.play("Mugen", "Option");
  await scenario.resolveUntil(
    (s) =>
      s.players[1]!.battleArea.find((p) => p.permanentId === lockedAttacker)!.isSuspended === true &&
      !s.pendingDecision,
    (decision) => (decision.sourceCardId === "BT7-103" ? { instanceId: lockedAttacker } : {}),
  );
  const turnBeforeOpponent = (await scenario.snapshot()).turnCount;
  const eventsBeforeOpponent = (await scenario.presentation()).events.length;

  await page.getByRole("button", { name: /^end turn$/i }).click();
  await scenario.resolveUntil(
    (s) => s.turnSeat === 0 && s.turnCount === turnBeforeOpponent + 2 && !s.pendingDecision,
    (decision) => (decision.sourceCardId === "EX3-024" ? { decisionBudgetMs: 10_000 } : {}),
    60_000,
  );

  const probe = await scenario.presentation();
  expect(probe.decisions.some((d) => d.sourceCardId === "EX3-024" && d.kind === "optional")).toBe(true);
  expect(probe.events.slice(eventsBeforeOpponent).filter((event) => event.kind === "attackDeclared")).toEqual([]);
  const final = await scenario.snapshot();
  const opponentField = final.players[1]!.battleArea;
  expect(opponentField.find((p) => p.permanentId === lockedAttacker)!.isSuspended).toBe(true);
  expect(opponentField.find((p) => p.permanentId === readyAttacker)!.isSuspended).toBe(false);
  expect(final.players[0]!.securityCount).toBe(3);
  await scenario.healthy();
});

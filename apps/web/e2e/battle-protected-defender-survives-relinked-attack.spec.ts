import fixture from "../../api/src/engine/scenarios/battle-protected-defender-survives-relinked-attack.fixture";
import { test, expect, type ScenarioPage } from "./scenario-page";

async function relinkedAttackAgainstProtectedDefender(scenario: ScenarioPage, { phone }: { phone: boolean }) {
  const refs = await scenario.openFixture(fixture);
  const page = scenario.page;
  const rebootmonId = refs.permanentId("rebootmon");
  const defenderId = refs.permanentId("protectedDefender");
  await expect.poll(async () => (await scenario.snapshot()).turnSeat, { timeout: 60_000 }).toBe(0);
  await page.getByRole("button", { name: /^end breeding$/i }).click();
  await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const defenderBefore = before.players[1]!.battleArea.find((p) => p.permanentId === defenderId)!;
  expect(defenderBefore.topCard.cardId).toBe("AD1-011");
  expect(defenderBefore.isSuspended).toBe(true);

  await page.locator(`[data-drop="perm-you"][data-id="${rebootmonId}"]`).click();
  await page.getByRole("button", { name: "Attack", exact: true }).click();
  await page.locator(`[data-drop="perm-opp"][data-id="${defenderId}"]`).click();

  await scenario.resolveUntil(
    (s) => s.pendingDecision?.kind === "chooseTargets",
    (decision) => (decision.kind === "selectCards" ? { instanceId: refs.instanceId("appmonLink") } : { accept: true }),
  );
  const unsuspendPrompt = page.locator("[data-prompt-surface]").filter({ hasText: "may unsuspend" });
  await expect(unsuspendPrompt).toBeVisible();
  if (phone) await unsuspendPrompt.getByRole("button", { name: "Select on board", exact: true }).click();
  await page.locator(`[data-drop="perm-you"][data-id="${rebootmonId}"][role="button"]`).click();
  if (phone) await page.getByRole("button", { name: "Return to decision", exact: true }).click();
  const confirm = page.getByRole("button", { name: "Confirm targets", exact: true });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await scenario.resolveUntil((s) => !s.pendingDecision && !s.combatWindow);
  await expect
    .poll(async () =>
      (await scenario.presentation()).events.some(
        (event) => event.kind === "attackEnded" && event.attackerPermanentId === rebootmonId,
      ),
    )
    .toBe(true);

  const events = (await scenario.presentation()).events;
  expect(events).toContainEqual(
    expect.objectContaining({
      kind: "battleCompared",
      attackerPermanentId: rebootmonId,
      defenderPermanentId: defenderId,
      loserPermanentIds: [],
    }),
  );
  expect(events).toContainEqual(
    expect.objectContaining({ kind: "combatResolved", attackerPermanentId: rebootmonId, deletedPermanentIds: [] }),
  );
  const after = await scenario.snapshot();
  const rebootmon = after.players[0]!.battleArea.find((p) => p.permanentId === rebootmonId)!;
  expect(rebootmon.isSuspended).toBe(false);
  expect(rebootmon.linked.map((card) => card.instanceId)).toEqual([refs.instanceId("appmonLink")]);
  expect(after.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([defenderId]);
  expect(after.players[1]!.securityCount).toBe(5);
  await scenario.healthy();
}

test("Rebootmon battles a battle-protected Paildramon after linking and unsuspending", async ({ scenario }) => {
  await relinkedAttackAgainstProtectedDefender(scenario, { phone: false });
});

test.describe("at phone width", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("Rebootmon battles a battle-protected Paildramon after linking and unsuspending", async ({ scenario }) => {
    await relinkedAttackAgainstProtectedDefender(scenario, { phone: true });
  });
});

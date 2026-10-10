import { test, expect } from "./scenario-page";

const MOTHER_ID = "dev-perm-0-feedback9-mother";
const AKEMI_ID = "dev-perm-0-feedback9-akemi";

test("feedback #9: Akemi's [Main] gives the battle-area Mother Eater Rush, Alliance and Scapegoat", async ({
  scenario,
}) => {
  await scenario.open("arena-feedback9-akemi-inherited-mother-eater", "normal", "none");
  await scenario.resolveUntil(
    (s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision,
    // The breeding Mother Eater's Start of Main prompt waits for the four opening phase
    // banners (Unsuspend, Draw, Breeding, Main: about 6.4 s) before it can show.
    (d) => (d.sourceCardId === "BT22-007" ? { accept: false, decisionBudgetMs: 8_000 } : { accept: false }),
  );
  const page = scenario.page;
  const mother = page.locator(`[data-drop="perm-you"][data-id="${MOTHER_ID}"]`);
  await expect(mother.getByLabel(/Active keywords:/)).toHaveCount(0);

  await page.locator(`[data-drop="perm-you"][data-id="${AKEMI_ID}"]`).click();
  await page.getByRole("button", { name: /^Activate effect: \[Main\]/ }).click();
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      s.players[0]!.battleArea.find((p) => p.permanentId === MOTHER_ID)?.stack.some((c) => c.cardId === "BT22-095") ===
        true,
  );

  for (const keyword of ["Rush", "Alliance", "Scapegoat"])
    await expect(mother.getByLabel(new RegExp(`Active keywords:.*${keyword}`))).toBeVisible();

  const before = await scenario.snapshot();
  await scenario.attack(MOTHER_ID);
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      !s.combatWindow &&
      s.players[0]!.battleArea.find((p) => p.permanentId === MOTHER_ID)?.isSuspended === true &&
      s.players[1]!.securityCount < before.players[1]!.securityCount,
  );
  await scenario.healthy();
});

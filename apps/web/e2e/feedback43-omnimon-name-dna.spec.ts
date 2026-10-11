import { test, expect } from "./scenario-page";

test("Feedback #43: AD1 Omnimon DNA accepts BlitzGreymon and CresGarurumon by substring names", async ({
  scenario,
  page,
}) => {
  await scenario.open("arena-feedback43-omnimon-name-dna");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const grey = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "AD1-009")!;
  const garuru = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "AD1-012")!;
  const low = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT1-036")!;
  await scenario.hand("Omnimon");
  await page.getByRole("button", { name: "Digivolve", exact: true }).click();
  // AD1 Omnimon also has ordinary evolution routes: touching a legal host opens both choices.
  await page.locator(`[data-id="${garuru.permanentId}"][role="button"]`).click();
  const dnaPrompt = page.getByRole("region", { name: /DNA Digivolution available/i });
  await expect(dnaPrompt).toBeVisible();
  for (const material of [garuru, grey]) {
    const card = page.locator(`[data-id="${material.permanentId}"][role="button"]`);
    // The Digivolve control may preselect a unique route; preserve any existing legal picks.
    if (!(await card.locator(".game-permanent__material-order").count())) {
      await card.focus();
      await card.press("Enter");
    }
  }
  await dnaPrompt.getByRole("button", { name: "DNA Digivolve", exact: true }).click();
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.instanceId === "feedback43-omnimon") && !s.pendingDecision,
    () => ({ accept: false }),
  );
  const final = await scenario.snapshot();
  const result = final.players[0]!.battleArea.find((p) => p.topCard.instanceId === "feedback43-omnimon")!;
  expect(result.stack.map((c) => c.instanceId)).toEqual([
    ...garuru.stack.map((c) => c.instanceId),
    garuru.topCard.instanceId,
    ...grey.stack.map((c) => c.instanceId),
    grey.topCard.instanceId,
  ]);
  expect(result.stack.map((c) => c.cardId)).toEqual([
    "AD1-010",
    "EX9-019",
    "AD1-012",
    "ST21-01",
    "ST20-10",
    "AD1-001",
    "EX9-012",
    "AD1-009",
  ]);
  expect(final.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["AD1-025", "BT1-036", "BT2-020"]);
  expect(final.players[0]!.battleArea.some((p) => p.permanentId === low.permanentId)).toBe(true);
  expect(result.isSuspended).toBe(false);
  expect(result.currentDP).toBe(19000);
  expect(final.memory).toBe(2);
  expect(final.turnSeat).toBe(0);
  expect(final.players[0]!.hand.map((c) => c.instanceId)).toEqual([
    "github-effects-deck-0-0",
    "github-effects-deck-0-1",
  ]);
  expect(final.players[0]!.trash).toHaveLength(0);
  await scenario.healthy();
});

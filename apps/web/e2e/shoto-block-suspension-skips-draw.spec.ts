import fixture from "@api-fixtures/shoto-block-suspension-skips-draw.fixture";
import { test, expect } from "@e2e/scenario-page";

test("Shoto's block prompt grants the Bird DP bonus without an effect draw", async ({ scenario, page }) => {
  const refs = await scenario.openFixture(fixture);
  await scenario.resolveUntil(
    (state) => state.combatWindow?.kind === "block",
    () => ({ accept: false }),
  );
  await expect(page.getByRole("region", { name: "Block window", exact: true })).toBeVisible();
  await page.locator(`[data-id="${refs.permanentId("birdBlocker")}"][role="button"]`).click();
  const confirmation = page.getByRole("dialog", { name: "Confirm block", exact: true });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Block", exact: true }).click();
  await scenario.resolveUntil(
    (state) => state.turnSeat === 0 && state.phase === "Main" && !state.pendingDecision,
    (decision) => {
      if (decision.kind === "chooseTargets") return { instanceId: refs.permanentId("birdBlocker") };
      return { accept: true };
    },
  );

  const probe = await scenario.presentation();
  const blocked = probe.events.findIndex((event) => event.kind === "blocked");
  const attackEnded = probe.events.findIndex((event, index) => index > blocked && event.kind === "attackEnded");
  expect(blocked).toBeGreaterThan(-1);
  expect(attackEnded).toBeGreaterThan(blocked);
  const blockEvents = probe.events.slice(blocked, attackEnded);
  expect(blockEvents).toContainEqual(expect.objectContaining({ kind: "effectResolved", sourceCardId: "EX11-062" }));
  expect(
    blockEvents.filter((event) => event.kind === "cardsMoved" && event.seat === 0 && event.handAddition === "draw"),
  ).toEqual([]);
  expect(
    probe.boards.some(({ visible }) =>
      visible.players[0].battleArea.some(
        (permanent) => permanent.permanentId === refs.permanentId("birdBlocker") && permanent.currentDP === 7000,
      ),
    ),
  ).toBe(true);
  expect((await scenario.snapshot()).players[0]!.securityCount).toBe(5);
  await scenario.healthy();
});

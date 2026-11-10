import fixture from "../../api/src/engine/scenarios/borrowed-on-deletion-alliance-attack.fixture";
import { test, expect } from "./scenario-page";

test("Alliance window inspects ineligible cards and offers a magnifier on eligible allies", async ({
  scenario,
  page,
}) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.attack(refs.permanentId("attacker"));
  await scenario.resolveUntil(
    (s) => s.combatWindow?.kind === "alliance",
    () => ({}),
  );
  await expect(page.getByRole("region", { name: "Alliance window", exact: true })).toBeVisible();

  const ally = page.locator(`[data-drop="perm-you"][data-id="${refs.permanentId("ally")}"]`);
  await expect(ally.getByRole("button", { name: /^Read PrinceMamemon \(X Antibody\)/ })).toBeVisible();

  await page.locator(`[data-drop="perm-you"][data-id="${refs.permanentId("tamer")}"]`).click();
  await expect(page.getByRole("dialog", { name: "Izzy Izumi", exact: true })).toBeVisible();
  await expect(page.locator(".card-zoom")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Izzy Izumi", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Alliance window", exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^Pass$/i }).click();
  await scenario.resolveUntil(
    (s) => s.combatWindow?.kind !== "alliance" || !s.pendingDecision,
    () => ({}),
  );
});

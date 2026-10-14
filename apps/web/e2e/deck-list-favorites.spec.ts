import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  for (const theme of ["light", "dark"] as const) {
    test(`deck favorite star fits the deck row at ${viewport.width}px in ${theme} mode`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      await page.goto("/e2e/mobile-deckbuilder.html");
      await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "dark");
      const row = page.locator(".deck-list-row").first();
      const star = row.getByRole("button", { name: "Favorite deck", exact: true });
      await expect(star).toHaveAttribute("aria-pressed", "false");
      await star.click();
      await expect(star).toHaveAttribute("aria-pressed", "true");
      await expect(star).toHaveAttribute("title", "Remove from favorites");
      const warning = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--ds-warning").trim(),
      );
      const starColor = await star.evaluate((element) => getComputedStyle(element).color);
      const warningColor = await page.evaluate((color) => {
        const probe = document.createElement("span");
        probe.style.color = color;
        document.body.append(probe);
        const resolved = getComputedStyle(probe).color;
        probe.remove();
        return resolved;
      }, warning);
      expect(starColor).toBe(warningColor);
      const starBounds = await star.boundingBox();
      const rowBounds = await row.boundingBox();
      const nameBounds = await row.getByRole("heading", { level: 3 }).boundingBox();
      expect(starBounds!.x).toBeGreaterThanOrEqual(rowBounds!.x);
      expect(starBounds!.x + starBounds!.width).toBeLessThanOrEqual(nameBounds!.x);
      expect(Math.abs(starBounds!.y + starBounds!.height / 2 - (nameBounds!.y + nameBounds!.height / 2))).toBeLessThan(
        4,
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({ path: test.info().outputPath(`deck-favorite-${viewport.width}-${theme}.png`) });
      await star.click();
      await expect(star).toHaveAttribute("aria-pressed", "false");
    });
  }
}

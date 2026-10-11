import { expect, test } from "@playwright/test";
import { startBrowserServer } from "./server";

let server: Awaited<ReturnType<typeof startBrowserServer>>;

test.beforeAll(async () => {
  server = await startBrowserServer({ holdBotAllTurns: false });
});

test.afterAll(async () => {
  await server?.close();
});

for (const width of [320, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`Rina keeps her identity from selected deck to game at ${width}px in ${colorScheme}`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme });
      await page.goto("/play");
      await page.getByRole("button", { name: /Practice vs AI/i }).click();
      await expect(page.locator(".lobby-bot-preview")).toContainText("Aegis");
      await page.getByText("Advanced settings", { exact: true }).click();
      const deckSelect = page.getByRole("combobox", { name: "Bot's deck", exact: true });
      const choices = await deckSelect
        .locator("option")
        .evaluateAll((options) =>
          options
            .filter(
              (option) => /UlforceVeedramon/.test(option.textContent ?? "") && !(option as HTMLOptionElement).disabled,
            )
            .map((option) => (option as HTMLOptionElement).value),
        );
      expect(choices.length).toBeGreaterThan(0);
      await deckSelect.selectOption(choices[0]!);
      await expect(page.locator(".lobby-bot-preview")).toContainText("Rina Shinomiya");
      await expect(page.locator(".lobby-bot-preview")).toContainText("UlforceVeedramon");
      await expect(page.locator(".lobby-bot-preview .bot-identity-badge")).toHaveText("Bot");
      await expect(page.locator(".lobby-bot-preview img")).toHaveAttribute("src", /BT11-112/);
      await page.getByText("Advanced settings", { exact: true }).click();
      await expect(page.locator(".lobby-bot-preview")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath("rina-lobby.png"), fullPage: true });
      await page.getByRole("button", { name: "Play vs Bot", exact: true }).click();
      await expect(page).toHaveURL(/\/game(?:\?.*)?$/);
      await page.getByRole("button", { name: "Keep hand", exact: true }).click();
      const opponent = page.locator('.game-player-line[data-side="opponent"]');
      await expect(opponent.getByRole("button", { name: "Rina Shinomiya", exact: true })).toBeVisible();
      await expect(opponent.locator(".bot-identity-badge")).toHaveText("Bot");
      await expect(opponent.locator("img")).toHaveAttribute("src", /BT11-112/);
      await expect(opponent.locator("img")).toHaveAttribute("alt", "");
      await expect(page.getByTestId("hand")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath("rina-game.png"), fullPage: true });
      expect(errors).toEqual([]);
    });
  }
}

import { expect, test, type Page } from "@playwright/test";

type OpenParams = { page: Page; signedIn: boolean };

async function openHome({ page, signedIn }: OpenParams) {
  await page.route("http://127.0.0.1:2569/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/auth/me") {
      if (!signedIn) {
        return route.fulfill({ status: 401, json: { error: "authentication_required" } });
      }
      return route.fulfill({
        json: { id: "music-fixture", displayName: "Kai", isAdmin: false, avatarUrl: null, avatarId: null },
      });
    }
    if (path === "/account/decks") {
      return route.fulfill({ json: [] });
    }
    if (path === "/account/notifications/unread-count") {
      return route.fulfill({ json: { unread: 0 } });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto("/");
}

const headerFor = (page: Page, width: number) =>
  page.locator(width < 960 ? "header.aegis-mobile-bar" : "header.aegis-top-nav");

for (const width of [320, 390, 414, 1440]) {
  for (const signedIn of [false, true]) {
    for (const dark of [false, true]) {
      test(`the header music menu fits at ${width}px for a ${signedIn ? "signed-in player" : "guest"} in ${dark ? "dark" : "light"} mode`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 900 });
        await openHome({ page, signedIn });
        await page.evaluate((darkMode) => document.documentElement.classList.toggle("dark", darkMode), dark);
        const header = headerFor(page, width);
        const button = header.getByRole("button", { name: "Change music" });
        await expect(button).toBeVisible();

        const overflow = await header.evaluate((element) => ({
          header: element.scrollWidth - element.clientWidth,
          page: document.documentElement.scrollWidth - innerWidth,
          rightmost: Math.max(
            ...Array.from(element.querySelectorAll("button")).map((child) => child.getBoundingClientRect().right),
          ),
        }));
        expect(overflow.header).toBeLessThanOrEqual(0);
        expect(overflow.page).toBeLessThanOrEqual(1);
        expect(overflow.rightmost).toBeLessThanOrEqual(width);

        await button.click();
        const dialog = page.getByRole("dialog", { name: "Soundtrack" });
        await expect(dialog).toBeVisible();
        const box = (await dialog.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        await page.screenshot({ path: info.outputPath("music-menu.png") });

        await dialog.getByRole("radio", { name: "Electric" }).check();
        expect(await page.evaluate(() => localStorage.getItem("aegis.music.track"))).toBe("digitalAscent");
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(button).toBeFocused();
      });
    }
  }
}

test("the music menu opens the sound settings", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openHome({ page, signedIn: false });
  await headerFor(page, 390).getByRole("button", { name: "Change music" }).click();
  await page.getByRole("dialog", { name: "Soundtrack" }).getByRole("radio", { name: "Cipher" }).check();
  await page.getByRole("button", { name: "Sound & music" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  const section = page.getByRole("region", { name: "Sound & music" });
  await expect(section).toBeFocused();
  await expect(section.getByRole("button", { name: "Cipher", exact: true })).toHaveAttribute("aria-pressed", "true");
});

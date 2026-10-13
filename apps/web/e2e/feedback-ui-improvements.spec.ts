import fixtureDrasilTurnHandoff from "../../api/src/engine/scenarios/drasil-turn-handoff.fixture";
import { getCardDefinition } from "@aegis/shared";
import { test, expect } from "./scenario-page";

const GALLANTMON = getCardDefinition("AD1-008")!.nameEn;

declare global {
  interface Window {
    toolbarSamples?: { lefts: number[]; skippable: boolean }[];
  }
}

// In-game feedback from 2026-10-10, issues #53, #54 and #55. The scenario opens on the bot's
// turn: its Gallantmon attacks, so the board animates and changes phase while the viewer reads.
test("the toolbar holds still, the opponent's card stays open, and the feedback draft survives", async ({
  scenario,
}) => {
  test.setTimeout(120_000);
  const { page } = scenario;
  await page.route("**/assets/card-images/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP4/x8AAwAB//wl3FEAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await scenario.openFixture(fixtureDrasilTurnHandoff, "normal", "none");

  await test.step("#53: no toolbar button moves while animations come and go", async () => {
    await expect(page.getByRole("button", { name: "Send feedback", exact: true })).toBeVisible();
    await page.evaluate(() => {
      const samples: NonNullable<Window["toolbarSamples"]> = [];
      window.toolbarSamples = samples;
      const sample = () => {
        const buttons = Array.from(document.querySelectorAll<HTMLElement>(".game-topbar-actions > button"));
        const skip = document.querySelector('[data-testid="skip-presentation"]');
        samples.push({
          lefts: buttons.map((button) => Math.round(button.getBoundingClientRect().left)),
          skippable: skip?.getAttribute("data-skippable") === "true",
        });
        if (samples.length < 20_000) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
  });

  await test.step("#55: the opponent's card stays open through their phases", async () => {
    const opening = await scenario.snapshot();
    expect(opening.turnSeat).toBe(1);
    const gallantmon = opening.players[1]!.battleArea.find((p) => p.topCard.cardId === "AD1-008")!;
    await page.locator(`[data-drop="perm-opp"][data-id="${gallantmon.permanentId}"]`).click();
    const cardWindow = page.getByRole("dialog", { name: GALLANTMON, exact: true });
    await expect(cardWindow).toBeVisible();
    const openedIn = (await scenario.snapshot()).phase;
    await expect
      .poll(async () => {
        const state = await scenario.snapshot();
        return state.turnSeat === 1 && state.phase !== openedIn;
      })
      .toBe(true);
    await expect(cardWindow).toBeVisible();
    await expect.poll(async () => (await scenario.snapshot()).turnSeat, { timeout: 60_000 }).toBe(0);
    await cardWindow.getByRole("button", { name: "Close", exact: true }).click();
    await expect(cardWindow).toHaveCount(0);
  });

  await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);
  await scenario.idle();

  await test.step("#53: the skip button showed without shifting its neighbours", async () => {
    const samples = await page.evaluate(() => window.toolbarSamples!);
    expect(samples.some((sample) => sample.skippable)).toBe(true);
    expect(samples.some((sample) => !sample.skippable)).toBe(true);
    const layouts = new Set(samples.map((sample) => sample.lefts.join()));
    expect([...layouts]).toHaveLength(1);
    await expect(page.getByTestId("skip-presentation")).toHaveAttribute("data-skippable", "false");
  });

  await test.step("the feedback button sits with settings and leave, and explains itself", async () => {
    const buttons = page.locator(".game-topbar-actions > button:not([aria-hidden='true'])");
    const names = await buttons.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
    expect(names.slice(-3)).toEqual(["Send feedback", "Match settings", "Surrender"]);
    await page.getByRole("button", { name: "Send feedback", exact: true }).hover();
    await expect(page.getByRole("tooltip")).toHaveText("Send feedback");
    await page.mouse.move(8, 8);
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  });

  await test.step("#54: the form asks two questions, and only Cancel closes a started report", async () => {
    // The browser test server has no account API; the dialog only asks it where reports go.
    await page.route("**/bug-reports/limits", (route) =>
      route.fulfill({ json: { enabled: true, publicMirror: false } }),
    );
    await page.getByRole("button", { name: "Send feedback", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Send feedback" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("radio")).toHaveCount(2);
    await expect(dialog.getByLabel("Title")).toBeVisible();
    await expect(dialog.getByLabel("Cards involved")).toHaveCount(0);
    await expect(dialog.getByLabel("Opponent's deck")).toHaveCount(0);
    await expect(dialog.getByText(/Match ID/)).toHaveCount(0);
    const description = dialog.getByLabel("What happened?");
    await description.fill("The window closed on me");
    await page.mouse.click(8, 500);
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(description).toHaveValue("The window closed on me");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });

  await scenario.healthy();
});

// Issue #56: the advanced queue settings must read as a control at any width and theme.
for (const width of [390, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`#56: the advanced settings toggle is labelled and opens at ${width}px, ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/e2e/lobby-formats.html");
      await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "dark");
      const toggle = page.locator(".lobby-advanced > summary");
      await expect(toggle).toBeVisible();
      await expect(toggle).toContainText("Advanced settings");
      await expect(toggle).toContainText("Card pool, rules, best-of, timer and more");
      const border = await toggle.evaluate((element) => getComputedStyle(element).borderTopWidth);
      expect(border).not.toBe("0px");
      const pool = page.getByRole("combobox", { name: "Cards through", exact: true });
      await expect(pool).not.toBeVisible();
      await toggle.click();
      await expect(pool).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }
}

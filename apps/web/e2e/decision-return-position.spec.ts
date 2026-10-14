import { expect, test, type Page } from "@playwright/test";

const boardRailEntryPoints = [
  { specimen: "decision-optional-rail", button: "View board" },
  { specimen: "decision-field-budget", button: "Select on board" },
];

async function openBoardFromRail(page: Page, specimen: string, button: string) {
  await page.goto(`/dev/mobile?specimen=${specimen}&frame=1&locale=en`);
  const viewBoard = page.locator("[data-prompt-surface]").getByRole("button", { name: button, exact: true });
  await expect(viewBoard).toBeInViewport({ ratio: 1 });
  const pressed = (await viewBoard.boundingBox())!;
  await viewBoard.click();
  const returnButton = page.getByRole("button", { name: "Return to decision", exact: true });
  await expect(returnButton).toBeInViewport({ ratio: 1 });
  const control = page.locator(".decision-board-return");
  return { pressed, control: (await control.boundingBox())! };
}

for (const { specimen, button } of boardRailEntryPoints) {
  test(`${specimen}: Return to decision opens where ${button} was pressed on wide screens`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { pressed, control } = await openBoardFromRail(page, specimen, button);

    const pressedCentre = { x: pressed.x + pressed.width / 2, y: pressed.y + pressed.height / 2 };
    const controlCentre = { x: control.x + control.width / 2, y: control.y + control.height / 2 };
    expect(Math.abs(controlCentre.x - pressedCentre.x)).toBeLessThanOrEqual(control.width / 2);
    expect(Math.abs(controlCentre.y - pressedCentre.y)).toBeLessThanOrEqual(control.height / 2);
  });

  test(`${specimen}: Return to decision keeps the full-width strip on phones`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { control } = await openBoardFromRail(page, specimen, button);

    expect(control.x).toBeCloseTo(8, 0);
    expect(control.width).toBeCloseTo(390 - 16, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
}

import { test, expect } from "@playwright/test";
import { ReplayRecordingPage } from "./replay-recording-page";

for (const theme of ["light", "dark"]) {
  test(`native device recorder flow preserves playback and fits the viewport in ${theme} mode`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // Mobile browser engines on a desktop can expose APIs absent on physical phones.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", { value: { getDisplayMedia: undefined } });
    });
    const replay = new ReplayRecordingPage(page);
    await replay.open();
    await page.evaluate((value) => {
      document.documentElement.classList.toggle("dark", value === "dark");
    }, theme);
    await page.getByLabel("Playback options", { exact: true }).click();
    await page.getByLabel("Playback speed").selectOption("4");
    await page.getByLabel("Playback options", { exact: true }).click();
    await page.getByRole("button", { name: "Record replay video", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Record replay video", exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/This browser cannot record the screen/)).toBeVisible();
    await expect(dialog.getByText(/iPhone \/ iPad:/)).toBeVisible();
    await expect(dialog.getByText(/Android:/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Choose screen and record" })).toHaveCount(0);
    const bounds = await dialog.boundingBox();
    const viewport = page.viewportSize()!;
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/native-replay-${test.info().project.name}-${theme}.png` });
    await dialog.getByRole("button", { name: "Start replay for device recording" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "End recording mode" })).toBeVisible();
    await expect(page.getByRole("slider", { name: "Replay position" })).toBeHidden();
    await expect(page.getByRole("heading", { name: "Agumon Player vs Gabumon Player" })).toBeHidden();
    await expect(page.getByRole("dialog", { name: "Stop your device recorder" })).toBeVisible();
    await replay.drained();
    await expect(page.getByRole("link", { name: "Download video" })).toHaveCount(0);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByText("Replay finished", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("native recording mode can be stopped manually and normal controls return", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", { value: { getDisplayMedia: undefined } });
  });
  await new ReplayRecordingPage(page).open();
  await page.getByRole("button", { name: "Record replay video", exact: true }).click();
  await page.getByRole("button", { name: "Start replay for device recording" }).click();
  await page.getByRole("button", { name: "End recording mode" }).click();
  await expect(page.getByRole("dialog", { name: "Stop your device recorder" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Replay position" })).toBeVisible();
  await expect(page.locator(".replay-controls").getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

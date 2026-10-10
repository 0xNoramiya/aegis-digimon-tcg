import type { Page } from "@playwright/test";
import { expect, test } from "./scenario-page";

const SCENARIO = "arena-feedback3-kakkinmon-craniamon";
const CRANIAMON = "dev-perm-0-feedback3-craniamon";

declare global {
  interface Window {
    craniamonFrames?: { at: number; state: string | null }[];
  }
}

/** Records every change of Craniamon's rendered suspend state, one sample per painted frame. */
async function recordCraniamon(page: Page) {
  await page.evaluate((permanentId) => {
    const frames: { at: number; state: string | null }[] = [];
    window.craniamonFrames = frames;
    const sample = () => {
      const card = document.querySelector(`[data-drop="perm-you"][data-id="${permanentId}"] [data-state]`);
      const state = card?.getAttribute("data-state") ?? null;
      if (frames.at(-1)?.state !== state) frames.push({ at: performance.now(), state });
      if (window.craniamonFrames === frames) requestAnimationFrame(sample);
    };
    sample();
  }, CRANIAMON);
}

/** End the turn, pay Kakkinmon's cost with Craniamon, and return the frames up to the opponent's Main. */
async function suspendCraniamonForKakkinmon(page: Page) {
  await page.getByRole("button", { name: /^end breeding$/i }).click();
  const endTurn = page.getByRole("button", { name: /^end turn$/i });
  await expect(endTurn).toBeEnabled();
  await recordCraniamon(page);
  await endTurn.click();
  await page.getByRole("button", { name: "Yes, activate", exact: true }).click();
  const confirm = page.getByRole("button", { name: /^confirm targets$/i });
  await expect(confirm).toBeVisible();
  await page.locator(`[data-drop="perm-you"][data-id="${CRANIAMON}"]`).click();
  await confirm.click();
  // Reboot stands Craniamon up during the opponent's Unsuspend ribbon; Breeding follows it.
  const currentPhase = page.getByTestId("turn-phases").locator('[aria-current="step"]');
  await expect(currentPhase).toHaveText(/^active$/i, { timeout: 20_000 });
  await expect(currentPhase).toHaveText(/^(breeding|main)$/i, { timeout: 20_000 });
  return page.evaluate(() => window.craniamonFrames ?? []);
}

/**
 * Craniamon must stay sideways long enough to be seen, then stand up again. A first frame of
 * the live board can flash before the burst is queued; only a held interval counts.
 */
function expectSuspendShownBeforeReboot(frames: { at: number; state: string | null }[]) {
  const shownMs = frames.map((frame, index) =>
    frame.state === "suspended" && frames[index + 1]?.state === "active" ? frames[index + 1]!.at - frame.at : 0,
  );
  expect(Math.max(0, ...shownMs), JSON.stringify(frames)).toBeGreaterThanOrEqual(300);
  expect(frames.at(-1)?.state, JSON.stringify(frames)).toBe("active");
}

test("Feedback #3: Craniamon turns sideways for Kakkinmon before Reboot stands it up", async ({ scenario }) => {
  const { page } = scenario;
  await page.addInitScript(() => {
    localStorage.setItem("aegis:locale", "en");
    localStorage.setItem("aegis.skip-end-turn-confirmation", "true");
  });
  await page.goto(`/dev/arena?scenario=${SCENARIO}`);
  expectSuspendShownBeforeReboot(await suspendCraniamonForKakkinmon(page));

  // The report reproduced on the next match in the same page: its Reboot move reached the
  // client after the Unsuspend hold opened, and released Craniamon before it was shown.
  await page.getByRole("button", { name: /^reset combat$/i }).click();
  expectSuspendShownBeforeReboot(await suspendCraniamonForKakkinmon(page));
  expect(scenario.errors).toEqual([]);
});

import fixtureChronomonEngageOrder from "../../api/src/engine/scenarios/chronomon-engage-order.fixture";
import { test as base, expect } from "@playwright/test";
import { RED_DECK, BLUE_DECK } from "../../api/dist/engine/testDecks.js";
import { joinHeadlessOpponent } from "../test/scenarioHarness/headlessOpponent";
import { startBrowserServer } from "./server";
import { test as scenarioTest } from "./scenario-page";

base("the mulligan runs its own 30 s window and keeps the hand when it runs out", async ({ page }) => {
  base.setTimeout(120_000);
  const server = await startBrowserServer();
  const opponent = { current: undefined as Awaited<ReturnType<typeof joinHeadlessOpponent>> | undefined };
  try {
    await page.addInitScript(
      (options) => {
        localStorage.setItem("aegis:locale", "en");
        window.browserTestOptions = options;
      },
      { displayName: "Timed Protagonist", deck: RED_DECK, seed: 2, matchTimer: true },
    );
    await page.goto("/e2e/harness.html");
    await expect(page.getByText(/finding an opponent/i)).toBeVisible();
    opponent.current = await joinHeadlessOpponent(server.directEndpoint, {
      displayName: "Timed Opponent",
      deck: BLUE_DECK,
      matchTimer: true,
    });
    opponent.current.room.onMessage("event", () => {});
    opponent.current.onDecision((request) => {
      if (request.kind === "mulligan") opponent.current!.mulligan(true);
    });
    opponent.current.ready();

    const keep = page.getByRole("button", { name: /keep hand/i });
    await expect(keep).toBeVisible({ timeout: 20_000 });
    const opening = await page.evaluate(() => window.browserTestSnapshot());
    expect(opening.matchTimer).toBe(true);
    const seat = opening.pendingDecision!.seat as 0 | 1;
    const hand = opening.players[seat]!.hand.map((card) => card.instanceId);
    const mulliganClock = page
      .locator('[data-testid="viewer-match-timer"][data-clock="mulligan"]')
      .filter({ visible: true })
      .first();
    await expect(mulliganClock).toBeVisible();
    await expect(mulliganClock).toContainText("Mulligan");
    const seconds = async () => Number(await mulliganClock.locator("strong").textContent());
    expect(await seconds()).toBeLessThanOrEqual(30);
    await expect.poll(seconds, { timeout: 20_000 }).toBeLessThan(28);
    const during = await page.evaluate(() => window.browserTestSnapshot());
    expect(seat === 0 ? during.timerRemaining0 : during.timerRemaining1).toBe(720);

    // Nobody answers: the server keeps the hand when the window runs out.
    await expect(keep).toBeHidden({ timeout: 40_000 });
    const after = await page.evaluate(() => window.browserTestSnapshot());
    expect(after.gameOver).toBe(false);
    expect(after.pendingDecision?.kind === "mulligan" && after.pendingDecision.seat === seat).toBe(false);
    expect(seat === 0 ? after.mulliganTimerRemaining0 : after.mulliganTimerRemaining1).toBe(0);
    expect(seat === 0 ? after.timerRemaining0 : after.timerRemaining1).toBeGreaterThanOrEqual(719);
    expect(after.players[seat]!.hand.map((card) => card.instanceId).slice(0, hand.length)).toEqual(hand);
  } finally {
    await page.close();
    if (opponent.current) await opponent.current.leave();
    await server.close();
  }
});

scenarioTest("an idle Main phase shows the rope, then ends the turn with a timeout", async ({ scenario, page }) => {
  scenarioTest.setTimeout(150_000);
  await scenario.openFixture(fixtureChronomonEngageOrder);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const opening = await scenario.snapshot();
  expect(opening.matchTimer).toBe(true);
  expect(opening.turnSeat).toBe(0);
  expect(opening.timerStrikes0).toBe(0);
  const clock = page.locator('[data-testid="viewer-match-timer"]').filter({ visible: true }).first();
  await expect(clock).toHaveAttribute("data-rope", "true", { timeout: 80_000 });
  await expect.poll(async () => (await scenario.snapshot()).timerStrikes0, { timeout: 30_000 }).toBe(1);
  await expect(clock).toContainText("1/3");
  const after = await scenario.snapshot();
  expect(after.gameOver).toBe(false);
  expect(after.turnSeat === 1 || after.phase !== "Main").toBe(true);
});

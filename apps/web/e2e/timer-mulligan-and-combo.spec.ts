import fixtureChronomonEngageOrder from "../../api/src/engine/scenarios/chronomon-engage-order.fixture";
import { fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test as base, expect } from "@playwright/test";
import { RED_DECK, BLUE_DECK } from "../../api/dist/engine/testDecks.js";
import { joinHeadlessOpponent } from "../test/scenarioHarness/headlessOpponent";
import { startBrowserServer } from "./server";
import { test as scenarioTest } from "./scenario-page";

// Discord suggestion "Timer improvement" (thread 1558298610754527232): the mulligan gets its
// own 30 s window that never touches the match clock, and effect decisions add combo time.

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
    expect(seat === 0 ? during.timerRemaining0 : during.timerRemaining1).toBe(300);

    // Nobody answers: the server keeps the hand when the window runs out.
    await expect(keep).toBeHidden({ timeout: 40_000 });
    const after = await page.evaluate(() => window.browserTestSnapshot());
    expect(after.gameOver).toBe(false);
    expect(after.pendingDecision?.kind === "mulligan" && after.pendingDecision.seat === seat).toBe(false);
    expect(seat === 0 ? after.mulliganTimerRemaining0 : after.mulliganTimerRemaining1).toBe(0);
    expect(seat === 0 ? after.timerRemaining0 : after.timerRemaining1).toBeGreaterThanOrEqual(299);
    expect(after.players[seat]!.hand.map((card) => card.instanceId).slice(0, hand.length)).toEqual(hand);
  } finally {
    await page.close();
    if (opponent.current) await opponent.current.leave();
    await server.close();
  }
});

scenarioTest("an effect decision adds combo time to the deciding player's clock", async ({ scenario, page }) => {
  scenarioTest.setTimeout(120_000);
  await scenario.openFixture(fixtureChronomonEngageOrder);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  expect((await scenario.snapshot()).matchTimer).toBe(true);
  // Spend a few seconds first so the bonus is not hidden by the 300 s ceiling.
  await expect.poll(async () => (await scenario.snapshot()).timerRemaining0, { timeout: 20_000 }).toBeLessThan(295);
  const host = (await scenario.snapshot()).players[0]!.battleArea.find((p) => p.topCard.cardId === "BT26-013")!;
  await scenario.hand("Butenmon");
  await page.getByRole("button", { name: "Digivolve", exact: true }).click();
  await page.locator(`[data-drop="perm-you"][data-id="${host.permanentId}"]`).click();
  const cheapest = page.locator(".evo-cost-prompt__option[data-recommended]");
  await expect(cheapest).toBeVisible();
  // Read just before the click that sends the play, so almost no main-phase time follows.
  const before = (await scenario.snapshot()).timerRemaining0;
  await cheapest.click();
  let atFirstDecision: number | undefined;
  await scenario.resolveUntil(
    (s) => s.turnSeat === 1 && !s.pendingDecision,
    async (d) => {
      if (atFirstDecision === undefined) {
        atFirstDecision = (await scenario.snapshot()).timerRemaining0;
      }
      if (d.kind === "orderTriggers")
        return { triggerCardId: d.options.triggerCardIds?.includes("BT26-015") ? "BT26-015" : undefined };
      if (d.kind === "chooseOption") return { choice: 1 };
      if (d.options.candidateInstanceIds?.includes(fixtureInstanceId("engage-filler-0-card")))
        return { instanceId: fixtureInstanceId("engage-filler-0-card") };
      return {};
    },
  );
  expect(atFirstDecision, "the viewer was asked at least one effect decision").toBeDefined();
  expect(atFirstDecision!, "combo time raised the clock above its value before the play").toBeGreaterThan(before);
  await scenario.healthy();
});

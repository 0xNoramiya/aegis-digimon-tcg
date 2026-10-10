import { test, expect, type ScenarioPage } from "./scenario-page";

// User report (2026-10-10): the "Opponent field" effects badge painted over the
// notices and prompts docked on the right of the desktop board. The desktop board
// isolates its own stacking context, so a badge portalled outside it outranked
// every layer inside it, whatever their z-index.
const SCENARIO = "arena-multiple-field-effects";
const APOLLOMON = "BT25-018";
const FLAREMON = "BT25-017";
const SHOTS = process.env.AEGIS_E2E_SHOT_PREFIX;

async function evolveFlaremon(scenario: ScenarioPage, permanentId: string) {
  const apollomon = scenario.page
    .getByTestId("hand")
    .getByRole("button", { name: "Select Apollomon", exact: true })
    .first();
  await apollomon.focus();
  await apollomon.press("Enter");
  await scenario.page.getByRole("button", { name: "Digivolve", exact: true }).click();
  await scenario.page.locator(`[data-drop="perm-you"][data-id="${permanentId}"]`).click();
  await scenario.page.locator(".evo-cost-prompt__option").first().click();
}

function evolved(permanentId: string) {
  return (state: Awaited<ReturnType<ScenarioPage["snapshot"]>>) =>
    state.players[0]!.battleArea.find((permanent) => permanent.permanentId === permanentId)?.topCard.cardId ===
    APOLLOMON;
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
]) {
  test(`right-side notices and their controls stay above the opponent field badge at ${viewport.width}x${viewport.height}`, async ({
    scenario,
    page,
  }) => {
    await page.setViewportSize(viewport);
    await scenario.open(SCENARIO);
    const flaremons = (await scenario.snapshot()).players[0]!.battleArea.filter(
      (permanent) => permanent.topCard.cardId === FLAREMON,
    );
    expect(flaremons).toHaveLength(2);

    await evolveFlaremon(scenario, flaremons[0]!.permanentId);
    await scenario.resolveUntil(
      (state) => evolved(flaremons[0]!.permanentId)(state) && !state.pendingDecision,
      () => ({ accept: false }),
    );
    const badge = page.locator(".game-field-effects:not(.game-field-effects--own)");
    await expect(badge.locator("summary")).toHaveAccessibleName("Opponent field: DP −4,000");

    // The second Apollomon deletes an opposing Digimon. Its notice docks in the
    // right column, across the opponent badge, while the next decision waits.
    await evolveFlaremon(scenario, flaremons[1]!.permanentId);
    const notice = page.locator(".narration-slot .side-panel").first();
    await expect(notice).toBeVisible();
    await expect(badge).toBeVisible();

    const probe = await notice.evaluate((panel) => {
      const field = document.querySelector(".game-field-effects:not(.game-field-effects--own)")!;
      const badgeRect = field.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const overlap = {
        left: Math.max(badgeRect.left, panelRect.left),
        right: Math.min(badgeRect.right, panelRect.right),
        top: Math.max(badgeRect.top, panelRect.top),
        bottom: Math.min(badgeRect.bottom, panelRect.bottom),
      };
      const points = [];
      if (overlap.right > overlap.left && overlap.bottom > overlap.top)
        points.push({
          kind: "overlap",
          x: (overlap.left + overlap.right) / 2,
          y: (overlap.top + overlap.bottom) / 2,
        });
      for (const control of panel.querySelectorAll("button, [role=button], a[href]")) {
        const bounds = control.getBoundingClientRect();
        if (bounds.width === 0 || bounds.height === 0) continue;
        points.push({
          kind: control.getAttribute("aria-label") ?? control.textContent?.trim() ?? "control",
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
        });
      }
      return points.map((point) => {
        const hit = document.elementFromPoint(point.x, point.y);
        return {
          ...point,
          noticeOwnsHit: hit !== null && panel.contains(hit),
          badgeOwnsHit: !!hit?.closest(".game-field-effects"),
        };
      });
    });

    if (SHOTS) await page.screenshot({ path: `${SHOTS}-${viewport.width}.png` });
    // Without an overlap this test would prove nothing about the layering.
    expect(probe.some((point) => point.kind === "overlap")).toBe(true);
    expect(probe.length).toBeGreaterThan(1);
    for (const point of probe) {
      expect(point.badgeOwnsHit, JSON.stringify(point)).toBe(false);
      expect(point.noticeOwnsHit, JSON.stringify(point)).toBe(true);
    }

    // The badge still covers the opposing battle row it summarises.
    const rowCover = await badge.evaluate((field) => {
      const bounds = field.querySelector("summary")!.getBoundingClientRect();
      const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      return { badge: !!hit?.closest(".game-field-effects"), notice: !!hit?.closest(".narration-slot") };
    });
    expect(rowCover.badge || rowCover.notice).toBe(true);

    await scenario.resolveUntil(
      (state) => evolved(flaremons[1]!.permanentId)(state) && !state.pendingDecision,
      () => ({ accept: false }),
    );
    await expect(badge.locator("summary")).toHaveAccessibleName("Opponent field: 2 active effects");
    const summaryHit = await badge.evaluate((field) => {
      const bounds = field.querySelector("summary")!.getBoundingClientRect();
      const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      return { badge: !!hit?.closest(".game-field-effects"), at: hit?.className };
    });
    if (!(await page.locator(".narration-slot .side-panel").count())) expect(summaryHit.badge).toBe(true);
    await scenario.healthy();
  });
}

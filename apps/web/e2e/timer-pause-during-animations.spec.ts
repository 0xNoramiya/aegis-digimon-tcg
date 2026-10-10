import { test, expect } from "./scenario-page";

const SCENARIO = "arena-feedback28-security-reveal-before-prompt";
const DECOY_PROMPT = "delete this Digimon to prevent the other Digimon's deletion?";

interface ClockSample {
  value: number;
  active: boolean;
}

declare global {
  interface Window {
    clockSeen?: { duringReveal: ClockSample[]; atPrompt?: ClockSample };
  }
}

// Product change: a match timer no longer fast-forwards animations. Instead the deciding
// player's clock holds while their client plays the events before the question, and starts
// once the prompt is on screen.
test.describe("Match timer: the clock pauses for the animations, not the other way round", () => {
  test("the clock holds through the security reveal at Slow speed and runs once the prompt opens", async ({
    scenario,
  }) => {
    const { page } = scenario;
    await page.addInitScript((promptText) => {
      const seen: NonNullable<Window["clockSeen"]> = { duringReveal: [] };
      window.clockSeen = seen;
      const sample = (): ClockSample | undefined => {
        const timer = document.querySelector('[data-testid="viewer-match-timer"]');
        if (!timer) return;
        return { value: Number(timer.querySelector("strong")?.textContent), active: timer.hasAttribute("data-active") };
      };
      new MutationObserver(() => {
        if (seen.atPrompt) return;
        const now = sample();
        if (!now) return;
        if (document.body?.innerText.includes(promptText)) seen.atPrompt = now;
        else if (document.querySelector('[data-testid="security-clash"]')) seen.duringReveal.push(now);
      }).observe(document, { childList: true, subtree: true, characterData: true, attributes: true });
    }, DECOY_PROMPT);
    await scenario.open(SCENARIO, "slow");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    expect((await scenario.snapshot()).matchTimer).toBe(true);
    const sinduramon = (await scenario.snapshot()).players[0]!.battleArea.find(
      (permanent) => permanent.topCard.cardId === "EX5-050",
    )!;
    await scenario.attack(sinduramon.permanentId);

    await expect(page.getByText(DECOY_PROMPT)).toBeVisible({ timeout: 15_000 });
    const seen = await page.evaluate(() => window.clockSeen!);
    expect(seen.duringReveal.length, "the reveal was on screen").toBeGreaterThan(0);
    expect(
      seen.duringReveal.filter((sample) => sample.active),
      "the clock ran during the reveal",
    ).toEqual([]);
    const held = seen.duringReveal[0]!.value;
    expect(seen.duringReveal.map((sample) => sample.value)).toEqual(seen.duringReveal.map(() => held));
    expect(seen.atPrompt!.value).toBe(held);

    // The viewer's client reported the prompt on screen, so the server charges the viewer now.
    await expect.poll(async () => (await scenario.snapshot()).timerActiveSeat, { timeout: 5000 }).toBe(0);
    await expect(page.getByTestId("viewer-match-timer").first()).toHaveAttribute("data-active", "true");
    await expect
      .poll(async () => Number(await page.getByTestId("viewer-match-timer").first().locator("strong").textContent()), {
        timeout: 5000,
      })
      .toBeLessThan(held);

    const { steps } = await scenario.presentation();
    expect(steps.filter((step) => step.skipping).map((step) => step.id)).toEqual([]);
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        !s.combatWindow &&
        s.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId).join() === "BT10-079",
      (decision) => (decision.promptText?.includes("Decoy") ? { cardId: "EX5-050" } : {}),
    );
    await scenario.healthy();
  });
});

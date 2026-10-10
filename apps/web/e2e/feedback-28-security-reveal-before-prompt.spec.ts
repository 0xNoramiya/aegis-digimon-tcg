import { test, expect } from "./scenario-page";

const SCENARIO = "arena-feedback28-security-reveal-before-prompt";
const DECOY_PROMPT = "delete this Digimon to prevent the other Digimon's deletion?";

declare global {
  interface Window {
    feedback28Seen?: { clashAt?: number; promptAt?: number; branchWithPrompt?: boolean };
  }
}

// DB feedback #28 (match cf59b069, timed): the attacker was asked to use ＜Decoy＞ before the
// client had shown the security card whose effect was deleting its Digimon. A timed decision
// used to drop the whole security scene and open the prompt at once.
test.describe("DB feedback #28: a timed security effect's prompt waits for the revealed card", () => {
  test("BT8-097 is shown before Sinduramon's Decoy prompt and stays docked beside it", async ({ scenario }) => {
    const { page } = scenario;
    await page.addInitScript((promptText) => {
      const seen: NonNullable<Window["feedback28Seen"]> = {};
      window.feedback28Seen = seen;
      new MutationObserver(() => {
        const now = performance.now();
        if (seen.clashAt === undefined && document.querySelector('[data-testid="security-clash"]')) seen.clashAt = now;
        if (seen.promptAt === undefined && document.body?.innerText.includes(promptText)) {
          seen.promptAt = now;
          seen.branchWithPrompt = document.querySelector('[data-testid="security-branch"]') !== null;
        }
      }).observe(document, { childList: true, subtree: true, characterData: true });
    }, DECOY_PROMPT);
    await scenario.open(SCENARIO);
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    expect((await scenario.snapshot()).matchTimer).toBe(true);
    const sinduramon = (await scenario.snapshot()).players[0]!.battleArea.find(
      (permanent) => permanent.topCard.cardId === "EX5-050",
    )!;
    await scenario.attack(sinduramon.permanentId);

    await expect(page.getByText(DECOY_PROMPT)).toBeVisible({ timeout: 10_000 });
    const seen = await page.evaluate(() => window.feedback28Seen!);
    expect(seen.clashAt, "the revealed card was drawn").toBeDefined();
    expect(seen.clashAt!).toBeLessThan(seen.promptAt!);
    expect(seen.branchWithPrompt, "the docked card is on screen when the prompt opens").toBe(true);
    await expect(page.getByTestId("security-branch")).toBeVisible();
    const { events } = await scenario.presentation();
    expect(events.find((event) => event.kind === "securityRevealed")).toMatchObject({ revealedCardId: "BT8-097" });

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

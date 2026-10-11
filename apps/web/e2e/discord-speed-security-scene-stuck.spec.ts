import { test, expect } from "./scenario-page";

const SCENARIO = "arena-discord-speed-security-scene-stuck";
const ATTACKER = "dev-perm-1-discord-speed-monodramon";

// Discord suggestion 1558288251029032970 (match 2e2a3231): in a timed match, a removal reaction
// deleted the attacker before its battle. The check closed with no battle and the revealed
// Magnamon stayed centre-stage for the rest of the match.
test.describe("Discord game-speed report: a timed security check that closes without a battle", () => {
  test.use({
    holdBotAfterTurn: 3,
    botMainIntents: [
      [{ type: "attack", attackerPermanentId: ATTACKER, target: { kind: "player" } }, { type: "endPhase" }],
      { scope: "test" },
    ],
  });

  test("the revealed card leaves the screen once Dynasmon deletes the attacker", async ({ scenario }) => {
    const { page } = scenario;
    await scenario.open(SCENARIO, "slow");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    expect((await scenario.snapshot()).matchTimer).toBe(true);
    await page.getByRole("button", { name: /^End turn$/i }).click();
    // The bot paces its own turn: phase narration and think time come before its attack.
    await expect
      .poll(async () => (await scenario.presentation()).decisions.some((d) => d.sourceCardId === "AD1-017"), {
        timeout: 40_000,
      })
      .toBe(true);
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        !s.combatWindow &&
        s.players[0]!.trash.some((card) => card.cardId === "BT23-054") &&
        !s.players[1]!.battleArea.some((permanent) => permanent.permanentId === ATTACKER),
      (decision) => (decision.sourceCardId === "AD1-017" ? { instanceIds: [ATTACKER] } : {}),
    );
    const { events } = await scenario.presentation();
    expect(events.find((event) => event.kind === "securityChecked")).toMatchObject({
      revealedCardId: "BT23-054",
      resolution: "trashed",
    });
    await expect(page.locator(".battle-clash")).toHaveCount(0);
    await scenario.healthy();
  });
});

import { test, expect } from "./scenario-page";

test("GitHub #5428: MegaKabuterimon offers and pays its [Insectoid] trait cost 3", async ({ scenario }) => {
  const { page } = scenario;
  await scenario.open("arena-github-5428-megakabuterimon-insectoid");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const card = page.locator('[data-hand-instance-id="arena-github-5428-megakabuterimon-insectoid-0-hand-0"]');
  await card.focus();
  await card.press("Enter");
  await page.getByRole("button", { name: "Digivolve", exact: true }).click();
  await page.locator('[data-drop="perm-you"][data-id="arena-github-5428-megakabuterimon-insectoid-0-field-0"]').click();
  await expect(page.locator(".evo-cost-prompt__option")).toHaveCount(2);
  await page.locator(".evo-cost-prompt__option[data-recommended]").click();
  await scenario.resolveUntil((s) => s.players[0]!.battleArea[0]!.topCard.cardId === "P-140" && !s.pendingDecision);
  expect((await scenario.snapshot()).memory).toBe(3);
  await scenario.healthy();
});

test.describe("GitHub #5423: Knightmon on an opposing attack", () => {
  test.use({
    holdBotAfterTurn: 3,
    // A list option must use Playwright's [value, options] form, or it is read as that pair.
    botMainIntents: [
      [
        {
          type: "attack",
          attackerPermanentId: "arena-github-5423-knightmon-opponent-attack-1-field-0",
          target: { kind: "player" },
        },
        { type: "endPhase" },
      ],
      { scope: "test" },
    ],
  });

  test("the inherited play lands before blocker timing and the new Gotsumon blocks", async ({ scenario }) => {
    const { page } = scenario;
    await scenario.open("arena-github-5423-knightmon-opponent-attack");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    await page.getByRole("button", { name: /^End turn$/i }).click();
    // The bot paces its own turn: phase narration and think time come before the scripted attack.
    await expect
      .poll(async () => (await scenario.snapshot()).pendingDecision?.kind, { timeout: 40_000 })
      .toBe("optional");
    await scenario.resolveUntil(
      (s) => s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT2-054") && !s.pendingDecision,
      (d) => (d.kind === "selectCards" ? { cardId: "BT2-054" } : {}),
    );
    const prompt = page.getByRole("region", { name: "Block window", exact: true });
    await expect(prompt).toBeVisible();
    const gotsumon = (await scenario.snapshot()).players[0]!.battleArea.find((p) => p.topCard.cardId === "BT2-054")!;
    await page.locator(`[data-drop="perm-you"][data-id="${gotsumon.permanentId}"]`).click();
    await scenario.resolveUntil((s) => !s.pendingDecision && !s.combatWindow && s.turnSeat === 0);
    const final = await scenario.snapshot();
    expect(final.players[0]!.securityCount).toBe(3);
    const events = (await scenario.presentation()).events;
    expect(events.filter((e) => e.kind === "blocked")).toHaveLength(1);
    expect(events.some((e) => e.kind === "securityChecked")).toBe(false);
    await scenario.healthy();
  });
});

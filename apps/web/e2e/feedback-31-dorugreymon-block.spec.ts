import { test, expect } from "./scenario-page";

const DORUGREYMON = "dev-perm-0-feedback31-dorugreymon";
const ATTACKER = "dev-perm-1-feedback31-attacker";
const DORUGORAMON = "dev-feedback31-dorugoramon";

test.use({
  holdBotAfterTurn: 3,
  // A list option must use Playwright's [value, options] form, or it is read as that pair.
  botMainIntents: [
    [{ type: "attack", attackerPermanentId: ATTACKER, target: { kind: "player" } }, { type: "endPhase" }],
    { scope: "test" },
  ],
});

test("feedback #31: DoruGreymon digivolves for free when it blocks the opponent's attack", async ({
  scenario,
  page,
}) => {
  await scenario.open("arena-feedback31-dorugreymon-block-digivolve");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await page.getByRole("button", { name: /^End turn$/i }).click();

  // Decline Kosuke Kisakata's [End of All Turns] play, then let the bot's turn reach its attack.
  await scenario.resolveUntil(
    (s) => s.turnSeat === 1,
    () => ({ accept: false }),
  );
  // The bot's turn plays several phase banners before the attack, which outlasts resolveUntil's poll.
  await expect
    .poll(async () => (await scenario.snapshot()).combatWindow, { timeout: 30_000 })
    .toMatchObject({ kind: "block", seat: 0, attackerPermanentId: ATTACKER });
  expect((await scenario.snapshot()).combatWindow!.eligiblePermanentIds).toContain(DORUGREYMON);
  await page.locator(`[data-id="${DORUGREYMON}"][role="button"]`).click();

  const offers: string[] = [];
  await scenario.resolveUntil(
    (s) =>
      !s.combatWindow &&
      !s.pendingDecision &&
      !s.players[1]!.battleArea.some((permanent) => permanent.permanentId === ATTACKER),
    (decision) => {
      offers.push(decision.promptText);
      // The battle deletion animation runs before the post-battle trigger order prompt.
      if (decision.kind === "orderTriggers") return { decisionBudgetMs: 10_000 };
      return { accept: decision.promptText === "Digivolve" };
    },
  );

  expect(offers).toContain("Digivolve");
  const human = (await scenario.snapshot()).players[0]!;
  const doru = human.battleArea.find((permanent) => permanent.permanentId === DORUGREYMON);
  expect(doru?.topCard.cardId).toBe("BT16-064");
  expect(human.hand.some((card) => card.instanceId === DORUGORAMON)).toBe(false);
  expect(human.security).toHaveLength(3);
  await scenario.healthy();
});

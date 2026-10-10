import { test, expect } from "./scenario-page";

const KAZUCHIMON = "dev-perm-0-feedback21-kazuchimon";
const TAI = "dev-perm-1-feedback21-tai";
const LOCKED_DEMIDEVIMON = "dev-feedback21-locked-demidevimon";
const UNLOCKED_DEMIDEVIMON = "dev-feedback21-unlocked-demidevimon";

// Valdur Arm's "none of their Digimon or Tamers can activate [On Play] effects ... until the end
// of their turn" is a resolved duration effect. It survives Valdur's deletion, covers Digimon the
// opponent plays later that turn (rule manual: "Effects That Don't Choose Targets"), and ends with
// the opponent's next turn, so an [On Play] two opponent turns later activates normally.
test.use({
  holdBotAfterTurn: 5,
  // A list option must use Playwright's [value, options] form, or it is read as that pair.
  botMainIntents: [
    [
      { type: "playCard", instanceId: LOCKED_DEMIDEVIMON },
      { type: "endPhase" },
      { type: "playCard", instanceId: UNLOCKED_DEMIDEVIMON },
      { type: "endPhase" },
    ],
    { scope: "test" },
  ],
});

test("feedback #21: Valdur Arm's On Play lock lasts one opponent turn, even after Valdur is deleted", async ({
  scenario,
}) => {
  const { page } = scenario;
  const endTurnAndWaitForBotTurn = async () => {
    const endedTurn = (await scenario.snapshot()).turnCount;
    await page.getByRole("button", { name: /^End turn$/i }).click();
    await expect
      .poll(
        async () => {
          const s = await scenario.snapshot();
          return s.turnSeat === 0 && s.turnCount === endedTurn + 2 && s.phase === "Breeding";
        },
        { timeout: 60_000 },
      )
      .toBe(true);
    await scenario.idle();
  };
  await scenario.open("arena-feedback21-valdur-on-play-lock");
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);

  await scenario.evolve("Chaosmon: Valdur Arm", KAZUCHIMON);
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-037") &&
      s.players[1]!.battleArea.some((p) => p.permanentId === TAI && p.isSuspended) &&
      s.memory === 6 &&
      !s.pendingDecision,
  );

  await scenario.attack(KAZUCHIMON);
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.battleArea.length === 0 &&
      s.players[0]!.trash.some((card) => card.cardId === "BT20-037") &&
      !s.pendingDecision &&
      !s.combatWindow,
  );

  await endTurnAndWaitForBotTurn();
  const afterLockedTurn = await scenario.snapshot();
  expect(afterLockedTurn.players[1]!.battleArea.some((p) => p.topCard.instanceId === LOCKED_DEMIDEVIMON)).toBe(true);
  expect(afterLockedTurn.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT10-086"]);
  await expect(page.getByText("Trash the top 2 cards of your deck.")).toHaveCount(0);

  await page.getByRole("button", { name: /^end breeding$/i }).click();
  await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);
  await endTurnAndWaitForBotTurn();
  const afterUnlockedTurn = await scenario.snapshot();
  expect(afterUnlockedTurn.players[1]!.battleArea.some((p) => p.topCard.instanceId === UNLOCKED_DEMIDEVIMON)).toBe(
    true,
  );
  expect(afterUnlockedTurn.players[1]!.trash.map((card) => card.cardId).sort()).toEqual([
    "BT1-027",
    "BT1-027",
    "BT10-086",
  ]);
  expect(afterUnlockedTurn.players[1]!.deckCount).toBe(afterLockedTurn.players[1]!.deckCount - 3);
  await expect(page.getByText("Trash the top 2 cards of your deck.").first()).toBeVisible();

  await scenario.idle();
  const probe = await scenario.presentation();
  expect(probe.pending).toBe(0);
  expect(probe.steps.filter((step) => step.failed)).toEqual([]);
  expect(probe.gateExpiries).toEqual([]);
  expect(scenario.errors).toEqual([]);
});

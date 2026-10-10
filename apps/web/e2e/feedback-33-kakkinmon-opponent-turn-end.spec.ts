import { test, expect, type DecisionPolicy } from "./scenario-page";

const CRANIAMON = "dev-perm-0-feedback33-craniamon";
const ZEPHAGAMON = "dev-feedback33-zephagamon";

// Feedback #33: Kakkinmon's inherited [End of All Turns] effect must also trigger at the end of the
// opponent's turn while Craniamon is immune to the opponent's effects. The bot plays Zephagamon on
// its turn (turn 2), as in the reported match, and then holds.
test.use({
  holdBotAfterTurn: 3,
  // A list option must use Playwright's [value, options] form, or it is read as that pair.
  botMainIntents: [[{ type: "playCard", instanceId: ZEPHAGAMON }], { scope: "test" }],
});

test("feedback #33: Kakkinmon draws at the end of the opponent's turn with an immune Craniamon", async ({
  scenario,
}) => {
  const { page } = scenario;
  await scenario.open("arena-feedback33-kakkinmon-opponent-turn-end");
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);

  await scenario.evolve("Craniamon", CRANIAMON);
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      s.players[0]!.battleArea.some((p) => p.permanentId === CRANIAMON && p.topCard.cardId === "EX13-062"),
  );
  const before = await scenario.snapshot();
  const handBeforeEndTurn = before.players[0]!.hand.length;
  expect(handBeforeEndTurn).toBeLessThanOrEqual(5);

  const turnSeatAtKakkinmonPrompt: number[] = [];
  const answerKakkinmon: DecisionPolicy = async (decision) => {
    if (decision.sourceCardId !== "P-245") return {};
    if (decision.kind !== "optional") return { instanceId: CRANIAMON };
    turnSeatAtKakkinmonPrompt.push((await scenario.snapshot()).turnSeat);
    return { accept: true };
  };
  await page.getByRole("button", { name: /^End turn$/i }).click();
  await scenario.resolveUntil((s) => s.turnSeat === 1, answerKakkinmon);
  // The bot's whole turn runs before the next prompt: its phases, Zephagamon and its effects.
  await expect
    .poll(
      async () => {
        const s = await scenario.snapshot();
        return s.pendingDecision?.seat === 0 || (s.turnSeat === 0 && s.phase === "Breeding");
      },
      { timeout: 60_000 },
    )
    .toBe(true);
  await scenario.resolveUntil(
    (s) => s.turnSeat === 0 && s.turnCount === before.turnCount + 2 && s.phase === "Breeding",
    answerKakkinmon,
  );

  const after = await scenario.snapshot();
  expect(turnSeatAtKakkinmonPrompt).toEqual([0, 1]);
  // One Kakkinmon draw on each end of turn, then this turn's normal draw.
  expect(after.players[0]!.hand).toHaveLength(handBeforeEndTurn + 3);
  expect(after.players[1]!.trash.some((card) => card.instanceId === ZEPHAGAMON)).toBe(true);
  await scenario.healthy();
});

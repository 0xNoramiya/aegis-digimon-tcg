import fixtureChuumonOpponentTurn from "../../api/src/engine/scenarios/chuumon-opponent-turn.fixture";
import { fixtureInstanceId, fixturePermanentId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const HAND_CHUUMON = fixtureInstanceId("hand-chuumon-card");
const DECK_CHUUMON = fixtureInstanceId("deck-chuumon-card");
const DECK_SUKAMON = fixtureInstanceId("deck-sukamon-card");
const BOT_SUKAMON = fixturePermanentId("opponent-bot-sukamon");

// Feedback #27: Chuumon's [On Play] reveal works only "if it's your opponent's turn". The bot's
// turn starts at turn 1, and holding it keeps its breeding and main phases from changing the board.
test.use({ holdBotAfterTurn: 1 });

test("Chuumon reveals only when it is played on the opponent's turn", async ({ scenario }) => {
  await scenario.openFixture(fixtureChuumonOpponentTurn);
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  const before = await scenario.snapshot();
  expect(before.players[1]!.battleArea.find((p) => p.permanentId === BOT_SUKAMON)?.currentDP).toBe(1000);

  const turnSeatAtChuumonReveal: number[] = [];
  await scenario.play("Chuumon", "Digimon");
  await scenario.resolveUntil(
    (s) => !s.pendingDecision && s.players[0]!.battleArea.some((p) => p.topCard.instanceId === DECK_SUKAMON),
    async (decision) => {
      // KingSukamon's prompt waits for the turn banner, the bot's unsuspend phase and the deletion
      // of its Sukamon (about 6 s together), so this one decision gets a longer budget.
      if (decision.sourceCardId === "EX13-031") return { cardId: "EX5-045", decisionBudgetMs: 10_000 };
      if (decision.sourceCardId === "EX5-045") {
        turnSeatAtChuumonReveal.push((await scenario.snapshot()).turnSeat);
        return { cardId: "BT3-063" };
      }
      return {};
    },
  );

  const after = await scenario.snapshot();
  const human = after.players[0]!;
  expect(turnSeatAtChuumonReveal).toEqual([1]);
  expect(after.players[1]!.battleArea.some((p) => p.permanentId === BOT_SUKAMON)).toBe(false);
  for (const instanceId of [HAND_CHUUMON, DECK_CHUUMON, DECK_SUKAMON])
    expect(
      human.battleArea.some((p) => p.topCard.instanceId === instanceId),
      instanceId,
    ).toBe(true);
  expect(human.trash.map((card) => card.instanceId).sort()).toEqual(
    [
      fixtureInstanceId("chuumon-reveal-1-card"),
      fixtureInstanceId("chuumon-reveal-2-card"),
      fixtureInstanceId("kingsukamon-reveal-1-card"),
      fixtureInstanceId("kingsukamon-reveal-2-card"),
    ].sort(),
  );
  await scenario.healthy();
});

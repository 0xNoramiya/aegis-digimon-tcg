import { expect, it } from "vitest";
import { catalogStoryBattles } from "@aegis/shared/story/catalogStoryBattles";
import { getStoryBattleDifficulty } from "@aegis/shared/story/getStoryBattleDifficulty";
import { StoryDifficulty } from "@aegis/shared/story/StoryDifficulty";
import { runBotMatch } from "#api/bot/matchHarness";
import { getStoryScenario } from "#api/story/getStoryScenario";
import { getStorySeatDeck } from "#api/story/getStorySeatDeck";
import { shuffleStoryDecks } from "#api/story/shuffleStoryDecks";

const isEnabled = process.env.STORY_BALANCE === "1";
const battlesPerDifficulty = Number(process.env.STORY_BALANCE_BATTLES ?? 12);
const seedsPerBattle = Number(process.env.STORY_BALANCE_SEEDS ?? 3);

async function getPlayerWinRate(battleIds: readonly string[]): Promise<number> {
  let wins = 0;
  let games = 0;
  for (const battleId of battleIds) {
    for (let seed = 1; seed <= seedsPerBattle; seed++) {
      const fixture = getStoryScenario(battleId)!;
      shuffleStoryDecks({ fixture, seed });
      const difficulty = getStoryBattleDifficulty({ battleId })!;
      const result = await runBotMatch({
        seed,
        turnLimit: 60,
        fixture,
        seats: [
          { deck: getStorySeatDeck({ fixture, seat: 0 }) },
          {
            deck: getStorySeatDeck({ fixture, seat: 1 }),
            profile: difficulty.isAggressive ? "aggressive" : "balanced",
          },
        ],
      });
      expect(result.errors).toEqual([]);
      games++;
      if (result.winnerSeat === 0) {
        wins++;
      }
    }
  }
  return wins / games;
}

it.runIf(isEnabled)(
  "lowers the player bot win rate as story difficulty rises",
  async () => {
    const rates = new Map<string, number>();
    for (const difficulty of Object.values(StoryDifficulty)) {
      const battleIds = catalogStoryBattles
        .filter(
          (battle) => battle.playable && getStoryBattleDifficulty({ battleId: battle.id })?.value === difficulty.value,
        )
        .map((battle) => battle.id);
      const step = Math.max(1, Math.floor(battleIds.length / battlesPerDifficulty));
      const sample = battleIds.filter((_, index) => index % step === 0).slice(0, battlesPerDifficulty);
      rates.set(difficulty.value, await getPlayerWinRate(sample));
    }
    process.stderr.write(`\n${JSON.stringify(Object.fromEntries(rates))}\n`);
    expect(rates.get(StoryDifficulty.INTRO.value)!).toBeGreaterThan(rates.get(StoryDifficulty.BOSS.value)!);
  },
  3_600_000,
);

import { StoryDifficulty, type StoryDifficultyEntry } from "#shared/story/StoryDifficulty";
import { getStoryCampaignBattles } from "#shared/story/getStoryCampaignBattles";
import { storyBattleAliases } from "#shared/story/storyBattleAliases";
import { storyBattles } from "#shared/story/storyBattles";
import type { StoryBattle } from "#shared/story/StoryBattle";

type Params = { battleId: string };

const introShare = 0.2;
const challengeShare = 0.6;

type ProgressParams = { index: number; total: number };

function getProgressDifficulty({ index, total }: ProgressParams): StoryDifficultyEntry {
  const progress = index / total;
  if (progress < introShare) {
    return StoryDifficulty.INTRO;
  }
  if (progress < challengeShare) {
    return StoryDifficulty.CHALLENGE;
  }
  return StoryDifficulty.ELITE;
}

function getCampaignDifficulties(battles: readonly StoryBattle[]): [string, StoryDifficultyEntry][] {
  const finaleIndex = battles.map((battle) => !battle.isOptional).lastIndexOf(true);
  return battles.map((battle, index) => {
    if (index === finaleIndex || (battle.isOptional && index > finaleIndex)) {
      return [battle.id, StoryDifficulty.BOSS];
    }
    if (battle.isOptional) {
      return [battle.id, StoryDifficulty.ELITE];
    }
    return [battle.id, getProgressDifficulty({ index, total: battles.length })];
  });
}

function buildDifficulties(): ReadonlyMap<string, StoryDifficultyEntry> {
  const campaignIds = new Set(storyBattles.flatMap((battle) => (battle.campaignId ? [battle.campaignId] : [])));
  return new Map(
    [...campaignIds].flatMap((campaignId) => getCampaignDifficulties(getStoryCampaignBattles({ campaignId }))),
  );
}

const difficulties = buildDifficulties();

export function getStoryBattleDifficulty({ battleId }: Params): StoryDifficultyEntry | undefined {
  const id = Object.hasOwn(storyBattleAliases, battleId) ? storyBattleAliases[battleId]! : battleId;
  return difficulties.get(id);
}

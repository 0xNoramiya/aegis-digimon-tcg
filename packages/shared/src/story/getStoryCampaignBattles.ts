import { StoryCampaignId } from "#shared/story/StoryCampaignId";
import { storyBattles } from "#shared/story/storyBattles";
import { storyBattleAliases } from "#shared/story/storyBattleAliases";
import type { StoryBattle } from "#shared/story/StoryBattle";

type Params = { campaignId: string };

export function getStoryCampaignBattles({ campaignId }: Params): readonly StoryBattle[] {
  return storyBattles
    .filter(
      (battle) =>
        (battle.campaignId ?? StoryCampaignId.LIBERATOR.value) === campaignId &&
        !Object.hasOwn(storyBattleAliases, battle.id),
    )
    .map((battle) => {
      if (battle.id === "dw1-038") {
        return { ...battle, title: "Parceiro vs. Machinedramon", chapterId: "Back Dimension" };
      }
      return battle;
    });
}

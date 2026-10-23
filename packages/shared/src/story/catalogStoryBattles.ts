import type { StoryBattle } from "#shared/story/StoryBattle";
import { StoryBattleKind } from "#shared/story/StoryBattleKind";
import { storyCatalogBattles } from "#shared/story/storyCatalogBattles";
import { worldStoryBattles } from "#shared/story/worldStoryBattles";
import { storyCatalogDecks } from "#shared/story/storyCatalogDecks";
import { storyCanonicalDefeatBattleIds } from "#shared/story/storyCanonicalDefeatBattleIds";

export const catalogStoryBattles: readonly StoryBattle[] = storyCatalogBattles.map((battle) => {
  const existing = worldStoryBattles.find((entry) => entry.id === battle.id.toLowerCase());
  if (existing) {
    return existing;
  }
  const participants = battle.title.split(" vs. ");
  const id = battle.id.toLowerCase();
  return {
    id,
    kind: StoryBattleKind.NARRATIVE.value,
    title: battle.title,
    character: battle.protagonist ?? participants[0] ?? battle.title,
    opponent: battle.opponents?.join(" + ") || participants.slice(1).join(" vs. ") || battle.title,
    campaignId: battle.campaignId,
    chapterId:
      (battle.campaignId === "digimon-dawn-dusk"
        ? battle.chapter.split(" · ").slice(0, 2).join(" · ")
        : battle.chapter.split(" · ")[0]?.trim()) || battle.campaignId,
    isOptional: battle.isOptional,
    completionGroup: battle.completionGroup,
    playerDeckRef: battle.playerDeckRefs[0],
    opponentDeckRef: battle.opponentDeckRef,
    playable: !storyCanonicalDefeatBattleIds.has(id),
    adapted: true,
    chapters: [],
    sourceUrl: battle.sourceUrl,
    coverImageUrl: `/assets/card-images/${storyCatalogDecks[battle.opponentDeckRef].main[0]?.[0]}.webp`,
  };
});

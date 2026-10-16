import type { StoryBattleKind } from "#shared/story/StoryBattleKind";

export type StoryBattle = {
  kind: StoryBattleKind;
  id: string;
  title: string;
  character: string;
  opponent: string;
  chapters: { title: string; url: string }[];
  sourceUrl: string;
  playable: boolean;
  adapted: boolean;
  coverImageUrl: string;
  prerequisiteId?: string;
};

export type StoryProgress = { completed: string[] };

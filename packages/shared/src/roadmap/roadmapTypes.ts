import type { RoadmapStatus } from "#shared/roadmap/RoadmapStatus";

export type RoadmapItem = {
  id: number;
  title: string;
  description: string;
  status: RoadmapStatus;
  supportCount: number;
  supported: boolean;
};

export type RoadmapItemDetail = RoadmapItem & {
  discussionUrl: string | null;
  createdAt: number;
  updatedAt: number;
};

export type RoadmapDraft = {
  title: string;
  description: string;
  status: RoadmapStatus;
  discussionUrl: string | null;
};

export type RoadmapDraftFailure =
  | "invalid_status"
  | "empty_title"
  | "title_too_long"
  | "empty_description"
  | "description_too_long"
  | "invalid_discussion_url";

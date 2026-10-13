export const RoadmapStatus = {
  PLANNED: { name: "PLANNED", value: "planned" },
  IN_PROGRESS: { name: "IN_PROGRESS", value: "in_progress" },
  UNDER_REVIEW: { name: "UNDER_REVIEW", value: "under_review" },
  COMPLETED: { name: "COMPLETED", value: "completed" },
} as const;
export type RoadmapStatus = (typeof RoadmapStatus)[keyof typeof RoadmapStatus]["value"];
export const ROADMAP_STATUSES: readonly RoadmapStatus[] = Object.values(RoadmapStatus).map((entry) => entry.value);

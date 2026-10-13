import { RoadmapStatus } from "@aegis/shared/roadmap/RoadmapStatus";

export const ROADMAP_COLUMNS = [
  { status: RoadmapStatus.PLANNED.value, label: "roadmap.status.planned" },
  { status: RoadmapStatus.IN_PROGRESS.value, label: "roadmap.status.in_progress" },
  { status: RoadmapStatus.UNDER_REVIEW.value, label: "roadmap.status.under_review" },
  { status: RoadmapStatus.COMPLETED.value, label: "roadmap.status.completed" },
] as const;

export const ROADMAP_COLUMN_LIMIT = 20;

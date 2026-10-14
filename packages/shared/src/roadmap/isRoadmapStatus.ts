import { ROADMAP_STATUSES, type RoadmapStatus } from "#shared/roadmap/RoadmapStatus";

export function isRoadmapStatus(value: unknown): value is RoadmapStatus {
  return typeof value === "string" && ROADMAP_STATUSES.includes(value as RoadmapStatus);
}

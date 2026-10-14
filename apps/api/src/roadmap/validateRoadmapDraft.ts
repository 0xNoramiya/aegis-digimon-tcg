import { isDiscordDiscussionUrl } from "@aegis/shared/roadmap/isDiscordDiscussionUrl";
import { isRoadmapStatus } from "@aegis/shared/roadmap/isRoadmapStatus";
import { MAX_ROADMAP_DESCRIPTION, MAX_ROADMAP_TITLE } from "@aegis/shared/roadmap/roadmapLimits";
import type { RoadmapDraft, RoadmapDraftFailure } from "@aegis/shared/roadmap/roadmapTypes";

type DraftBody = { title?: unknown; description?: unknown; status?: unknown; discussionUrl?: unknown };

export function validateRoadmapDraft(body: unknown): RoadmapDraft | { error: RoadmapDraftFailure } {
  const input = (body ?? {}) as DraftBody;
  if (!isRoadmapStatus(input.status)) return { error: "invalid_status" };
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return { error: "empty_title" };
  if (title.length > MAX_ROADMAP_TITLE) return { error: "title_too_long" };
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (!description) return { error: "empty_description" };
  if (description.length > MAX_ROADMAP_DESCRIPTION) return { error: "description_too_long" };
  const discussionUrl = typeof input.discussionUrl === "string" ? input.discussionUrl.trim() : "";
  if (input.discussionUrl !== undefined && input.discussionUrl !== null && typeof input.discussionUrl !== "string")
    return { error: "invalid_discussion_url" };
  if (discussionUrl && !isDiscordDiscussionUrl(discussionUrl)) return { error: "invalid_discussion_url" };
  return { title, description, status: input.status, discussionUrl: discussionUrl || null };
}

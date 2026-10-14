import { MAX_ROADMAP_DISCUSSION_URL } from "#shared/roadmap/roadmapLimits";

const DISCORD_DISCUSSION_URL = /^https:\/\/(?:www\.)?(?:discord\.com|discord\.gg)\/[A-Za-z0-9/_-]+$/;

export function isDiscordDiscussionUrl(value: string): boolean {
  return value.length <= MAX_ROADMAP_DISCUSSION_URL && DISCORD_DISCUSSION_URL.test(value);
}

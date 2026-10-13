import { describe, expect, it } from "vitest";
import { ROADMAP_STATUSES, RoadmapStatus } from "#shared/roadmap/RoadmapStatus";
import { isRoadmapStatus } from "#shared/roadmap/isRoadmapStatus";
import { isDiscordDiscussionUrl } from "#shared/roadmap/isDiscordDiscussionUrl";

describe("roadmap statuses", () => {
  it("lists the board columns in display order", () => {
    expect(ROADMAP_STATUSES).toEqual(["planned", "in_progress", "under_review", "completed"]);
  });

  it.each([RoadmapStatus.PLANNED.value, RoadmapStatus.COMPLETED.value])("accepts %s", (status) => {
    expect(isRoadmapStatus(status)).toBe(true);
  });

  it.each(["new", "resolved", "constructor", 1, null, undefined])("refuses %s", (value) => {
    expect(isRoadmapStatus(value)).toBe(false);
  });
});

describe("roadmap discussion links", () => {
  it.each(["https://discord.com/channels/1/2/3", "https://discord.gg/aegis", "https://www.discord.com/channels/1/2"])(
    "accepts the Discord link %s",
    (url) => {
      expect(isDiscordDiscussionUrl(url)).toBe(true);
    },
  );

  it.each([
    "http://discord.com/channels/1/2",
    "https://discord.com.evil.example/channels/1",
    "https://user:pass@discord.com/channels/1",
    "javascript:alert(1)",
    "not a url",
    `https://discord.com/${"x".repeat(400)}`,
  ])("refuses %s", (url) => {
    expect(isDiscordDiscussionUrl(url)).toBe(false);
  });
});

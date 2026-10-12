import { describe, expect, it } from "vitest";
import { pathForRoute, routeFromPathname } from "./routes";

describe("application routes", () => {
  it.each([
    ["/", { screen: "home" }],
    ["/login", { screen: "login" }],
    ["/play", { screen: "lobby" }],
    ["/decks", { screen: "deck" }],
    ["/collection", { screen: "collection" }],
    ["/community", { screen: "community" }],
    ["/community/decks/abc-123", { screen: "community", communityDeckId: "abc-123" }],
    ["/admin/feedback", { screen: "feedback" }],
    ["/admin/feedback/412", { screen: "feedback", feedbackId: 412 }],
    ["/feedback", { screen: "myFeedback" }],
    ["/feedback/roadmap", { screen: "myFeedback", feedbackView: "roadmap" }],
    ["/feedback/new", { screen: "myFeedback", feedbackView: "new" }],
    ["/feedback/private", { screen: "myFeedback", feedbackView: "private" }],
    ["/feedback/412/", { screen: "myFeedback", feedbackId: 412 }],
    ["/settings", { screen: "settings" }],
    ["/profile", { screen: "settings", profile: true }],
    ["/profile/replays", { screen: "settings", profile: true }],
    ["/profile/customize", { screen: "settings", profile: true }],
    ["/replays", { screen: "settings", profile: true }],
    ["/replays/saved-id", { screen: "replays", replayId: "saved-id" }],
    ["/whats-new", { screen: "releases" }],
  ])("parses %s", (pathname, expected) => {
    expect(routeFromPathname(pathname)).toEqual(expected);
  });

  it("round-trips profile and saved replay links", () => {
    expect(pathForRoute({ screen: "settings", profile: true })).toBe("/profile");
    expect(pathForRoute({ screen: "replays", replayId: "saved-id" })).toBe("/replays/saved-id");
    expect(pathForRoute({ screen: "replays" })).toBe("/profile");
  });

  it("round-trips a community deck path", () => {
    expect(pathForRoute({ screen: "community", communityDeckId: "abc-123" })).toBe("/community/decks/abc-123");
    expect(pathForRoute({ screen: "community" })).toBe("/community");
  });

  it("round-trips feedback deep links", () => {
    expect(pathForRoute({ screen: "feedback", feedbackId: 7 })).toBe("/admin/feedback/7");
    expect(pathForRoute({ screen: "myFeedback", feedbackId: 7 })).toBe("/feedback/7");
    expect(pathForRoute({ screen: "myFeedback" })).toBe("/feedback");
    expect(pathForRoute({ screen: "myFeedback", feedbackView: "new" })).toBe("/feedback/new");
    expect(pathForRoute({ screen: "myFeedback", feedbackView: "private" })).toBe("/feedback/private");
  });

  it("rejects unknown paths, tournaments included while the feature is hidden", () => {
    expect(routeFromPathname("/unknown")).toBeUndefined();
    expect(routeFromPathname("/feedback/abc")).toBeUndefined();
    expect(routeFromPathname("/tournaments")).toBeUndefined();
  });
});

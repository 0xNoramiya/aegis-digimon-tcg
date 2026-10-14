// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("decision ping preference", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("is enabled by default", async () => {
    const { isDecisionPingEnabled } = await import("@/design/decisionPing");

    expect(isDecisionPingEnabled()).toBe(true);
  });

  it("persists the player's choice across reloads", async () => {
    const { isDecisionPingEnabled, setDecisionPingEnabled } = await import("@/design/decisionPing");
    setDecisionPingEnabled(false);

    expect(isDecisionPingEnabled()).toBe(false);
    expect(localStorage.getItem("aegis.decision-ping.enabled")).toBe("false");

    vi.resetModules();
    const reloaded = await import("@/design/decisionPing");
    expect(reloaded.isDecisionPingEnabled()).toBe(false);
  });
});

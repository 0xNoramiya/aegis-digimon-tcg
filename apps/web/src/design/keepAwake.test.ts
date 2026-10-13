// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isKeepAwakeEnabled, setKeepAwakeEnabled } from "./keepAwake";

describe("keep awake preference", () => {
  beforeEach(() => localStorage.clear());

  it("is enabled by default", () => {
    expect(isKeepAwakeEnabled()).toBe(true);
  });

  it("persists the player's choice", () => {
    setKeepAwakeEnabled(false);

    expect(isKeepAwakeEnabled()).toBe(false);
    expect(localStorage.getItem("aegis.keep-awake.enabled")).toBe("false");
  });

  it("reads the stored choice when the module loads", async () => {
    localStorage.setItem("aegis.keep-awake.enabled", "false");
    vi.resetModules();

    const reloaded = await import("./keepAwake");

    expect(reloaded.isKeepAwakeEnabled()).toBe(false);
  });
});

// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("chat sound preference", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("is off by default", async () => {
    const { isChatSoundEnabled } = await import("./chatSound");

    expect(isChatSoundEnabled()).toBe(false);
  });

  it("persists the player's choice across reloads", async () => {
    const { isChatSoundEnabled, setChatSoundEnabled } = await import("./chatSound");
    setChatSoundEnabled(true);

    expect(isChatSoundEnabled()).toBe(true);
    expect(localStorage.getItem("aegis.chat.sound")).toBe("on");

    vi.resetModules();
    const reloaded = await import("./chatSound");
    expect(reloaded.isChatSoundEnabled()).toBe(true);

    reloaded.setChatSoundEnabled(false);
    expect(localStorage.getItem("aegis.chat.sound")).toBe("off");
  });
});

import { describe, expect, it, vi } from "vitest";
import { DEFAULT_NSFW_THRESHOLD, avatarModerationFromEnvironment, createAvatarModerator } from "./avatarModeration.js";

describe("avatar moderation", () => {
  it("blocks at or above the threshold and passes everything below it", async () => {
    const moderator = createAvatarModerator(async () => 0.8, DEFAULT_NSFW_THRESHOLD);
    await expect(moderator(Buffer.from("x"))).resolves.toBe("nsfw");

    const borderline = createAvatarModerator(async () => DEFAULT_NSFW_THRESHOLD, DEFAULT_NSFW_THRESHOLD);
    await expect(borderline(Buffer.from("x"))).resolves.toBe("nsfw");

    const low = createAvatarModerator(async () => 0.2, DEFAULT_NSFW_THRESHOLD);
    await expect(low(Buffer.from("x"))).resolves.toBe("safe");
  });

  it("treats a classifier failure as unchecked rather than explicit", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const moderator = createAvatarModerator(async () => {
        throw new Error("onnxruntime missing");
      }, DEFAULT_NSFW_THRESHOLD);
      await expect(moderator(Buffer.from("x"))).resolves.toBe("unavailable");
      await expect(moderator(Buffer.from("x"))).resolves.toBe("unavailable");
      // Reported once, not once per upload: a broken host would otherwise flood its own log.
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it("stays off unless a model path is configured", () => {
    expect(avatarModerationFromEnvironment({})).toBeUndefined();
    expect(avatarModerationFromEnvironment({ AVATAR_NSFW_MODEL: "  " })).toBeUndefined();
  });

  it("reads the threshold and timeout, falling back when they are nonsense", () => {
    const config = avatarModerationFromEnvironment({
      AVATAR_NSFW_MODEL: "/models/nsfw.onnx",
      AVATAR_NSFW_THRESHOLD: "1.5",
      AVATAR_NSFW_TIMEOUT_MS: "-1",
    });
    expect(config).toMatchObject({
      modelPath: "/models/nsfw.onnx",
      threshold: DEFAULT_NSFW_THRESHOLD,
      timeoutMs: 8_000,
    });
    expect(config?.threads).toBeGreaterThanOrEqual(1);
    expect(config?.threads).toBeLessThanOrEqual(4);
  });

  it("honours a configured threshold inside the open interval", () => {
    expect(
      avatarModerationFromEnvironment({
        AVATAR_NSFW_MODEL: "/m.onnx",
        AVATAR_NSFW_THRESHOLD: "0.85",
      })?.threshold,
    ).toBe(0.85);
  });
});

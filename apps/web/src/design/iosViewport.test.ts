// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { preventIosFocusZoom } from "./iosViewport";

const BASE = "width=device-width, initial-scale=1.0, viewport-fit=cover";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36";

describe("preventIosFocusZoom", () => {
  let viewport: HTMLMetaElement;
  beforeEach(() => {
    viewport = document.createElement("meta");
    viewport.name = "viewport";
    viewport.content = BASE;
    document.head.append(viewport);
  });
  afterEach(() => viewport.remove());

  it("caps the scale on iPhone", () => {
    preventIosFocusZoom({ userAgent: IPHONE, platform: "iPhone", maxTouchPoints: 5 });
    expect(viewport.content).toBe(`${BASE}, maximum-scale=1`);
  });

  it("caps the scale on an iPad that reports a desktop platform", () => {
    preventIosFocusZoom({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      platform: "MacIntel",
      maxTouchPoints: 5,
    });
    expect(viewport.content).toContain("maximum-scale=1");
  });

  it("keeps pinch zoom on Android and desktop Mac", () => {
    preventIosFocusZoom({ userAgent: ANDROID, platform: "Linux armv8l", maxTouchPoints: 5 });
    preventIosFocusZoom({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      platform: "MacIntel",
      maxTouchPoints: 0,
    });
    expect(viewport.content).toBe(BASE);
  });

  it("does not repeat the cap", () => {
    const iphone = { userAgent: IPHONE, platform: "iPhone", maxTouchPoints: 5 };
    preventIosFocusZoom(iphone);
    preventIosFocusZoom(iphone);
    expect(viewport.content.match(/maximum-scale/g)).toHaveLength(1);
  });
});

import { statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { drawReplayFixture } from "../test/replays/fixture";

// Exercise the browser's real tab stream and MediaRecorder, without mocking the encoder.
test.use({
  channel: "chromium",
  launchOptions: {
    args: ["--auto-select-tab-capture-source-by-title=Aegis replay export test", "--auto-accept-this-tab-capture"],
  },
});

test("#34 exports a decodable video and removes the recorded thinking gaps", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
  await page.goto("/e2e/replay-harness.html");
  await page.evaluate(() => {
    document.title = "Aegis replay export test";
  });
  const replay = drawReplayFixture();
  replay.frames.forEach((frame, index) => {
    frame.atMs = index * 60_000;
  });
  replay.finishedAt = replay.startedAt + replay.frames.at(-1)!.atMs;
  await page.getByLabel("Open replay file").setInputFiles({
    name: "video.aegis-replay",
    mimeType: "application/gzip",
    buffer: gzipSync(JSON.stringify(replay)),
  });
  await page.getByLabel("Playback options", { exact: true }).click();
  await page.getByLabel("Playback speed").selectOption("4");
  const started = Date.now();
  await page.getByRole("button", { name: "Record replay video", exact: true }).click();
  await page.getByRole("button", { name: "Choose screen and record", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop recording", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Video ready", exact: true })).toBeVisible({ timeout: 30_000 });
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download video", exact: true }).click();
  const video = await download;
  expect(Date.now() - started).toBeLessThan(30_000);
  expect(video.suggestedFilename()).toMatch(/^aegis-.*\.webm$/);
  const path = test.info().outputPath(video.suggestedFilename());
  await video.saveAs(path);
  // Opening the first frame can succeed even when H.264 samples are corrupt.
  // Decode every video and audio packet with an independent decoder.
  expect(statSync(path).size).toBeGreaterThan(10_000);
  await test.info().attach("exported replay", { path, contentType: path.endsWith("mp4") ? "video/mp4" : "video/webm" });
  expect(() =>
    execFileSync("ffmpeg", ["-v", "error", "-xerror", "-i", path, "-f", "null", "-"], {
      stdio: "pipe",
      timeout: 20_000,
    }),
  ).not.toThrow();
  const file = await video.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of file!) chunks.push(Buffer.from(chunk));
  const decoded = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "video/webm" }));
    const element = document.createElement("video");
    element.muted = true;
    element.src = url;
    await new Promise<void>((resolve, reject) => {
      element.onloadeddata = () => resolve();
      element.onerror = () => reject(new Error("video decode failed"));
    });
    const size = { width: element.videoWidth, height: element.videoHeight };
    URL.revokeObjectURL(url);
    return size;
  }, Buffer.concat(chunks).toString("base64"));
  expect(decoded.width).toBeGreaterThan(500);
  expect(decoded.height).toBeGreaterThan(300);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Record replay video", exact: true })).toBeVisible();
  await expect(page.getByText("Replay finished", { exact: true })).toBeVisible();
});

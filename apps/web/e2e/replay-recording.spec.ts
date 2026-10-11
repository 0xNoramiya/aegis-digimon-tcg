import { test, expect } from "@playwright/test";
import { ReplayRecordingPage } from "./replay-recording-page";

test("records with the real browser encoder, restarts playback and offers a local video download", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Replace the OS picker only. MediaRecorder and the video encoder are real.
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      value: async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 180;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#246";
        context.fillRect(0, 0, canvas.width, canvas.height);
        return canvas.captureStream(30);
      },
    });
  });
  const replay = new ReplayRecordingPage(page);
  await replay.open();
  await page.getByRole("button", { name: "Go to end", exact: true }).click();
  await page.getByRole("button", { name: "Record replay video", exact: true }).click();
  await page.getByRole("button", { name: "Choose screen and record", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop recording", exact: true })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Replay position", includeHidden: true })).toHaveValue("0");
  await expect(page.getByRole("slider", { name: "Replay position" })).toBeHidden();
  await expect(page.getByRole("dialog", { name: "Video ready", exact: true })).toBeVisible({ timeout: 30_000 });
  await replay.drained();
  const link = page.getByRole("link", { name: "Download video", exact: true });
  await expect(link).toBeVisible();
  const download = page.waitForEvent("download");
  await link.click();
  const video = await download;
  expect(video.suggestedFilename()).toMatch(/^aegis-.*\.(mp4|webm)$/);
  expect(await video.failure()).toBeNull();
  const bytes = await page.evaluate(async () => {
    const downloadLink = document.querySelector<HTMLAnchorElement>("a[download]")!;
    return (await (await fetch(downloadLink.href)).blob()).size;
  });
  expect(bytes).toBeGreaterThan(100);
  const dimensions = await page.evaluate(
    () =>
      new Promise<{ width: number; height: number }>((resolve, reject) => {
        const videoElement = document.createElement("video");
        videoElement.muted = true;
        videoElement.onloadeddata = () => {
          resolve({ width: videoElement.videoWidth, height: videoElement.videoHeight });
          videoElement.removeAttribute("src");
          videoElement.load();
        };
        videoElement.onerror = () => reject(new Error("Recorded video cannot be decoded"));
        videoElement.src = document.querySelector<HTMLAnchorElement>("a[download]")!.href;
        videoElement.load();
      }),
  );
  expect(dimensions).toEqual({ width: 320, height: 180 });
  expect(errors).toEqual([]);
});

test("denied capture leaves the replay paused and still offers native recording", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      value: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    });
  });
  await new ReplayRecordingPage(page).open();
  await page.getByRole("button", { name: "Record replay video", exact: true }).click();
  await page.getByRole("button", { name: "Choose screen and record", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(/Screen sharing was canceled or denied/);
  await expect(page.getByRole("slider", { name: "Replay position" })).toHaveValue("0");
  await page.getByText("Use the device screen recorder", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Start replay for device recording" })).toBeVisible();
});

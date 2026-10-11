import { gunzipSync, gzipSync } from "node:zlib";
import type { Page } from "@playwright/test";
import type { MatchReplay } from "@aegis/shared";
import { replayFixture } from "../test/replays/fixture";
import { expect, test } from "./fixtures";

const VIEW_LINK = "https://drive.google.com/file/d/drive-file/view";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/** Stands in for the Drive REST API; the browser talks to it directly, never through Aegis. */
async function routeDrive(page: Page, options: { archive?: Buffer; onUpload?: (body: Buffer) => void } = {}) {
  await page.route("https://www.googleapis.com/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (value: unknown) =>
      route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(value) });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (url.pathname.startsWith("/upload/")) {
      options.onUpload?.(request.postDataBuffer()!);
      return json({ id: "drive-file", name: "replay.aegis-replay", webViewLink: VIEW_LINK });
    }
    if (request.method() === "POST") return json({ id: "aegis-folder" });
    if (url.searchParams.get("alt") === "media")
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/gzip", body: options.archive });
    const query = url.searchParams.get("q") ?? "";
    if (query.includes("matchId") || query.includes("google-apps.folder")) return json({ files: [] });
    return json({
      files: [
        {
          id: "drive-file",
          name: "aegis-match-player-1.aegis-replay",
          createdTime: "2026-10-09T12:00:00Z",
          size: String(options.archive?.length ?? 0),
          webViewLink: VIEW_LINK,
          appProperties: { aegisReplay: "1", players: "Agumon Player vs Gabumon Player" },
        },
      ],
    });
  });
}

function filePart(body: Buffer): Buffer {
  const marker = Buffer.from("Content-Type: application/gzip\r\n\r\n");
  const start = body.indexOf(marker) + marker.length;
  const end = body.lastIndexOf(Buffer.from("\r\n--"));
  return body.subarray(start, end);
}

test("auto-saves a finished match to the player's Google Drive", async ({ page, match }) => {
  const identityRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://accounts.google.com/")) identityRequests.push(request.url());
  });
  await page.addInitScript(() => {
    localStorage.setItem("aegis.drive.autosave", "on");
    localStorage.setItem("aegis.drive.linked", "1");
    localStorage.setItem(
      "aegis.drive.token",
      JSON.stringify({ token: "e2e-token", expiresAt: Date.now() + 3_600_000 }),
    );
  });
  let uploaded: Buffer | undefined;
  await routeDrive(page, { onUpload: (body) => (uploaded = body) });

  await match.start("reconnect");
  match.opponent.room.onMessage("replay", () => {});
  match.opponent.room.send("surrender", {});

  await expect(page.getByRole("heading", { name: "Saved to Google Drive" })).toBeVisible();
  const watch = page.getByRole("link", { name: "Watch now" });
  await expect(watch).toHaveAttribute("href", VIEW_LINK);
  await expect(watch).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: "My matches" })).toHaveAttribute("href", "/profile");
  expect(uploaded).toBeDefined();
  const text = uploaded!.toString("latin1");
  expect(text).toContain('"parents":["aegis-folder"]');
  expect(text).toContain('"aegisReplay":"1"');
  expect(text).toContain('"viewerSeat":"0"');
  const replay = JSON.parse(gunzipSync(filePart(uploaded!)).toString()) as MatchReplay;
  expect(replay.viewerSeat).toBe(0);
  expect(replay.frames.at(-1)!.state.gameOver).toBe(true);
  expect(identityRequests).toEqual([]);
});

test("a guest signs in to Drive again from the profile and watches a Drive replay", async ({ page }) => {
  const archive = gzipSync(JSON.stringify(replayFixture()));
  await page.addInitScript(() => {
    localStorage.setItem("aegis:locale", "en");
    localStorage.setItem("aegis.drive.linked", "1");
    (window as unknown as { google: unknown }).google = {
      accounts: {
        oauth2: {
          initTokenClient: (config: { callback: (response: object) => void }) => ({
            requestAccessToken: () => config.callback({ access_token: "e2e-token", expires_in: 3599 }),
          }),
          hasGrantedAllScopes: () => true,
          revoke: () => undefined,
        },
      },
    };
  });
  await page.route("**/auth/me", (route) => route.fulfill({ contentType: "application/json", body: "null" }));
  await routeDrive(page, { archive });

  await page.goto("/profile");
  const drive = page.getByRole("region", { name: "Google Drive" });
  await expect(page.getByRole("region", { name: "Saved replays" })).toHaveCount(0);
  await expect(drive.getByText("Sign in to Google Drive again to see your replays.")).toBeVisible();
  await drive.getByRole("button", { name: "Show Drive replays" }).click();
  await expect(drive.getByText("Agumon Player vs Gabumon Player")).toBeVisible();
  await expect(drive.getByRole("link", { name: "Open in Drive" })).toHaveAttribute("href", VIEW_LINK);
  await drive.getByRole("button", { name: /Watch now/ }).click();

  await expect(page.getByRole("heading", { name: "Agumon Player vs Gabumon Player" })).toBeVisible();
  await page.getByRole("button", { name: "Go to end", exact: true }).click();
  await expect(page.getByText("Replay finished", { exact: true })).toBeVisible();
});

test("fits the Drive replays on a 390px screen", async ({ page }) => {
  const archive = gzipSync(JSON.stringify(replayFixture()));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("aegis:locale", "en");
    localStorage.setItem("aegis.drive.linked", "1");
    localStorage.setItem(
      "aegis.drive.token",
      JSON.stringify({ token: "e2e-token", expiresAt: Date.now() + 3_600_000 }),
    );
  });
  await page.route("**/auth/me", (route) => route.fulfill({ contentType: "application/json", body: "null" }));
  await routeDrive(page, { archive });

  await page.goto("/profile");
  const drive = page.getByRole("region", { name: "Google Drive" });
  const watch = drive.getByRole("button", { name: /Watch now/ });
  await watch.scrollIntoViewIfNeeded();
  const bounds = (await watch.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

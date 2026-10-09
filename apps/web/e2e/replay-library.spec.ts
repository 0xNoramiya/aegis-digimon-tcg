import { gzipSync } from "node:zlib";
import { test, expect, type Page } from "@playwright/test";
import type { SavedReplay } from "@aegis/shared";
import { replayFixture } from "../test/replays/fixture";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};
const account = { id: "account-id", displayName: "Replay Player", avatarUrl: null, avatarId: null, isAdmin: false };

/** Signs the page in to Aegis and gives it a live Drive token, so no Google pop-up is involved. */
async function signIn(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("aegis:locale", "en");
    localStorage.setItem("aegis.drive.linked", "1");
    sessionStorage.setItem(
      "aegis.drive.token",
      JSON.stringify({ token: "e2e-token", expiresAt: Date.now() + 3_600_000 }),
    );
  });
  await page.route("**/auth/me", (route) => route.fulfill({ json: account }));
}

/** The Drive REST API as the browser sees it; the Aegis API never receives these calls. */
async function routeDrive(page: Page, archive: Buffer) {
  const requests: { method: string; path: string; body?: string; authorization?: string }[] = [];
  await page.route("https://www.googleapis.com/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const url = new URL(request.url());
    requests.push({
      method: request.method(),
      path: url.pathname,
      body: request.postData() ?? undefined,
      authorization: request.headers().authorization,
    });
    if (url.searchParams.get("alt") === "media")
      return route.fulfill({ status: 200, headers: CORS, contentType: "application/gzip", body: archive });
    return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: "{}" });
  });
  return requests;
}

function savedReplays(count: number, archive: Buffer): SavedReplay[] {
  const recording = replayFixture();
  return Array.from({ length: count }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    matchId: `${recording.id}-${index}`,
    summary: {
      id: `${recording.id}-${index}`,
      players: recording.players,
      mode: recording.mode,
      startedAt: recording.startedAt,
      finishedAt: recording.finishedAt,
      winnerSeat: recording.winnerSeat,
      frameCount: recording.frameCount,
    },
    viewerSeat: 0,
    bytes: archive.length,
    savedAt: Date.now() - index,
    driveFileId: `driveFile${String(index + 1).padStart(6, "0")}`,
    visibility: "private",
  }));
}

test("pages the account library, plays a replay from Drive, and deletes with an offer to trash", async ({ page }) => {
  const archive = gzipSync(JSON.stringify(replayFixture()));
  let replays = savedReplays(23, archive);
  await signIn(page);
  const drive = await routeDrive(page, archive);
  const listed: string[] = [];
  await page.route("**/account/replays**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "DELETE") {
      const id = url.pathname.split("/").at(-1);
      replays = replays.filter((replay) => replay.id !== id);
      return route.fulfill({ json: { ok: true } });
    }
    const cursor = url.searchParams.get("cursor");
    listed.push(cursor ?? "");
    const start = cursor ? Number(cursor) : 0;
    const end = start + 20;
    return route.fulfill({
      json: {
        replays: replays.slice(start, end),
        sharing: false,
        ...(end < replays.length ? { nextCursor: String(end) } : {}),
      },
    });
  });

  await page.goto("/replays");
  const library = page.getByRole("region", { name: "Saved replays" });
  await expect(library.getByRole("listitem")).toHaveCount(20);
  await expect(page.getByRole("region", { name: "Google Drive" })).toHaveCount(0);
  await library.getByRole("button", { name: "Load more" }).click();
  await expect(library.getByRole("listitem")).toHaveCount(23);
  await expect(library.getByRole("button", { name: "Load more" })).toHaveCount(0);
  expect(listed).toEqual(["", "20"]);
  await expect(library.getByRole("listitem").first().getByRole("link", { name: "Open in Drive" })).toHaveAttribute(
    "href",
    "https://drive.google.com/file/d/driveFile000001/view",
  );

  await library
    .getByRole("listitem")
    .first()
    .getByRole("button", { name: /Watch now/ })
    .click();
  await expect(page.getByRole("heading", { name: "Agumon Player vs Gabumon Player" })).toBeVisible();
  const download = drive.find((request) => request.path === "/drive/v3/files/driveFile000001");
  expect(download).toMatchObject({ method: "GET", authorization: "Bearer e2e-token" });
  const bounds = await page.locator(".replay-player__board").boundingBox();
  expect(bounds!.y).toBe(0);
  expect(bounds!.height).toBe(page.viewportSize()!.height);
  await expect(page.locator(".aegis-topnav")).toHaveCount(0);
  await page.getByRole("button", { name: "Show action history" }).click();
  await expect(page.getByRole("complementary", { name: "Action history" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Back to replays" }).click();

  await expect(library.getByRole("listitem")).toHaveCount(20);
  const first = library.getByRole("listitem").first();
  await first.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Remove this replay from your library?", { exact: true })).toBeVisible();
  await first.getByRole("button", { name: "Cancel", exact: true }).click();
  await first.getByRole("button", { name: "Delete", exact: true }).click();
  await first.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(library.getByRole("listitem")).toHaveCount(19);
  await expect(
    page.getByText("Removed from your library. Also move the file to your Google Drive trash?", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Move to Drive trash" }).click();
  await expect(page.getByText("The file is in your Google Drive trash.", { exact: true })).toBeVisible();
  const trashed = drive.find((request) => request.method === "PATCH");
  expect(trashed).toMatchObject({ path: "/drive/v3/files/driveFile000001", body: '{"trashed":true}' });
});

test("shows both recorded hands on mobile with controls clear of the player's cards", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const replay = replayFixture();
  replay.visibleHandSeats = [0, 1];
  for (const frame of replay.frames) {
    frame.state.players[1]!.hand = frame.state.players[0]!.hand.map((card) => ({
      ...card,
      cardId: "BT1-029",
      ownerSeat: 1,
      instanceId: `opponent-${card.instanceId}`,
    })) as never;
    frame.state.players[1]!.handCount = frame.state.players[1]!.hand.length;
  }
  await page.route("**/auth/me", (route) => route.fulfill({ contentType: "application/json", body: "null" }));
  await page.route("**/account/replays", (route) => route.fulfill({ status: 401 }));
  await page.goto("/replays");
  await page.getByLabel("Open replay file").setInputFiles({
    name: "both-hands.aegis-replay",
    mimeType: "application/gzip",
    buffer: gzipSync(JSON.stringify(replay)),
  });
  const opponent = page.getByTestId("opponent-hand").getByRole("button").first();
  await expect(opponent).toBeVisible();
  await opponent.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const hand = await page.getByTestId("hand").boundingBox();
  const controls = await page.locator(".replay-controls").boundingBox();
  expect(controls!.y + controls!.height).toBeLessThanOrEqual(hand!.y);
  await page.getByTestId("hand").getByRole("button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

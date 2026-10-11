import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function stubGoogle(page: Page, onUpload?: () => void) {
  await page.addInitScript(() => {
    localStorage.setItem("aegis:locale", "en");
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
  await page.route("https://www.googleapis.com/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (value: unknown) =>
      route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(value) });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (url.pathname.startsWith("/upload/")) {
      onUpload?.();
      return json({ id: "drive-file", name: "replay.aegis-replay", webViewLink: "https://drive.google.com/x" });
    }
    if (request.method() === "POST") return json({ id: "aegis-folder" });
    return json({ files: [] });
  });
}

test("explains Google Drive in three steps and connects with the chosen auto-save", async ({ page }) => {
  await stubGoogle(page);
  await page.route("**/auth/me", (route) => route.fulfill({ contentType: "application/json", body: "null" }));
  await page.goto("/profile");

  const card = page.getByRole("region", { name: "Keep your matches in your Drive" });
  await card.getByRole("button", { name: "How it works" }).click();
  const dialog = page.getByRole("dialog", { name: "Your replays in your Google Drive" });
  await expect(dialog.getByRole("button", { name: "Back" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Next" }).click();
  const privacy = page.getByRole("dialog", { name: "Only what Aegis creates" });
  await expect(privacy.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy#google-drive");
  await privacy.getByRole("button", { name: "Next" }).click();
  const devices = page.getByRole("dialog", { name: "On any device" });
  await expect(devices.getByRole("switch", { name: "Save automatically after every match" })).toBeChecked();
  await devices.getByRole("button", { name: "Connect Google Drive" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("aegis.drive.autosave"))).toBe("on");
  expect(await page.evaluate(() => localStorage.getItem("aegis.drive.onboardingSeen"))).toBe("1");
});

test("explains Drive before the first save from the match result, then saves", async ({ page, match }) => {
  let uploads = 0;
  await stubGoogle(page, () => uploads++);
  await match.start("reconnect");
  match.opponent.room.onMessage("replay", () => {});
  match.opponent.room.send("surrender", {});

  await page.getByRole("button", { name: "Sync to Google Drive" }).click();
  const dialog = page.getByRole("dialog", { name: "Your replays in your Google Drive" });
  await dialog.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("switch", { name: "Save automatically after every match" }).click();
  await page.getByRole("button", { name: "Connect Google Drive" }).click();

  await expect(page.getByRole("heading", { name: "Saved to Google Drive" })).toBeVisible();
  expect(uploads).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem("aegis.drive.autosave"))).toBe("off");
});

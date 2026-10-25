import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { startSocialBrowserServer } from "./startSocialBrowserServer";
import { FriendStore } from "../../api/dist/friends/FriendStore.js";

for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`a friend challenge opens the private match at ${width}px in ${dark ? "dark" : "light"} mode`, async ({
      browser,
    }) => {
      const server = await startSocialBrowserServer();
      const contexts = [];
      try {
        const first = await server.accounts.accountForIdentity("email", "host@test.invalid", "Challenge Host");
        const second = await server.accounts.accountForIdentity("email", "guest@test.invalid", "Challenge Guest");
        const friends = new FriendStore(server.accounts);
        await friends.request({ accountId: first.id, displayName: second.displayName });
        await friends.accept({ accountId: second.id, otherId: first.id });
        const players = [];
        for (const account of [first, second]) {
          const session = await server.accounts.issueSession(account);
          const context = await browser.newContext({ viewport: { width, height: 1000 } });
          contexts.push(context);
          await context.addCookies([{ name: "aegis_session", value: session.id, domain: "127.0.0.1", path: "/" }]);
          await context.addInitScript((darkMode) => {
            localStorage.setItem("aegis:locale", "en");
            localStorage.setItem("aegis:darkMode", String(darkMode));
          }, dark);
          const page = await context.newPage();
          await page.goto(`http://127.0.0.1:${process.env.AEGIS_E2E_WEB_PORT ?? 4175}/friends`);
          await expect(page.getByText("Connected to friends", { exact: true })).toBeVisible();
          players.push(page);
        }
        const [host, guest] = players;
        await expect(host.getByText("Online", { exact: true })).toBeVisible();
        await host.screenshot({
          path: fileURLToPath(
            new URL(
              `../../../.local/validation/phase2-friends-${width}-${dark ? "dark" : "light"}.png`,
              import.meta.url,
            ),
          ),
        });
        await host.getByRole("button", { name: "Challenge", exact: true }).click();
        await expect(host.getByRole("status").filter({ hasText: "Challenge Challenge Guest" })).toBeVisible();
        await host.getByRole("button", { name: /^create room$/i }).click();
        await expect(guest.getByText("Challenge Host invited you to a match", { exact: true })).toBeVisible();
        await guest.screenshot({
          path: fileURLToPath(
            new URL(
              `../../../.local/validation/phase2-invite-${width}-${dark ? "dark" : "light"}.png`,
              import.meta.url,
            ),
          ),
        });
        expect(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await guest.getByRole("button", { name: "Join match", exact: true }).click();
        await expect(host).toHaveURL(/\/play\/game$/);
        await expect(guest).toHaveURL(/\/play\/game$/);
        await expect(guest.getByRole("button", { name: "Challenge Host", exact: true })).toBeVisible();
        await expect(host.getByRole("button", { name: "Challenge Guest", exact: true })).toBeVisible();
      } finally {
        for (const context of contexts) {
          await context.close();
        }
        await server.close();
      }
    });
  }
}

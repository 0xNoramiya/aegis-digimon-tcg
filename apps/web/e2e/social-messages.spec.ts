import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { startSocialBrowserServer } from "./startSocialBrowserServer";
import { closeFriendshipFixture } from "./closeFriendshipFixture.js";
import { FriendStore } from "../../api/dist/friends/FriendStore.js";

const evidence =
  process.env.AEGIS_SEALED_EVIDENCE_DIR ?? fileURLToPath(new URL("../../../.local/validation", import.meta.url));

for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`friends exchange and report private messages at ${width}px in ${dark ? "dark" : "light"} mode`, async ({
      browser,
    }) => {
      const server = await startSocialBrowserServer();
      const contexts = [];
      const videoOutputs: { actor: string; path: string }[] = [];
      const errors: unknown[] = [];
      try {
        const first = await server.accounts.accountForIdentity("email", "sender@test.invalid", "Message Sender");
        const second = await server.accounts.accountForIdentity("email", "recipient@test.invalid", "Message Recipient");
        const friends = new FriendStore(server.accounts);
        await friends.request({ accountId: first.id, displayName: second.displayName });
        await friends.accept({ accountId: second.id, otherId: first.id });
        const pages = [];
        for (const account of [first, second]) {
          const session = await server.accounts.issueSession(account);
          const context = await browser.newContext({
            viewport: { width, height: 1000 },
            recordVideo:
              width === 1440 && !dark
                ? {
                    dir: `${evidence}/videos/`,
                    size: { width, height: 1000 },
                  }
                : undefined,
          });
          contexts.push(context);
          await context.addCookies([{ name: "aegis_session", value: session.id, domain: "127.0.0.1", path: "/" }]);
          await context.addInitScript((darkMode) => {
            localStorage.setItem("aegis:locale", "en");
            localStorage.setItem("aegis:darkMode", String(darkMode));
          }, dark);
          const page = await context.newPage();
          if (process.env.AEGIS_SEALED_EVIDENCE_DIR && width === 1440 && !dark) {
            const video = page.video();
            if (!video) {
              throw new Error("Expected the authored manual context recording");
            }
            videoOutputs.push({ actor: account.displayName, path: await video.path() });
          }
          await page.goto("/friends");
          await expect(page.getByRole("main").getByText("Connected to friends", { exact: true })).toBeVisible();
          await page
            .getByRole("main")
            .getByRole("region", { name: "Friends", exact: true })
            .getByRole("listitem")
            .filter({
              has: page.getByText(account.id === first.id ? second.displayName : first.displayName, { exact: true }),
            })
            .getByRole("button", { name: "Message", exact: true })
            .click();
          pages.push(page);
        }
        const [sender, recipient] = pages;
        if (pages.length !== 2 || !sender || !recipient) {
          throw new Error("Expected both messaging players to be initialized");
        }
        const senderConversation = sender.getByRole("region", {
          name: "Message Recipient",
          exact: true,
        });
        const recipientConversation = recipient.getByRole("region", {
          name: "Message Sender",
          exact: true,
        });
        await senderConversation
          .getByRole("textbox", { name: "Message", exact: true })
          .fill("Ready to test our decks?");
        await senderConversation.getByRole("button", { name: "Send", exact: true }).click();
        await expect(recipientConversation.getByText("Ready to test our decks?", { exact: true })).toBeVisible();
        await expect(senderConversation.getByText("Read", { exact: true })).toBeVisible();
        await recipientConversation.getByRole("textbox", { name: "Message", exact: true }).fill("Yes, let's play!");
        await recipientConversation.getByRole("button", { name: "Send", exact: true }).click();
        await expect(senderConversation.getByText("Yes, let's play!", { exact: true })).toBeVisible();
        await recipientConversation.getByRole("button", { name: "Report", exact: true }).click();
        await expect(recipientConversation.getByRole("button", { name: "Reported", exact: true })).toBeDisabled();
        const report = (await server.accounts.pool.query("SELECT github_status FROM feedback_reports")).rows;
        expect(report).toEqual([{ github_status: "disabled" }]);
        expect(await recipient.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await senderConversation.getByRole("textbox", { name: "Message", exact: true }).fill("Next match?");
        await senderConversation.getByRole("button", { name: "Friend details", exact: true }).click();
        const profile = sender.getByRole("dialog", { name: "Friend details", exact: true });
        await expect(profile.getByRole("heading", { name: "Message Recipient", exact: true })).toBeVisible();
        await sender.screenshot({
          path: `${evidence}/profile-${width}-${dark ? "dark" : "light"}.png`,
        });
        await sender.keyboard.press("Escape");
        await expect(senderConversation.getByRole("textbox", { name: "Message", exact: true })).toHaveValue(
          "Next match?",
        );
        await senderConversation.getByRole("textbox", { name: "Message", exact: true }).fill("");
        await sender.screenshot({
          path: `${evidence}/messages-${width}-${dark ? "dark" : "light"}.png`,
        });
        await recipientConversation.getByRole("button", { name: "Close", exact: true }).click();
        await recipient
          .getByRole("main")
          .getByRole("region", { name: "Friends", exact: true })
          .getByRole("listitem")
          .filter({ has: recipient.getByText("Message Sender", { exact: true }) })
          .getByLabel("More actions for Message Sender", { exact: true })
          .click();
        await recipient.getByRole("menu").getByRole("menuitem", { name: "Block player", exact: true }).click();
        await expect(senderConversation.getByText("This conversation is unavailable.", { exact: true })).toBeVisible();
        await expect(senderConversation.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
      } catch (error) {
        errors.push(error);
      } finally {
        await closeFriendshipFixture({ contexts, server: undefined, database: server, errors });
        if (process.env.AEGIS_SEALED_EVIDENCE_DIR && width === 1440 && !dark) {
          writeFileSync(
            `${evidence}/social-messages-video-paths.json`,
            JSON.stringify({
              owner: "apps/web/e2e/social-messages.spec.ts",
              recordVideo: { width, dark, size: { width, height: 1000 } },
              outputs: videoOutputs,
            }),
          );
        }
      }
    });
  }
}

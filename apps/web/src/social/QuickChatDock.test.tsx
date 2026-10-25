import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { QuickChatDock } from "@/messages/QuickChatDock";
import { useQuickChatState } from "@/messages/useQuickChatState";
import { SocialContext } from "@/social/SocialContext";
import type { SocialConnection } from "@/social/SocialConnection";

vi.mock("@/account/client", () => ({ request: async () => ({ messages: [] }) }));
const friend = {
  accountId: "friend",
  displayName: "Friend",
  avatarId: null,
  avatarUrl: null,
  since: 1,
  status: "online" as const,
};
type QuickChatHarnessParams = { social: SocialConnection };
function QuickChatHarness({ social }: QuickChatHarnessParams) {
  const chat = useQuickChatState({ accountId: social.accountId });
  return (
    <I18nProvider>
      <SocialContext value={{ ...social, quickChat: chat }}>
        <button onClick={() => chat.openChat(friend)}>Open from another screen</button>
        <QuickChatDock />
      </SocialContext>
    </I18nProvider>
  );
}
function buildSocial(): SocialConnection {
  return {
    accountId: "me",
    connected: true,
    friends: [friend],
    invites: [],
    revision: 0,
    unreadMessages: 2,
    messages: [],
    dismissNotice: () => {},
    invite: () => {},
    answer: () => {},
    refresh: () => {},
    readMessages: vi.fn<(friendId: string) => void>(),
  };
}
beforeEach(() => {
  localStorage.setItem("aegis:locale", "en");
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("opens a conversation from the launcher and preserves its draft when minimized", async () => {
  render(<QuickChatHarness social={buildSocial()} />);
  fireEvent.click(screen.getByRole("button", { name: "Open quick chat, 2 unread messages" }));
  expect(document.activeElement).toBe(screen.getByRole("searchbox", { name: "Find a player" }));
  fireEvent.click(screen.getByRole("button", { name: "Chat with Friend" }));
  const input = await screen.findByRole("textbox", { name: "Message" });
  fireEvent.change(input, { target: { value: "Ready for another match?" } });
  fireEvent.click(screen.getByRole("button", { name: "Minimize chat" }));
  expect(screen.queryByRole("textbox", { name: "Message" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open quick chat, 2 unread messages" }));
  expect((screen.getByRole("textbox", { name: "Message" }) as HTMLInputElement).value).toBe("Ready for another match?");
  fireEvent.click(screen.getByRole("button", { name: "Back to friends" }));
  expect(document.activeElement).toBe(screen.getByRole("searchbox", { name: "Find a player" }));
  fireEvent.click(screen.getByRole("button", { name: "Chat with Friend" }));
  expect((screen.getByRole("textbox", { name: "Message" }) as HTMLInputElement).value).toBe("Ready for another match?");
});

it("does not mark a newly received message as read while the dock is minimized", async () => {
  const social = buildSocial();
  const view = render(<QuickChatHarness social={social} />);
  fireEvent.click(screen.getByRole("button", { name: "Open from another screen" }));
  await screen.findByRole("textbox", { name: "Message" });
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Minimize chat" }));
  vi.mocked(social.readMessages!).mockClear();
  view.rerender(
    <QuickChatHarness
      social={{
        ...social,
        messages: [
          { id: "incoming", senderId: "friend", recipientId: "me", body: "Hello", createdAt: 1, readAt: null },
        ],
      }}
    />,
  );
  expect(social.readMessages).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Open quick chat, 2 unread messages" }));
  await waitFor(() => expect(social.readMessages).toHaveBeenCalledWith("friend"));
});

it("discards the previous account conversation when the signed-in account changes", async () => {
  const social = buildSocial();
  const view = render(<QuickChatHarness social={social} />);
  fireEvent.click(screen.getByRole("button", { name: "Open from another screen" }));
  await screen.findByRole("textbox", { name: "Message" });
  view.rerender(<QuickChatHarness social={{ ...social, accountId: "other-account" }} />);
  expect(screen.queryByRole("textbox", { name: "Message" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Friend details" })).toBeNull();
  view.rerender(<QuickChatHarness social={{ ...social, accountId: undefined }} />);
  expect(screen.queryByLabelText("Quick chat")).toBeNull();
});

it("minimizes on Escape and restores focus to the launcher", async () => {
  render(<QuickChatHarness social={buildSocial()} />);
  fireEvent.click(screen.getByRole("button", { name: "Open from another screen" }));
  const input = await screen.findByRole("textbox", { name: "Message" });
  fireEvent.keyDown(input, { key: "Escape" });
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open quick chat, 2 unread messages" }));
});

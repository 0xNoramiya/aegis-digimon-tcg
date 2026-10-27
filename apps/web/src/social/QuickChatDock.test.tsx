import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { QuickChatDock } from "@/messages/QuickChatDock";
import { useQuickChatState } from "@/messages/useQuickChatState";
import { SocialContext } from "@/social/SocialContext";
import type { SocialConnection } from "@/social/SocialConnection";

const { request } = vi.hoisted(() => ({ request: vi.fn<(path: string, options?: RequestInit) => Promise<unknown>>() }));
vi.mock("@/account/client", () => ({ request, accountApi: { matches: () => request("/account/matches") } }));
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
  request.mockReset();
  request.mockImplementation(async (path: string) => {
    if (path === "/friends") {
      return { friends: [friend] };
    }
    if (path === "/friends/requests") {
      return { requests: [] };
    }
    if (path === "/account/blocks") {
      return { blocks: [] };
    }
    return { messages: [] };
  });
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
  fireEvent.click(await screen.findByRole("button", { name: "Chat with Friend" }));
  const input = await screen.findByRole("textbox", { name: "Message" });
  fireEvent.change(input, { target: { value: "Ready for another match?" } });
  fireEvent.click(screen.getByRole("button", { name: "Minimize chat" }));
  expect(screen.queryByRole("textbox", { name: "Message" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open quick chat, 2 unread messages" }));
  expect((screen.getByRole("textbox", { name: "Message" }) as HTMLInputElement).value).toBe("Ready for another match?");
  fireEvent.click(screen.getByRole("button", { name: "Back to friends" }));
  expect(document.activeElement).toBe(screen.getByRole("searchbox", { name: "Find a player" }));
  fireEvent.click(await screen.findByRole("button", { name: "Chat with Friend" }));
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

it("provides friend management, requests and blocks without leaving the floating dock", async () => {
  const social = {
    ...buildSocial(),
    challenge: vi.fn<(friend: unknown) => void>(),
    watch: vi.fn<(friend: unknown) => void>(),
  };
  social.friends = [{ ...friend, roomCode: "ROOM" }];
  request.mockImplementation(async (path: string, options?: RequestInit) => {
    if (!options && path === "/friends") {
      return { friends: [friend] };
    }
    if (!options && path === "/friends/requests") {
      return {
        requests: [
          { ...friend, accountId: "incoming", displayName: "Incoming", direction: "incoming" },
          { ...friend, accountId: "outgoing", displayName: "Outgoing", direction: "outgoing" },
        ],
      };
    }
    if (path === "/account/blocks") {
      return { blocks: [{ ...friend, accountId: "blocked", displayName: "Blocked" }] };
    }
    if (path === "/account/matches") {
      return { matches: [{ id: "match", opponentName: "Rival", canAddOpponent: true }] };
    }
    return { accepted: false };
  });
  render(<QuickChatHarness social={social} />);
  fireEvent.click(screen.getByRole("button", { name: "Open quick chat, 2 unread messages" }));
  fireEvent.click(await screen.findByRole("button", { name: "Watch" }));
  expect(social.watch).toHaveBeenCalledWith(social.friends[0]);
  fireEvent.keyDown(screen.getByLabelText("More actions for Friend"), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("menuitem", { name: "Challenge" }));
  expect(social.challenge).toHaveBeenCalledWith(friend);
  fireEvent.click(screen.getByRole("button", { name: "Add friend" }));
  const dialog = await screen.findByRole("dialog", { name: "Add friend" });
  expect(await within(dialog).findByText("Rival")).toBeTruthy();
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Player display name" }), {
    target: { value: "New friend" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Send request" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("/friends/requests", {
      method: "POST",
      body: JSON.stringify({ displayName: "New friend" }),
    }),
  );
  expect(await within(dialog).findByText("Request sent")).toBeTruthy();
  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog", { name: "Add friend" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Requests/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
  await waitFor(() => expect(request).toHaveBeenCalledWith("/friends/requests/incoming/accept", { method: "POST" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Decline" }).hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Decline" }));
  await waitFor(() => expect(request).toHaveBeenCalledWith("/friends/requests/incoming/decline", { method: "POST" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Cancel request" }).hasAttribute("disabled")).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel request" }));
  await waitFor(() => expect(request).toHaveBeenCalledWith("/friends/requests/outgoing", { method: "DELETE" }));
  fireEvent.click(screen.getByRole("button", { name: /Blocked/ }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Unblock" }).hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Unblock" }));
  await waitFor(() => expect(request).toHaveBeenCalledWith("/account/blocks/blocked", { method: "DELETE" }));
  fireEvent.click(screen.getByRole("button", { name: /^Friends \d/ }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Watch" }).hasAttribute("disabled")).toBe(false));
  fireEvent.keyDown(screen.getByLabelText("More actions for Friend"), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("menuitem", { name: "Remove friend" }));
  const confirmation = await screen.findByRole("dialog", { name: "Remove Friend?" });
  expect(request).not.toHaveBeenCalledWith("/friends/friend", { method: "DELETE" });
  fireEvent.click(within(confirmation).getByRole("button", { name: "Remove friend" }));
  await waitFor(() => expect(request).toHaveBeenCalledWith("/friends/friend", { method: "DELETE" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Watch" }).hasAttribute("disabled")).toBe(false));
  fireEvent.keyDown(screen.getByLabelText("More actions for Friend"), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("menuitem", { name: "Block player" }));
  await waitFor(() => expect(request).toHaveBeenCalledWith("/account/blocks/friend", { method: "PUT" }));
});

it("offers challenge from the conversation header and switches to watch while the friend is in a match", async () => {
  const social = {
    ...buildSocial(),
    challenge: vi.fn<(friend: unknown) => void>(),
    watch: vi.fn<(friend: unknown) => void>(),
  };
  const view = render(<QuickChatHarness social={social} />);
  fireEvent.click(screen.getByRole("button", { name: "Open from another screen" }));
  await screen.findByRole("textbox", { name: "Message" });
  fireEvent.click(screen.getByRole("button", { name: "Challenge" }));
  expect(social.challenge).toHaveBeenCalledWith(friend);
  const watched = { ...friend, status: "in_match" as const, roomCode: "ROOM" };
  view.rerender(<QuickChatHarness social={{ ...social, friends: [watched] }} />);
  expect(screen.queryByRole("button", { name: "Challenge" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Watch" }));
  expect(social.watch).toHaveBeenCalledWith(watched);
});

it("shows the unread count and last message on each conversation instead of a global line", async () => {
  const social = {
    ...buildSocial(),
    conversations: [
      {
        friendId: "friend",
        unread: 2,
        lastMessage: { id: "m", senderId: "friend", recipientId: "me", body: "Rematch?", createdAt: 1, readAt: null },
      },
    ],
  };
  render(<QuickChatHarness social={social} />);
  fireEvent.click(screen.getByRole("button", { name: "Open quick chat, 2 unread messages" }));
  const row = await screen.findByRole("button", { name: "Chat with Friend" });
  expect(row.textContent).toContain("Online · Rematch?");
  expect(row.textContent).toContain("2 unread");
  expect(screen.queryByText(/Unread messages/)).toBeNull();
});

function enableMobileViewport() {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn<() => void>(),
    removeEventListener: vi.fn<() => void>(),
  }));
}

it("opens the mobile sheet without focusing search and closes it from the backdrop", async () => {
  enableMobileViewport();
  render(<QuickChatHarness social={buildSocial()} />);
  fireEvent.click(screen.getByRole("button", { name: "Open quick chat, 2 unread messages" }));
  const dialog = screen.getByRole("dialog", { name: "Quick chat" });
  expect(document.activeElement).toBe(dialog);
  expect(document.body.style.overflow).toBe("hidden");
  expect(document.activeElement).not.toBe(screen.getByRole("searchbox", { name: "Find a player" }));
  fireEvent.click(await screen.findByRole("button", { name: "Chat with Friend" }));
  const input = await screen.findByRole("textbox", { name: "Message" });
  fireEvent.change(input, { target: { value: "Mobile draft" } });
  const back = screen.getByRole("button", { name: "Back to friends" });
  back.focus();
  fireEvent.click(back);
  expect(document.activeElement).toBe(dialog);
  fireEvent.click(document.querySelector(".quick-chat-backdrop")!);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.body.style.overflow).toBe("");
});

it("drags the mobile launcher within the viewport without opening the chat on release", () => {
  enableMobileViewport();
  class TestPointerEvent extends MouseEvent {
    pointerId = 1;
    isPrimary = true;
  }
  vi.stubGlobal("PointerEvent", TestPointerEvent);
  render(<QuickChatHarness social={buildSocial()} />);
  const launcher = screen.getByRole("button", { name: "Open quick chat, 2 unread messages" });
  launcher.setPointerCapture = vi.fn<(pointerId: number) => void>();
  launcher.hasPointerCapture = () => true;
  launcher.releasePointerCapture = vi.fn<(pointerId: number) => void>();
  fireEvent.pointerDown(launcher, { clientX: 20, clientY: 20, button: 0 });
  fireEvent.pointerMove(launcher, { clientX: -100, clientY: 10000 });
  fireEvent.pointerUp(launcher);
  fireEvent.click(launcher, { detail: 1 });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(launcher.style.left).toBe("16px");
  expect(Number.parseFloat(launcher.style.top)).toBeLessThan(window.innerHeight - 48);
  fireEvent.pointerDown(launcher, { clientX: 20, clientY: 20, button: 0 });
  fireEvent.pointerUp(launcher);
  fireEvent.click(launcher, { detail: 1 });
  expect(screen.getByRole("dialog", { name: "Quick chat" })).toBeTruthy();
});

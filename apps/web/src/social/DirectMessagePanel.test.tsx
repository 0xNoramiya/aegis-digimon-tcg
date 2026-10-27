import { I18nProvider } from "@/i18n/I18nProvider";
import { act, fireEvent, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DirectMessagePanel } from "@/messages/DirectMessagePanel";
import { SocialContext } from "@/social/SocialContext";
import type { SocialConnection } from "@/social/SocialConnection";
import type { DirectMessage } from "@aegis/shared/messages/DirectMessage";

const api = vi.hoisted(() => ({ request: vi.fn<() => Promise<{ messages: DirectMessage[] }>>() }));
vi.mock("@/account/client", () => ({ request: api.request }));
const friend = { accountId: "friend", displayName: "Friend", avatarId: null, avatarUrl: null, since: 1 };
const message: DirectMessage = {
  id: "message",
  senderId: "friend",
  recipientId: "me",
  body: "Arrived live",
  createdAt: 1,
  readAt: null,
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("keeps messages that arrive while the initial history request is pending", async () => {
  let finish!: (page: { messages: DirectMessage[] }) => void;
  api.request.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  Element.prototype.scrollIntoView = vi.fn<() => void>();
  const connection: SocialConnection = {
    accountId: "me",
    connected: true,
    friends: [{ ...friend, status: "online" }],
    invites: [],
    revision: 0,
    dismissNotice: () => {},
    invite: () => {},
    answer: () => {},
    refresh: () => {},
    messages: [],
  };
  const view = render(
    <I18nProvider>
      <SocialContext value={connection}>
        <DirectMessagePanel friend={friend} onClose={() => {}} />
      </SocialContext>
    </I18nProvider>,
  );
  view.rerender(
    <I18nProvider>
      <SocialContext value={{ ...connection, messages: [message] }}>
        <DirectMessagePanel friend={friend} onClose={() => {}} />
      </SocialContext>
    </I18nProvider>,
  );
  await act(async () => finish({ messages: [] }));
  await waitFor(() => expect(screen.getByText("Arrived live")).toBeTruthy());
});

it("applies live read receipts to messages loaded from history", async () => {
  api.request.mockResolvedValue({ messages: [{ ...message, senderId: "me", recipientId: "friend" }] });
  Element.prototype.scrollIntoView = vi.fn<() => void>();
  const connection: SocialConnection = {
    accountId: "me",
    connected: true,
    friends: [{ ...friend, status: "online" }],
    invites: [],
    revision: 0,
    dismissNotice: () => {},
    invite: () => {},
    answer: () => {},
    refresh: () => {},
    messages: [],
  };
  const view = render(
    <I18nProvider>
      <SocialContext value={connection}>
        <DirectMessagePanel friend={friend} onClose={() => {}} />
      </SocialContext>
    </I18nProvider>,
  );
  await screen.findByText("Arrived live");
  view.rerender(
    <I18nProvider>
      <SocialContext value={{ ...connection, messageReceipts: [{ accountId: "friend", friendId: "me", at: 2 }] }}>
        <DirectMessagePanel friend={friend} onClose={() => {}} />
      </SocialContext>
    </I18nProvider>,
  );
  expect(await screen.findByText(/Lida|Read|Leído/)).toBeTruthy();
});

it("preserves the draft when another tab sends and the current send is rejected", async () => {
  api.request.mockResolvedValue({ messages: [] });
  const connection: SocialConnection = {
    accountId: "me",
    connected: true,
    friends: [{ ...friend, status: "online" }],
    invites: [],
    revision: 0,
    dismissNotice: () => {},
    invite: () => {},
    answer: () => {},
    refresh: () => {},
    messages: [],
    sendMessage: () => "request-current",
  };
  const view = render(
    <I18nProvider>
      <SocialContext value={connection}>
        <DirectMessagePanel friend={friend} onClose={() => {}} />
      </SocialContext>
    </I18nProvider>,
  );
  const input = await screen.findByRole("textbox");
  fireEvent.change(input, { target: { value: "Keep my draft" } });
  fireEvent.submit(input.closest("form")!);
  view.rerender(
    <I18nProvider>
      <SocialContext
        value={{
          ...connection,
          messages: [{ ...message, senderId: "me", recipientId: "friend", body: "Other tab" }],
          messageAcknowledgment: { requestId: "request-current", delivered: false },
        }}
      >
        <DirectMessagePanel friend={friend} onClose={() => {}} />
      </SocialContext>
    </I18nProvider>,
  );
  expect((input as HTMLInputElement).value).toBe("Keep my draft");
});

it("closes the nested friend detail without closing the mobile conversation", async () => {
  api.request.mockResolvedValue({ messages: [] });
  const close = vi.fn<() => void>();
  const connection: SocialConnection = {
    accountId: "me",
    connected: true,
    friends: [{ ...friend, status: "online" }],
    invites: [],
    revision: 0,
    dismissNotice: () => {},
    invite: () => {},
    answer: () => {},
    refresh: () => {},
    messages: [],
  };
  render(
    <I18nProvider>
      <SocialContext value={connection}>
        <DirectMessagePanel friend={friend} onClose={close} />
      </SocialContext>
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Friend details|Detalhes do amigo/ }));
  const dialogs = screen.getAllByRole("dialog");
  fireEvent.keyDown(dialogs[dialogs.length - 1]!, { key: "Escape" });
  expect(close).not.toHaveBeenCalled();
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { AccountPanel } from "./AccountPanel";
import { AccountApiError, accountApi } from "./client";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AccountPanel", () => {
  it("only invites a signed-out player to sign in", () => {
    render(
      <I18nProvider>
        <AccountPanel account={null} />
      </I18nProvider>,
    );
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.getByRole("button", { name: "Sign in with Discord" })).toBeTruthy();
  });
});

describe("AccountPanel magic link", () => {
  it("tells the player when today's sign-in email limit is reached", async () => {
    vi.spyOn(accountApi, "magicLink").mockRejectedValue(new AccountApiError(429, "email_daily_limit"));

    render(
      <I18nProvider>
        <AccountPanel account={null} />
      </I18nProvider>,
    );
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "tamer@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send magic link" }));

    expect(await screen.findByText(/today's sign-in email limit/)).toBeTruthy();
    expect(screen.queryByText("Check your email to sign in.")).toBeNull();
  });
});

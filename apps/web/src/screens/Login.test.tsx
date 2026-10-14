// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { AccountApiError, accountApi } from "../account/client";
import { Login } from "./Login";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the sign-in screen", () => {
  it("sends the player to the Discord authorization endpoint", () => {
    const assigned: string[] = [];
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        get href() {
          return assigned[assigned.length - 1] ?? "";
        },
        set href(value: string) {
          assigned.push(value);
        },
      },
    });

    render(
      <I18nProvider>
        <Login onBack={() => undefined} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue with Discord" }));

    expect(assigned).toEqual([`${accountApi.base}/auth/discord`]);
    expect(screen.getByText("Opening Discord…")).toBeTruthy();
  });

  it("keeps playing without an account one click away", () => {
    const onBack = vi.fn<() => void>();
    render(
      <I18nProvider>
        <Login onBack={onBack} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue as guest" }));
    expect(onBack).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Back to home" }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it("emails a magic link to players who sign in without Discord", async () => {
    const magicLink = vi.spyOn(accountApi, "magicLink").mockResolvedValue({ ok: true });
    render(
      <I18nProvider>
        <Login onBack={() => undefined} />
      </I18nProvider>,
    );

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "player@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send magic link" }));

    expect(
      await screen.findByText("Check your email to sign in. If it isn't in your inbox, look in Spam or Junk."),
    ).toBeTruthy();
    expect(magicLink).toHaveBeenCalledWith("player@example.com");
  });

  it.each([
    ["email_daily_limit", "We reached today's sign-in email limit. Sign in with Discord, or try again tomorrow."],
    ["too_many_requests", "Too many sign-in emails requested. Wait a few minutes, or sign in with Discord."],
    ["human_check_failed", "Could not confirm you are human. Complete the check and try again."],
  ])("explains a refused magic link (%s) instead of failing silently", async (code, message) => {
    vi.spyOn(accountApi, "magicLink").mockRejectedValue(new AccountApiError(429, code));
    render(
      <I18nProvider>
        <Login onBack={() => undefined} />
      </I18nProvider>,
    );

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "player@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send magic link" }));

    expect(await screen.findByText(message)).toBeTruthy();
    expect(
      screen.queryByText("Check your email to sign in. If it isn't in your inbox, look in Spam or Junk."),
    ).toBeNull();
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { RankedQueueNotes } from "./RankedQueueNotes";

afterEach(cleanup);

describe("ranked queue notes", () => {
  it("opens settings when a signed-out player chooses to sign in", () => {
    const onOpenSettings = vi.fn<() => void>();
    render(
      <I18nProvider>
        <RankedQueueNotes
          ranked={false}
          signedIn={false}
          rankedDisabled={false}
          signInRequired={false}
          onOpenSettings={onOpenSettings}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign in to enable ranked" }));

    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it("shows nothing for a signed-in casual player", () => {
    const { container } = render(
      <I18nProvider>
        <RankedQueueNotes
          ranked={false}
          signedIn
          rankedDisabled={false}
          signInRequired={false}
          onOpenSettings={() => undefined}
        />
      </I18nProvider>,
    );

    expect(container.textContent).toBe("");
  });
});

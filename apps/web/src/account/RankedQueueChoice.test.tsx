// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { RankedQueueChoice } from "./RankedQueueChoice";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("ranked sign-in prompt", () => {
  it("opens settings when an unauthenticated player chooses to sign in", () => {
    const onOpenSettings = vi.fn<() => void>();

    render(
      <I18nProvider>
        <RankedQueueChoice
          ranked={false}
          signedIn={false}
          onOpenSettings={onOpenSettings}
          onRankedChange={() => undefined}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign in to enable ranked" }));

    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});

describe("explicit queue selection", () => {
  it("offers Ranked to a signed-in player without selecting it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<() => Promise<Response>>(
        async () =>
          new Response(JSON.stringify({ enabled: true, formats: ["standard"] }), {
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    const onRankedChange = vi.fn<(ranked: boolean) => void>();
    render(
      <I18nProvider>
        <RankedQueueChoice ranked={false} signedIn onOpenSettings={() => undefined} onRankedChange={onRankedChange} />
      </I18nProvider>,
    );
    const ranked = await screen.findByRole("radio", { name: /^Ranked/ });
    await waitFor(() => expect((ranked as HTMLInputElement).disabled).toBe(false));
    expect((screen.getByRole("radio", { name: /^Casual/ }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(ranked);
    expect(onRankedChange).toHaveBeenCalledWith(true);
  });
});

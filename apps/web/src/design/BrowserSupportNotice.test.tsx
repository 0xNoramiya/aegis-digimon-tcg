// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { BrowserSupportNotice, browserLacksColorMix } from "./BrowserSupportNotice";

describe("BrowserSupportNotice", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("detects a browser without color-mix()", () => {
    expect(browserLacksColorMix({ supports: () => false })).toBe(true);
    expect(browserLacksColorMix({ supports: () => true })).toBe(false);
    expect(browserLacksColorMix(undefined)).toBe(false);
  });

  it("warns only when color-mix() is missing", () => {
    vi.stubGlobal("CSS", { supports: () => false });
    render(
      <I18nProvider>
        <BrowserSupportNotice />
      </I18nProvider>,
    );
    expect(screen.getByRole("alert").textContent).toMatch(/Safari 16\.4/);

    cleanup();
    vi.stubGlobal("CSS", { supports: () => true });
    render(
      <I18nProvider>
        <BrowserSupportNotice />
      </I18nProvider>,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

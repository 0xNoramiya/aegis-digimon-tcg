// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Settings } from "./Settings";
import { I18nProvider } from "../i18n";
import { arePileCountsShown, setPileCountsShown } from "../design/pileCounts";
import { isKeepAwakeEnabled, setKeepAwakeEnabled } from "../design/keepAwake";

const player = { name: "Guest Tamer", color: "Blue", shards: 0, guestAvatarId: null };

describe("settings layout", () => {
  afterEach(() => cleanup());

  it("links every section from the section navigation", () => {
    render(
      <I18nProvider>
        <Settings player={player} account={null} dark={false} onToggleDark={() => undefined} />
      </I18nProvider>,
    );

    const navigation = screen.getByRole("navigation", { name: "Preferences sections" });
    const links = within(navigation).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Appearance",
      "Language & text",
      "Card sleeves",
      "Sound & music",
      "Gameplay",
      "Arena",
    ]);
    for (const link of links) {
      const target = document.getElementById(link.getAttribute("href")!.slice(1));
      expect(target?.tagName).toBe("SECTION");
    }
    expect(links[0]!.getAttribute("aria-current")).toBe("location");
    expect(screen.queryByRole("link", { name: /Customize/ })).toBeNull();
  });

  it("toggles dark mode from a switch", () => {
    const onToggleDark = vi.fn<(dark: boolean) => void>();
    render(
      <I18nProvider>
        <Settings player={player} account={null} dark={false} onToggleDark={onToggleDark} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("switch", { name: /Dark mode/ }));

    expect(onToggleDark).toHaveBeenCalledWith(true);
  });

  it("opens on the sound section when the music menu asks for it", () => {
    const scrollTo = vi.fn<(options?: ScrollToOptions) => void>();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: scrollTo });
    render(
      <I18nProvider>
        <Settings
          player={player}
          account={null}
          dark={false}
          onToggleDark={() => undefined}
          initialSectionId="settings-sound"
        />
      </I18nProvider>,
    );

    expect(document.activeElement).toBe(screen.getByRole("region", { name: "Sound & music" }));
    expect(scrollTo).toHaveBeenCalledOnce();
    Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
  });
});

describe("settings effect speed", () => {
  afterEach(() => {
    cleanup();
    vi.doUnmock("../features");
    vi.resetModules();
  });

  async function renderSettings() {
    const { Settings: FreshSettings } = await import("./Settings");
    const { I18nProvider: FreshProvider } = await import("../i18n");
    const pacing = await import("../game/pacing");
    render(
      <FreshProvider>
        <FreshSettings player={player} account={null} dark={false} onToggleDark={() => undefined} />
      </FreshProvider>,
    );
    return pacing;
  }

  it("stays hidden while sequential pacing is off", async () => {
    vi.resetModules();
    vi.doMock("../features", () => ({ RANKED_ENABLED: false, SEQUENTIAL_PACING_ENABLED: false }));
    await renderSettings();
    expect(screen.queryByRole("group", { name: "Effect speed" })).toBeNull();
  });

  it("sets the effect speed when sequential pacing is on", async () => {
    vi.resetModules();
    vi.doMock("../features", () => ({ RANKED_ENABLED: false, SEQUENTIAL_PACING_ENABLED: true }));
    const pacing = await renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Fast" }));
    expect(pacing.getEffectSpeed()).toBe("fast");
    expect(screen.getByRole("button", { name: "Fast" }).getAttribute("aria-pressed")).toBe("true");
    pacing.setEffectSpeed("normal");
  });
});

describe("settings pile counts", () => {
  afterEach(() => {
    cleanup();
    setPileCountsShown(false);
    localStorage.clear();
  });

  it("starts off and stores the player's choice", () => {
    render(
      <I18nProvider>
        <Settings player={player} account={null} dark={false} onToggleDark={() => undefined} />
      </I18nProvider>,
    );
    const toggle = screen.getByRole("switch", { name: /Show pile counts/ });
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(arePileCountsShown()).toBe(true);
    expect(localStorage.getItem("aegis.pile-counts")).toBe("shown");
  });
});

describe("settings keep awake", () => {
  afterEach(() => {
    cleanup();
    setKeepAwakeEnabled(true);
    localStorage.clear();
  });

  it("starts on and stores the player's choice", () => {
    render(
      <I18nProvider>
        <Settings player={player} account={null} dark={false} onToggleDark={() => undefined} />
      </I18nProvider>,
    );
    const toggle = screen.getByRole("switch", { name: /Keep the screen awake/ });
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(isKeepAwakeEnabled()).toBe(false);
    expect(localStorage.getItem("aegis.keep-awake.enabled")).toBe("false");
  });
});

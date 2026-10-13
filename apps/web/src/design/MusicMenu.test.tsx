// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicMenu } from "@/design/MusicMenu";
import {
  clearCustomMusic,
  getMusicTrack,
  isMusicEnabled,
  setMusicEnabled,
  setMusicTrack,
  useMusicEnabled,
  useMusicTrack,
} from "@/design/sound";
import { I18nProvider } from "@/i18n/I18nProvider";

function SettingsProbe() {
  const track = useMusicTrack();
  const enabled = useMusicEnabled();
  return <output data-testid="settings-probe">{`${track}:${enabled}`}</output>;
}

function renderMenu(onOpenSoundSettings = vi.fn<() => void>()) {
  render(
    <I18nProvider>
      <MusicMenu onOpenSoundSettings={onOpenSoundSettings} />
      <SettingsProbe />
      <button>Elsewhere</button>
    </I18nProvider>,
  );
  return onOpenSoundSettings;
}

const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Change music" }));

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => new Response(null, { status: 404 })),
  );
  URL.createObjectURL ??= () => "blob:music";
  URL.revokeObjectURL ??= () => undefined;
  clearCustomMusic();
  setMusicTrack("digitalBattle");
  setMusicEnabled(true);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("header music menu", () => {
  it("announces a dialog that opens from the music button", () => {
    renderMenu();
    const button = screen.getByRole("button", { name: "Change music" });
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    openMenu();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const dialog = screen.getByRole("dialog", { name: "Soundtrack" });
    expect(button.getAttribute("aria-controls")).toBe(dialog.id);
    expect(screen.getAllByRole("radio").map((radio) => radio.closest("label")?.textContent)).toEqual([
      "Shortcuts",
      "Electric",
      "Out There",
      "Cipher",
    ]);
  });

  it("changes the soundtrack and music switch that Settings reads", () => {
    renderMenu();
    openMenu();
    fireEvent.click(screen.getByRole("radio", { name: "Electric" }));
    expect(getMusicTrack()).toBe("digitalAscent");
    expect(localStorage.getItem("aegis.music.track")).toBe("digitalAscent");
    fireEvent.click(screen.getByRole("switch", { name: /Background ambience/ }));
    expect(isMusicEnabled()).toBe(false);
    expect(screen.getByTestId("settings-probe").textContent).toBe("digitalAscent:false");
  });

  it("shows changes made elsewhere while it is open", () => {
    renderMenu();
    openMenu();
    expect((screen.getByRole("radio", { name: "Shortcuts" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("switch", { name: /Background ambience/ }));
    act(() => {
      setMusicEnabled(true);
      setMusicTrack("cipher");
    });
    expect((screen.getByRole("radio", { name: "Cipher" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("switch", { name: /Background ambience/ }).getAttribute("aria-checked")).toBe("true");
  });

  it("plays a local music file and lists it as the current track", () => {
    renderMenu();
    openMenu();
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(["music"], "my-song.mp3", { type: "audio/mpeg" })] } });
    const custom = screen.getByRole("radio", { name: /my-song\.mp3/ }) as HTMLInputElement;
    expect(custom.checked).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Out There" }));
    expect(screen.queryByRole("radio", { name: /my-song\.mp3/ })).toBeNull();
    expect(getMusicTrack()).toBe("warmDrive");
  });

  it("rejects a file that is not audio", () => {
    renderMenu();
    openMenu();
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(["text"], "notes.txt", { type: "text/plain" })] } });
    expect(screen.getByRole("alert").textContent).toBe("Choose a non-empty audio file up to 50 MB.");
  });

  it("closes on Escape and returns focus to the music button", () => {
    renderMenu();
    openMenu();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Change music" }));
  });

  it("closes when the player presses outside it", () => {
    renderMenu();
    openMenu();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the sound settings and closes", () => {
    const onOpenSoundSettings = renderMenu();
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Sound & music" }));
    expect(onOpenSoundSettings).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

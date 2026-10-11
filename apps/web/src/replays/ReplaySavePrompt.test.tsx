// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SavedReplay } from "@aegis/shared";
import { I18nProvider } from "../i18n";
import { ReplaySavePrompt, type ReplaySaveProps } from "./ReplaySavePrompt";
import { replayApi } from "./library";
import type { ReadyReplay } from "./files";
import { DRIVE_FILE, fakeDrive } from "./cloud/fakeProvider.fixture";

vi.hoisted(() => vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com"));
vi.mock("./cloud/googleDrive", async (original) => {
  const { fakeDrive: drive } = await import("./cloud/fakeProvider.fixture");
  return {
    ...(await original<typeof import("./cloud/googleDrive")>()),
    createGoogleDriveProvider: () => drive.provider,
  };
});

let matchCount = 0;
/** Each test saves a different match: saved files are remembered per match for the page's lifetime. */
function readyReplay(indexId?: string): ReadyReplay {
  matchCount++;
  return {
    kind: "ready",
    summary: {
      id: `match-${matchCount}`,
      players: ["Tai", "Matt"],
      mode: "casual",
      startedAt: 0,
      finishedAt: 1,
      winnerSeat: 0,
      frameCount: 3,
    },
    viewerSeat: 0,
    data: btoa("replay"),
    ...(indexId ? { indexId } : {}),
  };
}

let register: ReturnType<typeof vi.fn<typeof replayApi.registerDrive>>;
beforeEach(() => {
  fakeDrive.reset();
  localStorage.clear();
  localStorage.setItem("aegis.drive.autosave", "off");
  register = vi.fn<typeof replayApi.registerDrive>(async () => ({}) as SavedReplay);
  vi.spyOn(replayApi, "registerDrive").mockImplementation(register);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPrompt(props: ReplaySaveProps) {
  return render(
    <I18nProvider>
      <ReplaySavePrompt onDownloadReplay={vi.fn<() => void>()} {...props} />
    </I18nProvider>,
  );
}

it("offers Google Drive, the file, or skipping, and registers the Drive copy for a signed-in player", async () => {
  fakeDrive.setConnected(false);
  const onDownloadReplay = vi.fn<() => void>();
  const replay = readyReplay("11111111-1111-4111-8111-111111111111");
  renderPrompt({ replayFile: replay, onDownloadReplay, signedIn: true });

  expect(screen.getByRole("heading", { name: "Keep this replay?" })).toBeTruthy();
  expect(screen.getByText("Save it to watch later on any device.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Download file" }));
  expect(onDownloadReplay).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save to Google Drive" }));

  expect(fakeDrive.provider.connect).toHaveBeenCalledOnce();
  expect(await screen.findByRole("heading", { name: "Saved to Google Drive" })).toBeTruthy();
  expect(fakeDrive.provider.upload).toHaveBeenCalledWith(replay);
  expect(register).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", DRIVE_FILE.id);
  expect(screen.getByRole("link", { name: "Watch now" }).getAttribute("href")).toBe(
    "/replays/11111111-1111-4111-8111-111111111111",
  );
  expect(screen.getByRole("link", { name: "My matches" }).getAttribute("href")).toBe("/profile");
});

it("auto-saves by default with a live session and never asks a guest's library to register", async () => {
  localStorage.removeItem("aegis.drive.autosave");
  renderPrompt({ replayFile: readyReplay() });

  expect(await screen.findByRole("heading", { name: "Saved to Google Drive" })).toBeTruthy();
  expect(fakeDrive.provider.connect).not.toHaveBeenCalled();
  expect(register).not.toHaveBeenCalled();
  const watch = screen.getByRole("link", { name: "Watch now" });
  expect(watch.getAttribute("href")).toBe(DRIVE_FILE.webViewLink);
  expect(watch.getAttribute("target")).toBe("_blank");
});

it("asks to reconnect when auto-save meets an expired Drive session", async () => {
  localStorage.removeItem("aegis.drive.autosave");
  fakeDrive.setConnected(false);
  renderPrompt({ replayFile: readyReplay(), signedIn: true });

  expect(screen.getByText("Reconnect to save this match.")).toBeTruthy();
  expect(fakeDrive.provider.upload).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Reconnect and save" }));
  expect(await screen.findByRole("heading", { name: "Saved to Google Drive" })).toBeTruthy();
  expect(fakeDrive.provider.connect).toHaveBeenCalledOnce();
});

it("explains a guest's choices and lets them skip", () => {
  renderPrompt({ replayFile: readyReplay() });
  expect(screen.getByText("Save it to your Google Drive or download the file.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Not now" }));
  expect(screen.getByRole("heading", { name: "Replay not saved" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Not now" })).toBeNull();
  expect(screen.getByRole("button", { name: "Save to Google Drive" })).toBeTruthy();
  expect(fakeDrive.provider.upload).not.toHaveBeenCalled();
});

it("reports a library registration failure and retries both steps", async () => {
  register.mockRejectedValueOnce(new Error("offline"));
  const replay = readyReplay("22222222-2222-4222-8222-222222222222");
  renderPrompt({ replayFile: replay, signedIn: true });

  fireEvent.click(screen.getByRole("button", { name: "Save to Google Drive" }));
  expect(
    await screen.findByText("Saved to Google Drive, but your library could not record it. Try again."),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Save to Google Drive" }));
  expect(await screen.findByRole("heading", { name: "Saved to Google Drive" })).toBeTruthy();
  expect(fakeDrive.provider.upload).toHaveBeenCalledTimes(2);
  expect(register).toHaveBeenCalledTimes(2);
});

it("opens links in a new tab between games of a series", async () => {
  renderPrompt({
    replayFile: readyReplay("33333333-3333-4333-8333-333333333333"),
    signedIn: true,
    keepsMatchOpen: true,
  });
  fireEvent.click(screen.getByRole("button", { name: "Save to Google Drive" }));
  await waitFor(() => expect(screen.getByRole("link", { name: "Watch now" }).getAttribute("target")).toBe("_blank"));
  expect(screen.getByRole("link", { name: "My matches" }).getAttribute("target")).toBe("_blank");
});

it("shows the preparing state before the file arrives", () => {
  renderPrompt({ onDownloadReplay: undefined, replayStatus: "preparing" });
  expect(screen.getByRole("status").textContent).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Save to Google Drive" })).toBeNull();
});

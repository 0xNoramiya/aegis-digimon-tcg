// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "../i18n";
import { ReplaySavePrompt } from "./ReplaySavePrompt";
import type { ReadyReplay } from "./files";
import { fakeDrive } from "./cloud/fakeProvider.fixture";

vi.hoisted(() => vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com"));
vi.mock("./cloud/googleDrive", async (original) => {
  const { fakeDrive: drive } = await import("./cloud/fakeProvider.fixture");
  return {
    ...(await original<typeof import("./cloud/googleDrive")>()),
    createGoogleDriveProvider: () => drive.provider,
  };
});
vi.mock("./local", async (original) => ({
  ...(await original<typeof import("./local")>()),
  keepLocalReplay: vi.fn<typeof import("./local").keepLocalReplay>(
    async () => ({}) as Awaited<ReturnType<typeof import("./local").keepLocalReplay>>,
  ),
}));

const replay: ReadyReplay = {
  kind: "ready",
  summary: {
    id: "match-local",
    players: ["Tai", "Matt"],
    mode: "casual",
    startedAt: 0,
    finishedAt: 1,
    winnerSeat: 0,
    frameCount: 3,
  },
  viewerSeat: 0,
  data: btoa("replay"),
};

beforeEach(() => {
  fakeDrive.reset();
  fakeDrive.setConnected(false);
  localStorage.clear();
  localStorage.setItem("aegis.drive.autosave", "off");
});
afterEach(cleanup);

it("says the replay is kept only in this browser and offers to sync it", async () => {
  render(
    <I18nProvider>
      <ReplaySavePrompt onDownloadReplay={vi.fn<() => void>()} replayFile={replay} signedIn />
    </I18nProvider>,
  );

  expect(await screen.findByRole("heading", { name: "Saved on this device" })).toBeTruthy();
  expect(
    screen.getByText("Not synced with Google Drive. If you switch browsers or clear this site's data, you'll lose it."),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Sync to Google Drive" })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Not now" }));
  expect(screen.getByRole("heading", { name: "Saved on this device only" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Watch now" }).getAttribute("href")).toBe("/replays/match-local");
});

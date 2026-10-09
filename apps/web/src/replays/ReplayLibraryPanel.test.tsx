// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReplayLibraryPage, SavedReplay } from "@aegis/shared";
import { AccountApiError } from "../account/client";
import { I18nProvider } from "../i18n";
import { ReplayLibraryPanel } from "./ReplayLibraryPanel";
import { replayApi } from "./library";
import { fakeDrive } from "./cloud/fakeProvider.fixture";

vi.hoisted(() => vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com"));
vi.mock("./cloud/googleDrive", async (original) => {
  const { fakeDrive: drive } = await import("./cloud/fakeProvider.fixture");
  return {
    ...(await original<typeof import("./cloud/googleDrive")>()),
    createGoogleDriveProvider: () => drive.provider,
  };
});

function saved(index: number, visibility: SavedReplay["visibility"] = "private"): SavedReplay {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    matchId: `match-${index}`,
    summary: {
      id: `match-${index}`,
      players: ["Tai", `Rival ${index}`],
      mode: "casual",
      startedAt: 0,
      finishedAt: Date.UTC(2026, 9, index),
      winnerSeat: 0,
      frameCount: 10,
    },
    viewerSeat: 0,
    bytes: 2048,
    savedAt: 100 - index,
    driveFileId: `driveFile-${String(index).padStart(6, "0")}`,
    visibility,
  };
}
const page = (replays: SavedReplay[], extra: Partial<ReplayLibraryPage> = {}): ReplayLibraryPage => ({
  replays,
  sharing: true,
  ...extra,
});

beforeEach(() => fakeDrive.reset());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPanel(onOpen?: (file: Blob) => Promise<void>) {
  return render(
    <I18nProvider>
      <ReplayLibraryPanel onOpen={onOpen} />
    </I18nProvider>,
  );
}
const row = (rival: string) => screen.getAllByRole("listitem").find((item) => item.textContent?.includes(rival))!;

it("loads one page at a time and follows the cursor", async () => {
  const list = vi
    .spyOn(replayApi, "list")
    .mockResolvedValueOnce(page([saved(1), saved(2)], { nextCursor: "cursor-2" }))
    .mockResolvedValueOnce(page([saved(3)]));
  renderPanel();
  expect(await screen.findByText(/Rival 2$/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  expect(await screen.findByText(/Rival 3$/)).toBeTruthy();
  expect(list.mock.calls).toEqual([[], ["cursor-2"]]);
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  expect(within(row("Rival 1")).getByRole("link", { name: "Watch now" }).getAttribute("href")).toBe(
    `/replays/${saved(1).id}`,
  );
  expect(within(row("Rival 1")).getByRole("link", { name: "Open in Drive" }).getAttribute("href")).toBe(
    `https://drive.google.com/file/d/${saved(1).driveFileId}/view`,
  );
});

it("downloads from Drive with the player's token, signing in from the click when needed", async () => {
  vi.spyOn(replayApi, "list").mockResolvedValue(page([saved(1)]));
  fakeDrive.setConnected(false);
  const onOpen = vi.fn<(file: Blob) => Promise<void>>(async () => {});
  renderPanel(onOpen);
  fireEvent.click(await screen.findByRole("button", { name: /Watch now/ }));
  await waitFor(() => expect(onOpen).toHaveBeenCalledOnce());
  expect(fakeDrive.provider.connect).toHaveBeenCalledOnce();
  expect(fakeDrive.provider.download).toHaveBeenCalledWith({ id: saved(1).driveFileId, bytes: 2048 });
});

it("removes the index entry and then offers to trash the Drive file", async () => {
  vi.spyOn(replayApi, "list").mockResolvedValue(page([saved(1), saved(2)]));
  const remove = vi.spyOn(replayApi, "remove").mockResolvedValue({ ok: true });
  renderPanel();
  await screen.findByText(/Rival 1$/);
  fireEvent.click(within(row("Rival 1")).getByRole("button", { name: "Delete" }));
  expect(screen.getByText("Remove this replay from your library?")).toBeTruthy();
  fireEvent.click(within(row("Rival 1")).getByRole("button", { name: "Delete" }));
  expect(
    await screen.findByText("Removed from your library. Also move the file to your Google Drive trash?"),
  ).toBeTruthy();
  expect(remove).toHaveBeenCalledWith(saved(1).id);
  expect(screen.queryByText(/Rival 1$/)).toBeNull();
  expect(fakeDrive.provider.trash).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Move to Drive trash" }));
  expect(await screen.findByText("The file is in your Google Drive trash.")).toBeTruthy();
  expect(fakeDrive.provider.trash).toHaveBeenCalledWith(saved(1).driveFileId);

  fireEvent.click(within(row("Rival 2")).getByRole("button", { name: "Delete" }));
  fireEvent.click(within(row("Rival 2")).getByRole("button", { name: "Delete" }));
  fireEvent.click(await screen.findByRole("button", { name: "Keep the file" }));
  expect(fakeDrive.provider.trash).toHaveBeenCalledOnce();
  expect(
    screen.getByText("You have no saved replays yet. Save one to Google Drive from the match result."),
  ).toBeTruthy();
});

it("shares through Drive before the API and unshares after it", async () => {
  vi.spyOn(replayApi, "list").mockResolvedValue(page([saved(1)]));
  const visibility = vi
    .spyOn(replayApi, "visibility")
    .mockImplementation(async (id, value) => ({ ...saved(1), id, visibility: value }));
  renderPanel();
  fireEvent.click(await screen.findByRole("button", { name: "Private · Sharing" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("radio", { name: /Public/ }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("button", { name: "Public · Sharing" })).toBeTruthy();
  expect(fakeDrive.provider.share).toHaveBeenCalledWith(saved(1).driveFileId);
  expect(fakeDrive.provider.share.mock.invocationCallOrder[0]!).toBeLessThan(visibility.mock.invocationCallOrder[0]!);

  fireEvent.click(screen.getByRole("button", { name: "Public · Sharing" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("radio", { name: /Private/ }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("button", { name: "Private · Sharing" })).toBeTruthy();
  expect(visibility).toHaveBeenLastCalledWith(saved(1).id, "private");
  expect(fakeDrive.provider.unshare).toHaveBeenCalledWith(saved(1).driveFileId);
  expect(visibility.mock.invocationCallOrder[1]!).toBeLessThan(fakeDrive.provider.unshare.mock.invocationCallOrder[0]!);
});

it("rolls the Drive permission back when the API refuses to publish", async () => {
  vi.spyOn(replayApi, "list").mockResolvedValue(page([saved(1)]));
  vi.spyOn(replayApi, "visibility").mockRejectedValue(new AccountApiError(503, "sharing_disabled"));
  renderPanel();
  fireEvent.click(await screen.findByRole("button", { name: "Private · Sharing" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("radio", { name: /Public/ }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
  expect(await screen.findByText("Couldn't change sharing. Try again.")).toBeTruthy();
  expect(fakeDrive.provider.unshare).toHaveBeenCalledWith(saved(1).driveFileId);
});

it("hides sharing when the server cannot serve public replays", async () => {
  vi.spyOn(replayApi, "list").mockResolvedValue(page([saved(1)], { sharing: false }));
  renderPanel();
  await screen.findByText(/Rival 1$/);
  expect(screen.queryByRole("button", { name: /Sharing/ })).toBeNull();
});

it("shows a guest the Drive listing instead of the account library", async () => {
  vi.spyOn(replayApi, "list").mockRejectedValue(new AccountApiError(401));
  renderPanel(async () => {});
  expect(await screen.findByRole("heading", { name: "Google Drive" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Saved replays" })).toBeNull();
  await waitFor(() => expect(fakeDrive.provider.list).toHaveBeenCalled());
});

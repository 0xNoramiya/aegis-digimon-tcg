// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import type { LocalReplay } from "../local";
import { fakeDrive } from "./fakeProvider.fixture";
import { CloudAuthError } from "./provider";

vi.hoisted(() => {
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com");
  localStorage.setItem("aegis.drive.autosave", "off");
});
vi.mock("./googleDrive", async (original) => {
  const { fakeDrive: drive } = await import("./fakeProvider.fixture");
  return {
    ...(await original<typeof import("./googleDrive")>()),
    createGoogleDriveProvider: () => drive.provider,
  };
});
const local = vi.hoisted(() => ({
  unsynced: [] as LocalReplay[],
  marked: [] as string[],
}));
vi.mock("../local", async (original) => ({
  ...(await original<typeof import("../local")>()),
  unsyncedLocalReplays: async () => local.unsynced,
  markLocalReplaySynced: async (replay: { summary: { id: string } }, fileId: string) => {
    local.marked.push(`${replay.summary.id}:${fileId}`);
  },
}));
const registerDrive = vi.hoisted(() => vi.fn<(id: string, fileId: string) => Promise<unknown>>(async () => ({})));
vi.mock("../library", () => ({ replayApi: { registerDrive } }));

const { setCloudAutoSave, syncLocalReplays } = await import("./index");

function entry(matchId: string, indexId?: string): LocalReplay {
  return {
    key: `${matchId}:0`,
    matchId,
    viewerSeat: 0,
    ...(indexId ? { indexId } : {}),
    summary: {
      id: matchId,
      players: ["Tai", "Matt"],
      mode: "casual",
      startedAt: 0,
      finishedAt: 1,
      winnerSeat: 0,
      frameCount: 3,
    },
    data: btoa("replay"),
    savedAt: 1,
  };
}

beforeEach(() => {
  fakeDrive.setConnected(false);
  fakeDrive.reset();
  fakeDrive.setConnected(false);
  registerDrive.mockClear();
  local.unsynced = [];
  local.marked = [];
  setCloudAutoSave(true);
});

it("uploads replays kept on this device once Drive connects", async () => {
  local.unsynced = [entry("match-1", "index-1"), entry("match-2")];

  fakeDrive.setConnected(true);

  await waitFor(() => expect(local.marked).toEqual(["match-1:drive-file-0001", "match-2:drive-file-0001"]));
  expect(fakeDrive.provider.upload).toHaveBeenCalledTimes(2);
  expect(registerDrive).toHaveBeenCalledExactlyOnceWith("index-1", "drive-file-0001");
});

it("syncs on its own only while auto-save is on", async () => {
  local.unsynced = [entry("match-1")];
  setCloudAutoSave(false);
  fakeDrive.setConnected(true);
  await syncLocalReplays(fakeDrive.provider);
  expect(fakeDrive.provider.upload).toHaveBeenCalledTimes(1);
  fakeDrive.provider.upload.mockClear();
  local.marked = [];
  fakeDrive.setConnected(false);
  fakeDrive.setConnected(true);
  await Promise.resolve();
  expect(fakeDrive.provider.upload).not.toHaveBeenCalled();

  setCloudAutoSave(true);

  await waitFor(() => expect(local.marked).toEqual(["match-1:drive-file-0001"]));
});

it("skips a failed upload and stops when the session expires", async () => {
  local.unsynced = [entry("match-1"), entry("match-2"), entry("match-3"), entry("match-4")];
  fakeDrive.provider.upload
    .mockRejectedValueOnce(new Error("server"))
    .mockResolvedValueOnce({ id: "drive-file-0002", name: "match-2", createdAt: 0 })
    .mockImplementationOnce(async () => {
      fakeDrive.setConnected(false);
      throw new CloudAuthError();
    });

  fakeDrive.setConnected(true);

  await waitFor(() => expect(fakeDrive.provider.upload).toHaveBeenCalledTimes(3));
  await syncLocalReplays(fakeDrive.provider);
  expect(fakeDrive.provider.upload).toHaveBeenCalledTimes(3);
  expect(local.marked).toEqual(["match-2:drive-file-0002"]);
});

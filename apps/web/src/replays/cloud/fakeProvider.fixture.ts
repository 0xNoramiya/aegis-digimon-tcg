import { vi } from "vitest";
import type { CloudReplayFile, ReplayCloudProvider } from "./provider";

export const DRIVE_FILE: CloudReplayFile = {
  id: "drive-file-0001",
  name: "aegis-match-player-1.aegis-replay",
  createdAt: 0,
  webViewLink: "https://drive.google.com/file/d/drive-file-0001/view",
};

/** A Drive provider whose session and calls each test controls. */
export function createFakeProvider() {
  let connected = true;
  const listeners = new Set<() => void>();
  const provider = {
    name: "Google Drive",
    isLinked: vi.fn<ReplayCloudProvider["isLinked"]>(() => true),
    isConnected: vi.fn<ReplayCloudProvider["isConnected"]>(() => connected),
    prepare: vi.fn<ReplayCloudProvider["prepare"]>(async () => {}),
    connect: vi.fn<ReplayCloudProvider["connect"]>(async () => {
      connected = true;
    }),
    upload: vi.fn<ReplayCloudProvider["upload"]>(async () => DRIVE_FILE),
    list: vi.fn<ReplayCloudProvider["list"]>(async () => []),
    download: vi.fn<ReplayCloudProvider["download"]>(async () => new Blob(["replay"])),
    share: vi.fn<ReplayCloudProvider["share"]>(async () => {}),
    unshare: vi.fn<ReplayCloudProvider["unshare"]>(async () => {}),
    trash: vi.fn<ReplayCloudProvider["trash"]>(async () => {}),
    viewLink: (fileId: string) => `https://drive.google.com/file/d/${fileId}/view`,
    disconnect: vi.fn<ReplayCloudProvider["disconnect"]>(async () => {}),
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  } satisfies ReplayCloudProvider;
  return {
    provider,
    setConnected(next: boolean) {
      connected = next;
      for (const listener of listeners) listener();
    },
    reset() {
      connected = true;
      for (const mock of Object.values(provider)) if (vi.isMockFunction(mock)) mock.mockClear();
    },
  };
}

export const fakeDrive = createFakeProvider();

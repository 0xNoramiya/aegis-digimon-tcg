import type { ReplayLibraryPage, SavedReplay, SharedReplay } from "@aegis/shared";
import { accountApi, AccountApiError, request } from "../account/client";

const replayUrl = (id: string) => `/account/replays/${encodeURIComponent(id)}`;

/** The account's replay index. Files live in the player's Google Drive; these calls carry only metadata. */
export const replayApi = {
  list: (cursor?: string) =>
    request<ReplayLibraryPage>(cursor ? `/account/replays?cursor=${encodeURIComponent(cursor)}` : "/account/replays"),
  registerDrive: (id: string, fileId: string) =>
    request<SavedReplay>(`${replayUrl(id)}/drive`, { method: "PUT", body: JSON.stringify({ fileId }) }),
  visibility: (id: string, visibility: SavedReplay["visibility"]) =>
    request<SavedReplay>(`${replayUrl(id)}/visibility`, { method: "PUT", body: JSON.stringify({ visibility }) }),
  remove: (id: string) => request<{ ok: true }>(replayUrl(id), { method: "DELETE" }),
  shared: (id: string) => request<SharedReplay>(`/replays/${encodeURIComponent(id)}`),
  /** A public replay, read from Drive by the server. The owner downloads from Drive directly instead. */
  async sharedFile(id: string): Promise<Blob> {
    const response = await fetch(`${accountApi.base}/replays/${encodeURIComponent(id)}/file`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) throw new AccountApiError(response.status);
    return response.blob();
  },
};

export const replayPath = (id: string) => `/replays/${encodeURIComponent(id)}`;
export const replayLink = (id: string) => new URL(replayPath(id), location.origin).href;

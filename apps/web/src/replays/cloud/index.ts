import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReadyReplay } from "../files";
import { replayApi } from "../library";
import { createGoogleDriveProvider } from "./googleDrive";
import { CloudAuthError, type CloudReplayFile, type ReplayCloudProvider } from "./provider";

export type { CloudReplayFile, ReplayCloudProvider } from "./provider";
export { CloudAuthError, CloudRequestError } from "./provider";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

/** Absent when the build has no Google client id: every cloud control stays hidden. */
export const cloudReplays: ReplayCloudProvider | undefined = clientId ? createGoogleDriveProvider(clientId) : undefined;

const AUTO_SAVE_KEY = "aegis.drive.autosave";
const listeners = new Set<() => void>();
let version = 0;

function bump() {
  version++;
  for (const listener of listeners) listener();
}

cloudReplays?.subscribe(bump);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isCloudAutoSaveOn(): boolean {
  try {
    return localStorage.getItem(AUTO_SAVE_KEY) === "on";
  } catch {
    return false;
  }
}

export function setCloudAutoSave(on: boolean): void {
  try {
    if (on) localStorage.setItem(AUTO_SAVE_KEY, "on");
    else localStorage.removeItem(AUTO_SAVE_KEY);
  } catch {
    // The choice lasts for this page when storage is unavailable.
  }
  bump();
}

/** The per-device cloud state. Re-renders when the session or the auto-save choice changes. */
export function useCloudReplays() {
  useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
  return {
    provider: cloudReplays,
    linked: cloudReplays?.isLinked() ?? false,
    connected: cloudReplays?.isConnected() ?? false,
    autoSave: cloudReplays !== undefined && isCloudAutoSaveOn(),
  };
}

/** Runs `work` with a live session. Call it from a click: without one it opens the sign-in pop-up. */
export async function withCloudSession<T>(provider: ReplayCloudProvider, work: () => Promise<T>): Promise<T> {
  if (!provider.isConnected()) await provider.connect();
  return work();
}

export type CloudSaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; file: CloudReplayFile }
  /** `register`: the file is in Drive but the account's library could not record it. */
  | { kind: "failed"; reason: "auth" | "error" | "register" };

/** Files saved in this page, so the result screen keeps showing them after it remounts. */
const savedFiles = new Map<string, CloudReplayFile>();

function replayKey(replay: ReadyReplay): string {
  return `${replay.summary.id}:${replay.viewerSeat}`;
}

class RegisterError extends Error {}

/** Uploads, then records the file in the signed-in player's library. Both steps are idempotent, so a retry repeats both. */
async function saveToCloud(provider: ReplayCloudProvider, replay: ReadyReplay): Promise<CloudReplayFile> {
  const file = await provider.upload(replay);
  if (replay.indexId)
    await replayApi.registerDrive(replay.indexId, file.id).catch(() => Promise.reject(new RegisterError()));
  return file;
}

/**
 * Saves one finished match to the player's cloud. With auto-save on and a live session it
 * uploads on its own; otherwise `save` runs from a click, which may open the sign-in pop-up.
 * It never blocks the caller: progress and failure arrive as state.
 */
export function useCloudReplaySave(replay: ReadyReplay | undefined) {
  const { provider, autoSave, linked, connected } = useCloudReplays();
  const key = replay ? replayKey(replay) : undefined;
  const known = key ? savedFiles.get(key) : undefined;
  const [state, setState] = useState<CloudSaveState>(known ? { kind: "saved", file: known } : { kind: "idle" });
  const current = useRef(key);
  current.current = key;

  const track = useCallback((target: ReadyReplay, work: Promise<CloudReplayFile>) => {
    const targetKey = replayKey(target);
    setState({ kind: "saving" });
    work.then(
      (file) => {
        savedFiles.set(targetKey, file);
        if (current.current === targetKey) setState({ kind: "saved", file });
      },
      (error: unknown) => {
        if (current.current === targetKey)
          setState({
            kind: "failed",
            reason: error instanceof CloudAuthError ? "auth" : error instanceof RegisterError ? "register" : "error",
          });
      },
    );
  }, []);

  useEffect(() => {
    if (!provider || !replay || !key) return;
    const saved = savedFiles.get(key);
    if (saved) {
      setState({ kind: "saved", file: saved });
      return;
    }
    setState({ kind: "idle" });
    if (isCloudAutoSaveOn() && provider.isConnected()) track(replay, saveToCloud(provider, replay));
    else void provider.prepare().catch(() => undefined);
    // Only a new match restarts the save; the replay object is stable per match.
  }, [provider, key]);

  const save = useCallback(() => {
    if (!provider || !replay) return;
    track(
      replay,
      withCloudSession(provider, () => saveToCloud(provider, replay)),
    );
  }, [provider, replay, track]);

  return {
    available: provider !== undefined && replay !== undefined,
    providerName: provider?.name ?? "",
    viewLink: (fileId: string) => provider?.viewLink(fileId) ?? "",
    state,
    /** Auto-save is on but the session lapsed, so this match waits for a click. */
    needsReconnect: autoSave && linked && !connected && state.kind === "idle",
    save,
  };
}

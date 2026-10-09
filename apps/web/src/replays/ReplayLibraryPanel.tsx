import { useEffect, useRef, useState } from "react";
import type { SavedReplay } from "@aegis/shared";
import { AccountApiError } from "../account/client";
import { Button } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation, type TranslationKey } from "../i18n";
import { ReplaySharing } from "./ReplaySharing";
import { ReplayFileError } from "./files";
import { replayApi, replayPath } from "./library";
import { CloudAuthError, CloudRequestError, useCloudReplays, withCloudSession } from "./cloud";
import { CloudReplayLibrary } from "./cloud/CloudReplayLibrary";
import { driveViewLink } from "./cloud/googleDrive";

type LibraryState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "failed" }
  | { kind: "ready"; replays: SavedReplay[]; nextCursor?: string; sharing: boolean };

export function cloudErrorKey(cause: unknown): TranslationKey {
  if (cause instanceof ReplayFileError) return `replay.error.${cause.code}`;
  if (cause instanceof CloudAuthError) return "replay.drive.authFailed";
  if (cause instanceof CloudRequestError && cause.status === 404) return "replay.driveMissing";
  return "replay.drive.error";
}

/**
 * The signed-in player's replays, listed from the account index and played from their own
 * Google Drive. Guests see the files in their Drive instead, read straight from Google.
 */
export function ReplayLibraryPanel({
  onOpen,
  onChange,
}: {
  /** Plays a file in place. Without it, Watch opens the replay's own page. */
  onOpen?: (file: Blob) => Promise<void>;
  onChange?: () => void;
}) {
  const { t, locale } = useTranslation();
  const { provider } = useCloudReplays();
  const [library, setLibrary] = useState<LibraryState>({ kind: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState<string>();
  const [trashOffer, setTrashOffer] = useState<SavedReplay>();
  const [notice, setNotice] = useState<{ key: TranslationKey; alert: boolean }>();
  const generation = useRef(0);

  async function load() {
    const current = ++generation.current;
    setLibrary({ kind: "loading" });
    try {
      const page = await replayApi.list();
      if (generation.current === current) setLibrary({ kind: "ready", ...page });
    } catch (cause) {
      if (generation.current === current)
        setLibrary({ kind: cause instanceof AccountApiError && cause.status === 401 ? "guest" : "failed" });
    }
  }

  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, []);

  useEffect(() => {
    if (provider && library.kind === "ready" && library.replays.length) void provider.prepare().catch(() => undefined);
  }, [provider, library.kind]);

  if (library.kind === "guest")
    return onOpen ? <CloudReplayLibrary onOpen={onOpen} /> : <p>{t("replay.librarySignIn")}</p>;

  async function loadMore() {
    if (library.kind !== "ready" || !library.nextCursor) return;
    const current = generation.current;
    setLoadingMore(true);
    setNotice(undefined);
    try {
      const page = await replayApi.list(library.nextCursor);
      if (generation.current === current)
        setLibrary((state) =>
          state.kind === "ready" ? { kind: "ready", ...page, replays: [...state.replays, ...page.replays] } : state,
        );
    } catch {
      setNotice({ key: "replay.libraryError", alert: true });
    } finally {
      setLoadingMore(false);
    }
  }

  function update(change: (replays: SavedReplay[]) => SavedReplay[]) {
    setLibrary((state) => (state.kind === "ready" ? { ...state, replays: change(state.replays) } : state));
    onChange?.();
  }

  async function watch(item: SavedReplay) {
    if (!provider || !onOpen) return;
    setBusy(item.id);
    setNotice(undefined);
    try {
      const file = await withCloudSession(provider, () =>
        provider.download({ id: item.driveFileId, bytes: item.bytes }),
      );
      await onOpen(file);
    } catch (cause) {
      setNotice({ key: cloudErrorKey(cause), alert: true });
    } finally {
      setBusy(undefined);
    }
  }

  async function remove(item: SavedReplay) {
    setBusy(item.id);
    setNotice(undefined);
    try {
      await replayApi.remove(item.id);
      setConfirmDelete(undefined);
      update((replays) => replays.filter((entry) => entry.id !== item.id));
      if (provider) setTrashOffer(item);
    } catch (cause) {
      if (cause instanceof AccountApiError && cause.status === 404)
        update((replays) => replays.filter((entry) => entry.id !== item.id));
      else setNotice({ key: "replay.libraryError", alert: true });
    } finally {
      setBusy(undefined);
    }
  }

  async function trash(item: SavedReplay) {
    if (!provider) return;
    setBusy(item.id);
    setNotice(undefined);
    try {
      await withCloudSession(provider, () => provider.trash(item.driveFileId));
      setTrashOffer(undefined);
      setNotice({ key: "replay.trashDone", alert: false });
    } catch (cause) {
      setNotice({
        key: cause instanceof CloudAuthError ? "replay.drive.authFailed" : "replay.trashFailed",
        alert: true,
      });
    } finally {
      setBusy(undefined);
    }
  }

  const replays = library.kind === "ready" ? library.replays : [];
  return (
    <section className="replay-library" aria-labelledby="replay-library-title">
      <header>
        <div>
          <h2 id="replay-library-title">{t("replay.library")}</h2>
          <p>{t("replay.libraryHint")}</p>
        </div>
        <Icons.Cloud size={22} aria-hidden="true" />
      </header>
      {library.kind === "loading" ? <p role="status">{t("replay.libraryLoading")}</p> : null}
      {library.kind === "failed" ? (
        <div role="alert">
          <p>{t("replay.libraryError")}</p>
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            {t("replay.retry")}
          </Button>
        </div>
      ) : null}
      {trashOffer ? (
        <div className="replay-library__trash" role="status">
          <p>{t("replay.trashOffer")}</p>
          <Button
            size="sm"
            variant="secondary"
            icon={Icons.Trash}
            disabled={busy !== undefined}
            onClick={() => void trash(trashOffer)}
          >
            {t("replay.trashConfirm")}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy !== undefined} onClick={() => setTrashOffer(undefined)}>
            {t("replay.trashKeep")}
          </Button>
        </div>
      ) : null}
      {notice ? <p role={notice.alert ? "alert" : "status"}>{t(notice.key)}</p> : null}
      {library.kind === "ready" && !replays.length ? <p>{t("replay.libraryEmpty")}</p> : null}
      <ul>
        {replays.map((item) => (
          <li key={item.id}>
            <div className="replay-library__match">
              <strong>
                {item.summary.players[0]} <span>vs</span> {item.summary.players[1]}
              </strong>
              <small>
                {new Date(item.summary.finishedAt).toLocaleDateString(locale)} · {Math.ceil(item.bytes / 1024)} KB ·{" "}
                {item.summary.winnerSeat < 0
                  ? t("replay.draw")
                  : t("replay.winner", { name: item.summary.players[item.summary.winnerSeat] ?? "" })}
              </small>
            </div>
            <div className="replay-library__actions">
              {confirmDelete === item.id ? (
                <>
                  <span>{t("replay.deleteConfirm")}</span>
                  <Button size="sm" disabled={busy !== undefined} onClick={() => void remove(item)}>
                    {t("replay.delete")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(undefined)}>
                    {t("replay.cancel")}
                  </Button>
                </>
              ) : (
                <>
                  {onOpen && provider ? (
                    <Button
                      size="sm"
                      icon={Icons.Play}
                      disabled={busy !== undefined}
                      aria-label={`${t("replay.prompt.watch")}: ${item.summary.players.join(" vs ")}`}
                      onClick={() => void watch(item)}
                    >
                      {t("replay.prompt.watch")}
                    </Button>
                  ) : (
                    <a className="aegis-button aegis-button--primary aegis-button--sm" href={replayPath(item.id)}>
                      <Icons.Play size={16} aria-hidden="true" />
                      {t("replay.prompt.watch")}
                    </a>
                  )}
                  <a
                    className="aegis-button aegis-button--secondary aegis-button--sm"
                    href={driveViewLink(item.driveFileId)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Icons.ExternalLink size={16} aria-hidden="true" />
                    {t("replay.drive.open")}
                  </a>
                  {library.kind === "ready" && library.sharing ? (
                    <ReplaySharing
                      replay={item}
                      onChange={(changed) =>
                        update((entries) => entries.map((entry) => (entry.id === changed.id ? changed : entry)))
                      }
                    />
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      location.href = `${replayPath(item.id)}?export=mp4`;
                    }}
                  >
                    MP4
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Icons.Trash}
                    disabled={busy !== undefined}
                    onClick={() => setConfirmDelete(item.id)}
                  >
                    {t("replay.delete")}
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {library.kind === "ready" && library.nextCursor ? (
        <Button size="sm" variant="secondary" disabled={loadingMore} onClick={() => void loadMore()}>
          {t(loadingMore ? "replay.libraryLoading" : "replay.loadMore")}
        </Button>
      ) : null}
    </section>
  );
}

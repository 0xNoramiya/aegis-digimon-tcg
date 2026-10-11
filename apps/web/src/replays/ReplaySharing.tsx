import "./sharing.css";
import { useId, useState } from "react";
import type { SavedReplay } from "@aegis/shared";
import { Button, Dialog } from "../design/primitives";
import { useTranslation, type TranslationKey } from "../i18n";
import { replayApi, replayLink } from "./library";
import { CloudAuthError, useCloudReplays, withCloudSession } from "./cloud";

/** Aegis no longer serves the replay, but Drive still lets anyone with the file's link read it. */
class DriveStillPublicError extends Error {}

/**
 * Public replays are served by our API from the owner's Drive, so going public first lets
 * anyone with the link read the Drive file, then tells the API. Going private does the reverse.
 */
export function ReplaySharing({ replay, onChange }: { replay: SavedReplay; onChange?: (replay: SavedReplay) => void }) {
  const { t } = useTranslation();
  const { provider } = useCloudReplays();
  const title = useId();
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState(replay.visibility);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey>();
  const [copied, setCopied] = useState(false);
  if (!provider) return null;
  const drive = provider;

  async function publish(): Promise<SavedReplay> {
    await drive.share(replay.driveFileId);
    try {
      return await replayApi.visibility(replay.id, "public");
    } catch (cause) {
      await drive.unshare(replay.driveFileId).catch(() => undefined);
      throw cause;
    }
  }

  async function unpublish(): Promise<SavedReplay> {
    const updated = await replayApi.visibility(replay.id, "private");
    onChange?.(updated);
    try {
      await drive.unshare(replay.driveFileId);
    } catch {
      throw new DriveStillPublicError();
    }
    return updated;
  }

  async function save() {
    if (visibility === replay.visibility) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      // The session check runs inside the click, so a sign-in pop-up is allowed to open.
      const updated = await withCloudSession(drive, visibility === "public" ? publish : unpublish);
      onChange?.(updated);
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof DriveStillPublicError
          ? "replay.shareDriveStillPublic"
          : cause instanceof CloudAuthError
            ? "replay.drive.authFailed"
            : "replay.shareFailed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setVisibility(replay.visibility);
          setCopied(false);
          setError(undefined);
          setOpen(true);
          void drive.prepare().catch(() => undefined);
        }}
      >
        {t(replay.visibility === "public" ? "replay.public" : "replay.private")} · {t("replay.share")}
      </Button>
      {open ? (
        <Dialog className="replay-sharing" labelledBy={title} onClose={busy ? undefined : () => setOpen(false)}>
          <h2 id={title}>{t("replay.share")}</h2>
          <fieldset disabled={busy}>
            <legend className="aegis-sr-only">{t("replay.share")}</legend>
            {(["private", "public"] as const).map((value) => (
              <label key={value} className="replay-sharing__choice">
                <input type="radio" name={title} checked={visibility === value} onChange={() => setVisibility(value)} />
                <span>
                  <strong>{t(`replay.${value}`)}</strong>
                  <small>{t(value === "private" ? "replay.privateHint" : "replay.publicHint")}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <p>{t("replay.revokeHint")}</p>
          <label className="replay-sharing__link">
            {t("replay.link")}
            <input readOnly value={replayLink(replay.id)} onFocus={(event) => event.currentTarget.select()} />
          </label>
          <Button
            variant="secondary"
            disabled={busy || visibility !== replay.visibility}
            onClick={() => {
              void navigator.clipboard
                .writeText(replayLink(replay.id))
                .then(() => setCopied(true))
                .catch(() => setError("replay.shareFailed"));
            }}
          >
            {t(copied ? "replay.copied" : "replay.copyLink")}
          </Button>
          {error ? <p role="alert">{t(error)}</p> : null}
          <footer>
            <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              {t("common.save")}
            </Button>
          </footer>
        </Dialog>
      ) : null}
    </>
  );
}

import { useState } from "react";
import { Button } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation, type TranslationKey } from "../i18n";
import { replayPath } from "./library";
import type { ReadyReplay } from "./files";
import { useCloudReplaySave, useCloudReplays, type CloudSaveState } from "./cloud";
import { hasSeenDriveOnboarding, useDriveOnboarding } from "./cloud/DriveOnboarding";
import "./savePrompt.css";

export interface ReplaySaveProps {
  onDownloadReplay?: () => void;
  /** This participant's finished replay file; spectators never get one. */
  replayFile?: ReadyReplay;
  replayStatus?: "preparing" | "unavailable";
  /** A signed-in player's Drive copy also joins their replay library on every device. */
  signedIn?: boolean;
  /** Between games of a series, links open a new tab so the series keeps its seat. */
  keepsMatchOpen?: boolean;
}

const FAILURES: Record<Extract<CloudSaveState, { kind: "failed" }>["reason"], TranslationKey> = {
  auth: "replay.drive.authFailed",
  error: "replay.drive.failed",
  register: "replay.drive.registerFailed",
};

/**
 * Asks at the end of every match whether to keep its replay: save it to the player's Google
 * Drive, download the file, or skip. Without a Google client id only the download remains.
 */
export function ReplaySavePrompt({
  onDownloadReplay,
  replayFile,
  replayStatus,
  signedIn = false,
  keepsMatchOpen = false,
}: ReplaySaveProps) {
  const { t } = useTranslation();
  const cloud = useCloudReplaySave(replayFile);
  const { linked } = useCloudReplays();
  const onboarding = useDriveOnboarding(signedIn);
  const [skipped, setSkipped] = useState(false);

  if (!onDownloadReplay && !replayStatus) return null;

  const newTab = keepsMatchOpen ? { target: "_blank", rel: "noreferrer" } : {};

  if (cloud.state.kind === "saved") {
    const indexId = signedIn ? replayFile?.indexId : undefined;
    const driveLink = cloud.state.file.webViewLink ?? cloud.viewLink(cloud.state.file.id);
    return (
      <section className="replay-prompt replay-prompt--saved" aria-labelledby="replay-prompt-title">
        <Icons.Check size={24} aria-hidden="true" />
        <div className="replay-prompt__copy">
          <h2 id="replay-prompt-title">{t("replay.drive.saved")}</h2>
          <p role="status">{t(indexId ? "replay.prompt.savedHint" : "replay.prompt.savedGuestHint")}</p>
        </div>
        <div className="replay-prompt__actions">
          {indexId ? (
            <a className="aegis-button aegis-button--primary aegis-button--sm" href={replayPath(indexId)} {...newTab}>
              <Icons.Play size={16} aria-hidden="true" />
              {t("replay.prompt.watch")}
            </a>
          ) : (
            <a
              className="aegis-button aegis-button--primary aegis-button--sm"
              href={driveLink}
              target="_blank"
              rel="noreferrer"
            >
              <Icons.ExternalLink size={16} aria-hidden="true" />
              {t("replay.prompt.watch")}
            </a>
          )}
          <a className="aegis-button aegis-button--secondary aegis-button--sm" href="/replays" {...newTab}>
            {t("replay.prompt.library")}
          </a>
        </div>
      </section>
    );
  }

  const saving = cloud.state.kind === "saving";
  const failure = cloud.state.kind === "failed" ? FAILURES[cloud.state.reason] : undefined;
  const hint: TranslationKey = !cloud.available
    ? "replay.prompt.downloadHint"
    : signedIn
      ? "replay.prompt.driveHint"
      : "replay.prompt.guestHint";
  const saveToDrive = cloud.available ? (
    <Button
      size="sm"
      icon={Icons.Cloud}
      disabled={saving}
      onClick={() => (linked || hasSeenDriveOnboarding() ? cloud.save() : onboarding.show(cloud.save))}
    >
      {t(saving ? "replay.drive.saving" : "replay.drive.save")}
    </Button>
  ) : null;
  const download = onDownloadReplay ? (
    <Button size="sm" variant="secondary" icon={Icons.Download} onClick={onDownloadReplay}>
      {t("replay.prompt.download")}
    </Button>
  ) : null;

  return (
    <section
      className={`replay-prompt${skipped ? " replay-prompt--skipped" : ""}`}
      aria-labelledby="replay-prompt-title"
    >
      <Icons.PlayCircle size={24} aria-hidden="true" />
      <div className="replay-prompt__copy">
        <h2 id="replay-prompt-title">
          {cloud.available && !linked && !skipped ? (
            <span className="drive-connect-card__badge">{t("replay.onboarding.new")}</span>
          ) : null}
          {t(skipped ? "replay.prompt.skippedTitle" : "replay.prompt.title")}
        </h2>
        {replayStatus ? (
          <p role="status">{t(replayStatus === "preparing" ? "replay.preparing" : "replay.unavailable")}</p>
        ) : skipped ? null : (
          <p>{t(hint)}</p>
        )}
        {failure ? <p role="alert">{t(failure)}</p> : null}
        {!failure && cloud.needsReconnect ? <p>{t("replay.drive.expired")}</p> : null}
        {cloud.available && !skipped ? (
          <button className="drive-how-link" onClick={() => onboarding.show()}>
            {t("replay.onboarding.howItWorks")}
          </button>
        ) : null}
      </div>
      <div className="replay-prompt__actions">
        {saveToDrive}
        {download}
        {!skipped && (saveToDrive || download) ? (
          <Button size="sm" variant="ghost" onClick={() => setSkipped(true)}>
            {t("replay.prompt.skip")}
          </Button>
        ) : null}
      </div>
      {onboarding.element}
    </section>
  );
}

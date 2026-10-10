import { useEffect, useState } from "react";
import { Badge, Button, Switch } from "../../design/primitives";
import { Icons } from "../../design/icons";
import { SectionHeading } from "../../design/surfaces";
import { useTranslation } from "../../i18n";
import { setCloudAutoSave, useCloudReplays } from ".";
import { useDriveOnboarding } from "./DriveOnboarding";

/** Connects this device to the player's Google Drive and holds the auto-save choice. */
export function CloudReplaySettings() {
  const { t } = useTranslation();
  const { provider, linked, autoSave } = useCloudReplays();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const onboarding = useDriveOnboarding(true);

  useEffect(() => {
    if (provider && !linked) void provider.prepare().catch(() => undefined);
  }, [provider, linked]);

  if (!provider) return null;

  async function connect(): Promise<boolean> {
    if (!provider) return false;
    setBusy(true);
    setFailed(false);
    try {
      await provider.connect();
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="settings-replays"
      className="settings-card settings-card--replays"
      aria-labelledby="settings-replays-title"
      tabIndex={-1}
    >
      <SectionHeading id="settings-replays-title" title={t("replay.drive.settingsTitle")} />
      <div className="settings-list">
        <div className="settings-row settings-drive">
          <span className="settings-drive__icon" aria-hidden="true">
            <Icons.Cloud size={22} />
          </span>
          <div className="settings-row__copy">
            <span className="settings-drive__title">
              <strong>{t("replay.drive.title")}</strong>
              <Badge tone={linked ? "success" : "neutral"}>
                {t(linked ? "redesign.settings.driveConnected" : "redesign.settings.driveNotConnected")}
              </Badge>
            </span>
            <small>{t("replay.drive.settingsDesc")}</small>
            <small role="status" className="aegis-sr-only">
              {t(linked ? "replay.drive.connected" : "replay.drive.notConnected")}
            </small>
            {failed ? <small role="alert">{t("replay.drive.authFailed")}</small> : null}
            <span className="settings-drive__links">
              <button type="button" className="drive-how-link" onClick={() => onboarding.show()}>
                {t("replay.onboarding.howItWorks")}
              </button>
              <span aria-hidden="true">·</span>
              <a className="drive-how-link" href="/privacy#google-drive">
                {t("privacy.title")}
              </a>
            </span>
          </div>
          <div className="settings-row__control">
            {linked ? (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => void provider.disconnect()}>
                {t("replay.drive.disconnect")}
              </Button>
            ) : (
              <Button size="sm" icon={Icons.Cloud} disabled={busy} onClick={() => void connect()}>
                {t("replay.drive.connect")}
              </Button>
            )}
          </div>
        </div>
        <div className="settings-row">
          <Switch
            checked={autoSave && linked}
            disabled={busy}
            label={t("replay.drive.autoSave")}
            description={t("replay.drive.autoSaveDesc")}
            onChange={(next) => {
              if (!next || linked) {
                setCloudAutoSave(next);
                return;
              }
              void connect().then((connected) => {
                if (connected) setCloudAutoSave(true);
              });
            }}
          />
        </div>
      </div>
      {onboarding.element}
    </section>
  );
}

import { useEffect, useState } from "react";
import { Button, Switch } from "../../design/primitives";
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
    <section className="settings-card settings-card--replays" aria-labelledby="settings-replays-title">
      <SectionHeading id="settings-replays-title" title={t("replay.drive.settingsTitle")} />
      <div className="settings-row settings-row--stack">
        <div className="settings-row__copy">
          <strong>{t("replay.drive.title")}</strong>
          <small>{t("replay.drive.settingsDesc")}</small>
          <small role="status">{t(linked ? "replay.drive.connected" : "replay.drive.notConnected")}</small>
          {failed ? <small role="alert">{t("replay.drive.authFailed")}</small> : null}
          <span className="settings-replays__links">
            <button className="drive-how-link" onClick={() => onboarding.show()}>
              {t("replay.onboarding.howItWorks")}
            </button>
            <a className="drive-how-link" href="/privacy#google-drive">
              {t("privacy.title")}
            </a>
          </span>
        </div>
        {linked ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => {
              setCloudAutoSave(false);
              void provider.disconnect();
            }}
          >
            {t("replay.drive.disconnect")}
          </Button>
        ) : (
          <Button size="sm" icon={Icons.Cloud} disabled={busy} onClick={() => void connect()}>
            {t("replay.drive.connect")}
          </Button>
        )}
      </div>
      <div className="settings-block">
        <Switch
          checked={autoSave}
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
      {onboarding.element}
    </section>
  );
}

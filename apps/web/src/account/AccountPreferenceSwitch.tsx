import { useEffect, useState } from "react";
import { accountApi } from "@/account/client";
import { Switch } from "@/design/primitives";

type BooleanPreference = "shareDeckAfterMatch" | "hideRankedDecks";
type Props = {
  preference: BooleanPreference;
  defaultValue: boolean;
  label: string;
  description: string;
  failedMessage: string;
};

export function AccountPreferenceSwitch({ preference, defaultValue, label, description, failedMessage }: Props) {
  const [enabled, setEnabled] = useState(defaultValue);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void accountApi
      .preferences()
      .then((preferences) => {
        if (!cancelled) {
          setEnabled(preferences[preference] ?? defaultValue);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBusy(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [preference, defaultValue]);

  async function save(next: boolean) {
    setBusy(true);
    setFailed(false);
    try {
      const preferences = await accountApi.updatePreferences({ [preference]: next });
      setEnabled(preferences[preference] ?? defaultValue);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-row">
      <Switch
        checked={enabled}
        disabled={busy || !loaded}
        label={label}
        description={description}
        onChange={(next) => void save(next)}
      />
      {failed ? <p role="alert">{failedMessage}</p> : null}
    </div>
  );
}

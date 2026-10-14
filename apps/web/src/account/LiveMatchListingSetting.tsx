import { useEffect, useState, type ReactNode } from "react";
import { Tooltip } from "radix-ui";
import { accountApi } from "@/account/client";
import { Switch } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";

export function LiveMatchListingSetting({ signedIn, compact = false }: { signedIn: boolean; compact?: boolean }) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(signedIn);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void accountApi
      .preferences()
      .then((preferences) => {
        if (!cancelled) {
          setEnabled(preferences.listLiveMatches === true);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  async function saveListing(next: boolean) {
    setBusy(true);
    setFailed(false);
    try {
      const preferences = await accountApi.updatePreferences({ listLiveMatches: next });
      setEnabled(preferences.listLiveMatches === true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const listingSwitch = (
    <Switch
      checked={enabled}
      disabled={!signedIn || busy || !loaded}
      label={t("settings.listLiveMatches")}
      description={compact ? undefined : t("settings.listLiveMatchesDesc")}
      onChange={(next) => void saveListing(next)}
    />
  );
  return (
    <div
      className={`settings-row live-match-listing-setting${compact ? " live-match-listing-setting--compact" : ""}`}
      title={compact && signedIn ? t("settings.listLiveMatchesDesc") : undefined}
    >
      {compact && !signedIn ? <SignInRequiredTooltip>{listingSwitch}</SignInRequiredTooltip> : listingSwitch}
      {!signedIn && !compact ? (
        <p className="live-match-listing-setting__hint">{t("settings.listLiveMatchesSignIn")}</p>
      ) : null}
      {failed ? <p role="alert">{t("settings.listLiveMatchesFailed")}</p> : null}
    </div>
  );
}

function SignInRequiredTooltip({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger
          asChild
          onPointerDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.preventDefault();
            setOpen((previous) => !previous);
          }}
        >
          <span className="live-match-listing-setting__locked" tabIndex={0}>
            {children}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="live-match-listing-tooltip"
            side="bottom"
            align="end"
            sideOffset={6}
            collisionPadding={12}
          >
            <strong>{t("settings.listLiveMatchesSignIn")}</strong>
            <p>{t("settings.listLiveMatchesLockedHelp")}</p>
            <Tooltip.Arrow className="live-match-listing-tooltip__arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

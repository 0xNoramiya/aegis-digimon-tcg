import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { Button, Dialog, Switch } from "../../design/primitives";
import { Icons } from "../../design/icons";
import { CardFull } from "../../design/cards";
import { useTranslation, type TranslationKey } from "../../i18n";
import { setCloudAutoSave, useCloudReplays } from ".";
import "./driveOnboarding.css";

const SEEN_KEY = "aegis.drive.onboardingSeen";

export function hasSeenDriveOnboarding(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markDriveOnboardingSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Without storage the explanation simply shows again next time.
  }
}

export function DriveFolder({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { t } = useTranslation();
  return (
    <span className={`drive-folder drive-folder--${size}`}>
      <span className="drive-folder__tab" />
      <span className="drive-folder__body">
        <Icons.Cloud size={size === "sm" ? 22 : 34} aria-hidden="true" />
        {size === "sm" ? null : <strong>{t("replay.onboarding.folder")}</strong>}
      </span>
    </span>
  );
}

function SaveIllustration() {
  const { t } = useTranslation();
  return (
    <div className="drive-art drive-art--save" aria-hidden="true">
      <div className="drive-art__match">
        <small>{t("replay.onboarding.matchLabel")}</small>
        <strong>{t("replay.onboarding.victory")}</strong>
        <span className="drive-art__cards">
          <CardFull cardId="BT1-010" width={52} zoomOnHover={false} />
          <CardFull cardId="BT1-029" width={52} zoomOnHover={false} />
        </span>
      </div>
      <span className="drive-art__flow" />
      <DriveFolder />
    </div>
  );
}

function PrivacyIllustration() {
  return (
    <div className="drive-art drive-art--privacy" aria-hidden="true">
      <span className="drive-art__shield">
        <Icons.ShieldCheck size={56} />
      </span>
      <DriveFolder size="sm" />
    </div>
  );
}

const SYNCED_MATCHES = ["Agumon vs Gabumon", "Guilmon vs Renamon", "Veemon vs Patamon"];

function DeviceList() {
  return (
    <ul>
      {SYNCED_MATCHES.map((match, index) => (
        <li key={match}>
          <span className={`drive-art__thumb drive-art__thumb--${index}`} />
          {match}
        </li>
      ))}
    </ul>
  );
}

function DevicesIllustration() {
  return (
    <div className="drive-art drive-art--devices" aria-hidden="true">
      <span className="drive-art__laptop">
        <span className="drive-art__screen">
          <DeviceList />
        </span>
      </span>
      <span className="drive-art__sync">
        <Icons.Cloud size={22} />
      </span>
      <span className="drive-art__phone">
        <DeviceList />
      </span>
    </div>
  );
}

interface Step {
  title: TranslationKey;
  art: ReactNode;
}

const STEPS: Step[] = [
  { title: "replay.onboarding.step1Title", art: <SaveIllustration /> },
  { title: "replay.onboarding.step2Title", art: <PrivacyIllustration /> },
  { title: "replay.onboarding.step3Title", art: <DevicesIllustration /> },
];

/**
 * Explains the Google Drive integration in three steps and ends by connecting it. Shown before
 * the first Google permission pop-up and on demand from every "How it works" link.
 */
export function DriveOnboarding({
  signedIn,
  onConnected,
  onClose,
}: {
  signedIn: boolean;
  /** Runs after a successful connect, so the action that opened the onboarding can continue. */
  onConnected?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { provider, linked, autoSave } = useCloudReplays();
  const titleId = useId();
  const [step, setStep] = useState(0);
  const [wantsAutoSave, setWantsAutoSave] = useState(linked ? autoSave : true);
  const [connecting, setConnecting] = useState(false);
  const [failed, setFailed] = useState(false);
  const last = step === STEPS.length - 1;

  function close() {
    markDriveOnboardingSeen();
    onClose();
  }

  async function connect() {
    if (!provider) return;
    setConnecting(true);
    setFailed(false);
    try {
      await provider.connect();
      setCloudAutoSave(wantsAutoSave);
      markDriveOnboardingSeen();
      onClose();
      onConnected?.();
    } catch {
      setFailed(true);
    } finally {
      setConnecting(false);
    }
  }

  const current = STEPS[step]!;
  return (
    <Dialog className="drive-onboarding" labelledBy={titleId} onClose={close}>
      <button className="drive-onboarding__close" aria-label={t("common.close")} onClick={close}>
        <Icons.X size={20} />
      </button>
      <span className="drive-onboarding__handle" aria-hidden="true" />
      <h2 id={titleId}>{t(current.title)}</h2>
      {current.art}
      <div className="drive-onboarding__body" aria-live="polite">
        {step === 0 ? <p>{t("replay.onboarding.step1Body")}</p> : null}
        {step === 1 ? (
          <>
            <ul className="drive-onboarding__checks">
              {(["replay.onboarding.check1", "replay.onboarding.check2", "replay.onboarding.check3"] as const).map(
                (key) => (
                  <li key={key}>
                    <Icons.Check size={16} aria-hidden="true" />
                    {t(key)}
                  </li>
                ),
              )}
            </ul>
            <p className="drive-onboarding__footnote">
              <Icons.Info size={14} aria-hidden="true" />
              {t("replay.onboarding.scope")}
              <span aria-hidden="true">·</span>
              <a href="/privacy#google-drive" target="_blank" rel="noreferrer">
                {t("privacy.title")}
              </a>
            </p>
          </>
        ) : null}
        {last ? (
          <>
            <p>{t(signedIn ? "replay.onboarding.step3Body" : "replay.onboarding.step3Guest")}</p>
            <Switch
              checked={wantsAutoSave}
              label={t("replay.onboarding.autoSave")}
              onChange={(next) => {
                setWantsAutoSave(next);
                if (linked) setCloudAutoSave(next);
              }}
            />
            <p className="drive-onboarding__footnote">{t("replay.onboarding.reconnect")}</p>
            {failed ? <p role="alert">{t("replay.drive.authFailed")}</p> : null}
          </>
        ) : null}
      </div>
      <ol className="drive-onboarding__dots" aria-label={t("replay.onboarding.progress", { step: step + 1, total: 3 })}>
        {STEPS.map((entry, index) => (
          <li key={entry.title} aria-current={index === step ? "step" : undefined} />
        ))}
      </ol>
      <div className="drive-onboarding__actions">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep(step - 1)}>
            {t("replay.onboarding.back")}
          </Button>
        ) : null}
        {!last ? (
          <Button className="drive-onboarding__next" icon={Icons.ArrowRight} onClick={() => setStep(step + 1)}>
            {t("replay.onboarding.next")}
          </Button>
        ) : linked ? (
          <Button className="drive-onboarding__next" icon={Icons.Check} onClick={close}>
            {t("replay.onboarding.done")}
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              {t("replay.prompt.skip")}
            </Button>
            <Button
              className="drive-onboarding__next"
              icon={Icons.Cloud}
              disabled={connecting}
              onClick={() => void connect()}
            >
              {t("replay.drive.connect")}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}

/** One onboarding per entry point: `open` shows it, optionally continuing an action after connecting. */
export function useDriveOnboarding(signedIn: boolean) {
  const [open, setOpen] = useState(false);
  const continuation = useRef<(() => void) | undefined>(undefined);
  const show = useCallback((onConnected?: () => void) => {
    continuation.current = onConnected;
    setOpen(true);
  }, []);
  const element = open ? (
    <DriveOnboarding signedIn={signedIn} onConnected={() => continuation.current?.()} onClose={() => setOpen(false)} />
  ) : null;
  return { show, element };
}

/** The profile's invitation for a device that has never connected Google Drive. */
export function DriveConnectCard({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslation();
  const { provider, linked } = useCloudReplays();
  const onboarding = useDriveOnboarding(signedIn);
  if (!provider || linked) return null;
  return (
    <section className="drive-connect-card" aria-labelledby="drive-connect-title">
      <span className="drive-connect-card__icon" aria-hidden="true">
        <Icons.Folder size={40} />
        <Icons.Cloud size={22} />
      </span>
      <div className="drive-connect-card__copy">
        <h2 id="drive-connect-title">{t("replay.onboarding.cardTitle")}</h2>
        <p>{t(signedIn ? "replay.onboarding.cardBody" : "replay.onboarding.cardGuest")}</p>
      </div>
      <button className="drive-how-link" onClick={() => onboarding.show()}>
        {t("replay.onboarding.howItWorks")}
      </button>
      <Button
        icon={Icons.Cloud}
        onClick={() => (hasSeenDriveOnboarding() ? void provider.connect().catch(() => undefined) : onboarding.show())}
      >
        {t("profile.driveConnect")}
      </Button>
      {onboarding.element}
    </section>
  );
}

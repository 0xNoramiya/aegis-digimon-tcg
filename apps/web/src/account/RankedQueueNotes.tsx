import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import "./RankedQueueNotes.css";

export function RankedQueueNotes({
  ranked,
  signedIn,
  rankedDisabled,
  signInRequired,
  onOpenSettings,
}: {
  ranked: boolean;
  signedIn: boolean | undefined;
  rankedDisabled: boolean;
  signInRequired: boolean;
  onOpenSettings: () => void;
}) {
  const { t } = useTranslation();
  const signInPrompt = signedIn === false;
  const deckBlocked = signedIn === true && rankedDisabled;
  if (!ranked && !signInPrompt && !deckBlocked && !signInRequired) return null;
  return (
    <div className="ranked-notes">
      {ranked ? (
        <span className="ranked-notes__rule">
          <Icons.Clock size={14} />
          {t("ranked.season.clock")}
        </span>
      ) : null}
      {signInPrompt ? (
        <button type="button" className="ranked-notes__sign-in" onClick={onOpenSettings}>
          <Icons.LogIn size={16} />
          {t("ranked.signInToEnable")}
        </button>
      ) : null}
      {deckBlocked ? <span className="ranked-notes__description">{t("ranked.season.savedDeck")}</span> : null}
      {signInRequired ? (
        <div role="alert" className="ranked-notes__error">
          {t("ranked.signInFirst")}
        </div>
      ) : null}
    </div>
  );
}

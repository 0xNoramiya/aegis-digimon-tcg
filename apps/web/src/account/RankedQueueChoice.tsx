import type { DeckFormat } from "@aegis/shared/deckFormat";
import { useRankedConfig } from "@/ranked/useRankedConfig";
import { useId } from "react";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import "./RankedQueueChoice.css";
import "@/ranked/ranked.css";

export function RankedQueueChoice({
  ranked,
  signedIn,
  format = "standard",
  rankedDisabled = false,
  signInRequired = false,
  className,
  onOpenSettings,
  onRankedChange,
}: {
  ranked: boolean;
  signedIn: boolean | undefined;
  format?: DeckFormat;
  rankedDisabled?: boolean;
  signInRequired?: boolean;
  className?: string;
  onOpenSettings: () => void;
  onRankedChange: (ranked: boolean) => void;
}) {
  const { t } = useTranslation();
  const modeId = useId();
  const rankedConfig = useRankedConfig();
  const available = rankedConfig?.enabled === true;
  const canRanked = available && rankedConfig.formats.includes(format) && !rankedDisabled;
  return (
    <div className={className}>
      <div className="ranked-start">
        <fieldset className="ranked-start__modes">
          <legend>{t("ranked.queue.mode")}</legend>
          <div className="ranked-start__choices">
            <label className="ranked-start__choice" data-selected={!ranked || undefined}>
              <input type="radio" name={modeId} checked={!ranked} onChange={() => onRankedChange(false)} />
              <Icons.Swords size={20} />
              <span>
                <strong>{t("ranked.queue.casual")}</strong>
                <small>{t("ranked.queue.casualDescription")}</small>
              </span>
            </label>
            <label
              className="ranked-start__choice"
              data-selected={ranked || undefined}
              data-disabled={!signedIn || !canRanked || undefined}
            >
              <input
                type="radio"
                name={modeId}
                disabled={!signedIn || !canRanked}
                checked={ranked}
                onChange={() => onRankedChange(true)}
              />
              <Icons.Trophy size={20} />
              <span>
                <strong>{t("ranked.queue.ranked")}</strong>
                <small>{t("ranked.queue.rankedDescription")}</small>
              </span>
            </label>
          </div>
        </fieldset>
        {signedIn === false ? (
          <button type="button" className="ranked-start__sign-in" onClick={onOpenSettings}>
            <Icons.LogIn size={16} />
            {t("ranked.signInToEnable")}
          </button>
        ) : null}
        {signedIn && !available ? (
          <span className="ranked-start__description">{t("ranked.season.unavailable")}</span>
        ) : null}
        {signedIn && available && !canRanked ? (
          <span className="ranked-start__description">
            {t(rankedDisabled ? "ranked.season.savedDeck" : "ranked.season.unsupportedFormat")}
          </span>
        ) : null}
        {ranked ? (
          <div className="ranked-start__rules">
            <span>{format === "standard" ? "Standard" : format}</span>
            <span>
              <Icons.Clock size={14} />
              {t("ranked.season.clock")}
            </span>
          </div>
        ) : null}
      </div>
      {signInRequired ? (
        <div role="alert" className="ranked-start__error">
          {t("ranked.signInFirst")}
        </div>
      ) : null}
    </div>
  );
}

import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import "./RankedQueueSwitch.css";

export function RankedQueueSwitch({
  ranked,
  rankedAvailable,
  rankedUnavailableReason,
  onRankedChange,
}: {
  ranked: boolean;
  rankedAvailable: boolean;
  rankedUnavailableReason?: string;
  onRankedChange: (ranked: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="ranked-queue-switch" role="radiogroup" aria-label={t("ranked.queue.mode")}>
      <button
        type="button"
        role="radio"
        aria-checked={!ranked}
        className="ranked-queue-switch__option"
        onClick={() => onRankedChange(false)}
      >
        <Icons.Swords size={14} />
        <span>{t("ranked.queue.casual")}</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={ranked}
        className="ranked-queue-switch__option"
        disabled={!rankedAvailable}
        title={rankedAvailable ? undefined : rankedUnavailableReason}
        onClick={() => onRankedChange(true)}
      >
        <Icons.Trophy size={14} />
        <span>{t("ranked.queue.ranked")}</span>
      </button>
    </div>
  );
}

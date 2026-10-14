import { Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import type { RematchView } from "@/game/getRematchView";
import { SeriesNextGame } from "@/game/overlay/match/SeriesStatus";
import "@/game/overlay/match/seriesStatus.css";

export interface RematchProps {
  view: RematchView;
  opponentName: string;
  onOffer: () => void;
  onAnswer: (accept: boolean) => void;
  onChooseTurnOrder: (goFirst: boolean) => void;
}

export function RematchPanel({ view, opponentName, onOffer, onAnswer, onChooseTurnOrder }: RematchProps) {
  const { t } = useTranslation();
  if (view.stage === "accepted" && view.series) {
    return <SeriesNextGame series={view.series} opponentName={opponentName} onChooseTurnOrder={onChooseTurnOrder} />;
  }
  if (view.stage === "open") {
    return (
      <div className="series-next">
        <Button full variant="secondary" icon={Icons.RotateCcw} onClick={onOffer}>
          {t("overlay.rematch.offer", { name: opponentName })}
        </Button>
        <p className="series-next__detail">{t("overlay.rematch.hint")}</p>
      </div>
    );
  }
  if (view.stage === "offeredToYou") {
    return (
      <div className="series-next" role="status">
        <p className="series-next__title">{t("overlay.rematch.incoming", { name: opponentName })}</p>
        <p className="series-next__detail">{t("overlay.rematch.hint")}</p>
        <div className="game-actions-row">
          <Button full icon={Icons.Check} onClick={() => onAnswer(true)}>
            {t("overlay.rematch.accept")}
          </Button>
          <Button full variant="secondary" icon={Icons.X} onClick={() => onAnswer(false)}>
            {t("overlay.rematch.decline")}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="series-next" role="status">
      <p className="series-next__detail">{t(STATUS_KEYS[view.stage], { name: opponentName })}</p>
    </div>
  );
}

const STATUS_KEYS = {
  offeredByYou: "overlay.rematch.waiting",
  declined: "overlay.rematch.declined",
  closed: "overlay.rematch.closed",
  accepted: "overlay.rematch.closed",
} as const;

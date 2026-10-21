import { Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import type { RematchView } from "@/game/getRematchView";
import { SeriesNextGame } from "@/game/overlay/match/SeriesStatus";
import { SeriesDeckSelection } from "@/game/overlay/match/SeriesDeckSelection";
import type { ReactNode } from "react";
import { RematchMode } from "@aegis/shared/protocol/RematchMode";
import "@/game/overlay/match/seriesStatus.css";

export interface RematchProps {
  view: RematchView;
  opponentName: string;
  onOffer: (mode: RematchMode) => void;
  onAnswer: (accept: boolean) => void;
  onChooseTurnOrder: (goFirst: boolean) => void;
  onKeepDeck: () => void;
  deckPicker?: (onClose: () => void) => ReactNode;
}

type RematchPanelProps = Omit<RematchProps, "deckPicker"> & {
  onChangeDeck?: () => void;
};

export function RematchPanel({
  view,
  opponentName,
  onOffer,
  onAnswer,
  onChooseTurnOrder,
  onKeepDeck,
  onChangeDeck,
}: RematchPanelProps) {
  const { t } = useTranslation();
  if (view.stage === "accepted" && view.series?.stage === "deckSelection") {
    return (
      <SeriesDeckSelection
        series={view.series}
        opponentName={opponentName}
        onKeepDeck={onKeepDeck}
        onChangeDeck={onChangeDeck}
      />
    );
  }
  if (view.stage === "accepted" && view.series) {
    return <SeriesNextGame series={view.series} opponentName={opponentName} onChooseTurnOrder={onChooseTurnOrder} />;
  }
  if (view.stage === "open") {
    return (
      <div className="series-next">
        <p className="series-next__title">{t("overlay.rematch.title", { name: opponentName })}</p>
        <div className="series-next__options">
          {MODE_OPTIONS.filter((option) => view.modes.includes(option.mode)).map((option) => (
            <div key={option.mode} className="series-next__option">
              <Button full variant="secondary" icon={option.icon} onClick={() => onOffer(option.mode)}>
                {t(option.labelKey)}
              </Button>
              <p className="series-next__detail">{t(option.hintKey)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (view.stage === "offeredToYou") {
    const option = MODE_OPTIONS.find((entry) => entry.mode === view.mode) ?? MODE_OPTIONS[1];
    return (
      <div className="series-next" role="status">
        <p className="series-next__title">{t(option.incomingKey, { name: opponentName })}</p>
        <p className="series-next__detail">{t(option.hintKey)}</p>
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

const MODE_OPTIONS = [
  {
    mode: RematchMode.FINISH_SERIES.value,
    icon: Icons.Trophy,
    labelKey: "overlay.rematch.finish",
    hintKey: "overlay.rematch.finishHint",
    incomingKey: "overlay.rematch.incomingFinish",
  },
  {
    mode: RematchMode.NEW_SERIES.value,
    icon: Icons.RotateCcw,
    labelKey: "overlay.rematch.new",
    hintKey: "overlay.rematch.newHint",
    incomingKey: "overlay.rematch.incomingNew",
  },
] as const;

const STATUS_KEYS = {
  offeredByYou: "overlay.rematch.waiting",
  declined: "overlay.rematch.declined",
  closed: "overlay.rematch.closed",
  accepted: "overlay.rematch.closed",
} as const;

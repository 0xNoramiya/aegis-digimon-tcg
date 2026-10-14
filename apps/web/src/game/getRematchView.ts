import { RematchStatus } from "@aegis/shared/protocol/RematchStatus";
import type { SeriesState } from "@aegis/shared/schema/GameState";
import type { Seat } from "@aegis/shared/schema/enums";
import { seriesView, type SeriesView } from "@/game/seriesModel";

export type RematchStage = "open" | "offeredByYou" | "offeredToYou" | "declined" | "closed" | "accepted";

export interface RematchView {
  stage: RematchStage;
  series: SeriesView | undefined;
}

type GetRematchViewParams = {
  series: SeriesState | undefined;
  viewerSeat: Seat;
};

export function getRematchView({ series, viewerSeat }: GetRematchViewParams): RematchView | undefined {
  if (!series || series.rematchStatus === RematchStatus.NONE.value) {
    return undefined;
  }
  const stage = getRematchStage(series, viewerSeat);
  return { stage, series: stage === "accepted" ? seriesView(series, viewerSeat) : undefined };
}

function getRematchStage(series: SeriesState, viewerSeat: Seat): RematchStage {
  switch (series.rematchStatus) {
    case RematchStatus.OPEN.value:
      return "open";
    case RematchStatus.OFFERED.value:
      return series.rematchOfferSeat === viewerSeat ? "offeredByYou" : "offeredToYou";
    case RematchStatus.DECLINED.value:
      return "declined";
    case RematchStatus.ACCEPTED.value:
      return series.phase === "over" ? "closed" : "accepted";
    default:
      return "closed";
  }
}

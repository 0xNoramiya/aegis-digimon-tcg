import type { Permanent, PreventionKeyword } from "@aegis/shared";
import type { GameEngine } from "#api/engine/GameEngine";

type KeywordDeletionPreventedParams = {
  keyword: PreventionKeyword;
  saved: Permanent;
  paid?: Permanent;
};

export function emitKeywordDeletionPrevented(
  engine: GameEngine,
  { keyword, saved, paid }: KeywordDeletionPreventedParams,
): void {
  engine.hooks.emit({
    kind: "deletionPrevented",
    keyword,
    seat: saved.controllerSeat,
    permanentId: saved.permanentId,
    ...(saved.topCard === undefined ? {} : { cardId: saved.topCard.cardId }),
    ...(paid === undefined ? {} : { paidPermanentId: paid.permanentId }),
    ...(paid?.topCard === undefined ? {} : { paidCardId: paid.topCard.cardId }),
  });
}

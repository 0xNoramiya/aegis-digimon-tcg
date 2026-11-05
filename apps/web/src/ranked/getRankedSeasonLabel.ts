import type { Translate } from "@/i18n/translationTypes";
import { isRankedBetaSeason } from "@/ranked/isRankedBetaSeason";

type Params = { seasonId: number; t: Translate };

export function getRankedSeasonLabel({ seasonId, t }: Params): string {
  if (isRankedBetaSeason(seasonId)) {
    return t("ranked.season.beta");
  }
  return t("ranked.season.number", { number: seasonId - 1 });
}

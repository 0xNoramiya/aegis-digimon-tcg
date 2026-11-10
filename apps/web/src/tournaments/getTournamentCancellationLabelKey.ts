import { TournamentCancellationReason } from "@aegis/shared/tournaments/TournamentCancellationReason";
import type { TranslationKey } from "@/i18n/translationTypes";

export function getTournamentCancellationLabelKey(reason: TournamentCancellationReason): TranslationKey {
  const entry =
    Object.values(TournamentCancellationReason).find((option) => option.value === reason) ??
    TournamentCancellationReason.ORGANIZER;
  return entry.labelKey;
}

import { TournamentCancellationReason } from "#shared/tournaments/TournamentCancellationReason";

export function isTournamentCancellationReason(value: unknown): value is TournamentCancellationReason {
  return (
    typeof value === "string" && Object.values(TournamentCancellationReason).some((reason) => reason.value === value)
  );
}

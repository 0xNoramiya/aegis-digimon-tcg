export const TournamentCancellationReason = {
  ORGANIZER_NO_SHOW: {
    name: "ORGANIZER_NO_SHOW",
    value: "organizer_no_show",
    labelKey: "tournaments.cancellation.organizerNoShow",
  },
  BELOW_MINIMUM: { name: "BELOW_MINIMUM", value: "below_minimum", labelKey: "tournaments.cancellation.belowMinimum" },
  ORGANIZER: { name: "ORGANIZER", value: "cancelled", labelKey: "tournaments.cancellation.organizer" },
} as const;

export type TournamentCancellationReason =
  (typeof TournamentCancellationReason)[keyof typeof TournamentCancellationReason]["value"];

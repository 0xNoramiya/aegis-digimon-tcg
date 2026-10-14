export const ConnectionDropOutcome = {
  PENDING: { name: "PENDING", value: "pending" },
  RECONNECTED: { name: "RECONNECTED", value: "reconnected" },
  EXPIRED: { name: "EXPIRED", value: "expired" },
} as const;

export type ConnectionDropOutcome = (typeof ConnectionDropOutcome)[keyof typeof ConnectionDropOutcome]["value"];

export type ResolvedConnectionDropOutcome = Exclude<ConnectionDropOutcome, typeof ConnectionDropOutcome.PENDING.value>;

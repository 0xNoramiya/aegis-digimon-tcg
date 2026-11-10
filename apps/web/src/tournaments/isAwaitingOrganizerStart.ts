import type { TournamentDetail } from "@/tournaments/types";

type Params = {
  status: TournamentDetail["status"];
  startsAt: number;
  circuitId: string | null | undefined;
  now: number;
};

export function isAwaitingOrganizerStart({ status, startsAt, circuitId, now }: Params): boolean {
  if (status !== "registration" && status !== "check_in") return false;
  if (circuitId) return false;
  return now >= startsAt;
}

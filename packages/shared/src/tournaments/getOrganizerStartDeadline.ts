import { ORGANIZER_START_GRACE_MS } from "#shared/tournaments/ORGANIZER_START_GRACE_MS";

export function getOrganizerStartDeadline(startsAt: number): number {
  return startsAt + ORGANIZER_START_GRACE_MS;
}

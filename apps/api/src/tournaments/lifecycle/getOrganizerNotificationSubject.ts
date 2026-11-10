export function getOrganizerNotificationSubject(tournamentId: string): string {
  return `tournament_organizer:${tournamentId}`;
}

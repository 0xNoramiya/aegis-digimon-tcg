export type TournamentStartOverdueNotification = {
  tournamentId: string;
  tournamentName: string;
  cancelsAt: number;
};

export type TournamentExpiredNotification = {
  tournamentId: string;
  tournamentName: string;
};

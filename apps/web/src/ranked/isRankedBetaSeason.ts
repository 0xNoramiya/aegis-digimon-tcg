const BETA_SEASON_ID = 1;

export function isRankedBetaSeason(seasonId: number): boolean {
  return seasonId === BETA_SEASON_ID;
}

import type { RankedDiscordStatus } from "#shared/ranked/RankedDiscordStatus";
import type { DeckFormat } from "#shared/deckFormat";
import type { RankedTier } from "#shared/ranked/RankedTier";
import type { RankedRegion } from "#shared/ranked/RankedRegion";
import type { RankedQueueStatus } from "#shared/ranked/RankedQueueStatus";

export type RankedSeason = { id: number; startsAt: number; endsAt: number; finalized: boolean };
export type RankedQueueView = {
  status: RankedQueueStatus;
  searchId?: string;
  queuedAt?: number;
  format?: DeckFormat;
  region?: RankedRegion;
  rating?: number;
  pairId?: string;
  roomId?: string;
  token?: string;
  slot?: string;
};
export type RankedStanding = {
  accountId: string;
  displayName: string;
  position: number | null;
  rating: number;
  peakRating: number | null;
  tier: RankedTier;
  region: RankedRegion;
  wins: number;
  losses: number;
  draws: number;
  games: number;
  winrate: number | null;
  provisional: boolean;
};
export type RankedLeaderboard = {
  season: RankedSeason;
  entries: RankedStanding[];
  mine: RankedStanding | null;
  page: number;
  total: number;
};
export type RankedReward = {
  seasonId: number;
  tier: RankedTier;
  equipped: boolean;
  grantedAt: number;
};
export type RankedRewards = {
  items: RankedReward[];
  discordEnabled: boolean;
  discordOptIn: boolean;
  discordStatus: RankedDiscordStatus | null;
  discordAttempts: number;
};
export type RankedMatchup = {
  archetype: string;
  opponentArchetype: string;
  games: number;
  players: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number | null;
};

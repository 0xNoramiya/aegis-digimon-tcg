import type { DeckFormat } from "../deckFormat.js";

export const LIVE_MATCH_SPECTATOR_LIMIT = 20;
export const LIVE_MATCH_PAGE_SIZE = 10;
export const LIVE_MATCH_MAX_PAGE_SIZE = 50;

export type LiveMatch = {
  spectatorCode: string;
  players: string[];
  format: DeckFormat;
  startedAt: number;
  spectators: number;
};

export type LiveMatchPage = {
  matches: LiveMatch[];
  total: number;
};

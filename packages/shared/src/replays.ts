import type { GameState } from "./schema/GameState.js";
import type { Seat } from "./schema/enums.js";
import type { SequencedServerEvent } from "./protocol/events.js";

export const REPLAY_CHANNEL = "replay";
export const REPLAY_FORMAT_VERSION = 1;
export const MAX_REPLAY_BYTES = 32 * 1024 * 1024;
/** Default and largest page of `GET /account/replays`. */
export const REPLAY_PAGE_SIZE = 20;
export const MAX_REPLAY_PAGE_SIZE = 50;

/**
 * One entry of the player's replay index. The file itself lives only in the player's Google
 * Drive (`driveFileId`); the server keeps the metadata so every device can list the library.
 */
export interface SavedReplay {
  id: string;
  matchId: string;
  summary: ReplaySummary;
  viewerSeat: Seat;
  bytes: number;
  savedAt: number;
  driveFileId: string;
  visibility: "private" | "public";
}

export interface ReplayLibraryPage {
  replays: SavedReplay[];
  /** Present while older saved replays remain. */
  nextCursor?: string;
  /** The server can serve public replays from Drive; without it the share control is hidden. */
  sharing: boolean;
}

/** `GET /replays/:id`: the owner reads the file from Drive with their own token; others use the proxy. */
export interface SharedReplay extends SavedReplay {
  owned: boolean;
}

/** Plain serialized state; consumers read fields and never call Schema methods. */
export interface ReplayFrame {
  atMs: number;
  state: GameState;
  events: SequencedServerEvent[];
}

export interface ReplaySummary {
  id: string;
  players: [string, string];
  mode: "casual" | "private" | "ranked" | "bot" | "tournament" | "unlimited" | "beta";
  startedAt: number;
  finishedAt: number;
  winnerSeat: number;
  frameCount: number;
}

/** Completed participant recording; visibleHandSeats declares the hands included in the file. */
export interface MatchReplay extends ReplaySummary {
  format: "aegis-replay";
  version: typeof REPLAY_FORMAT_VERSION;
  frames: ReplayFrame[];
  viewerSeat: Seat;
  visibleHandSeats: Seat[];
}

/** Only the corresponding participant receives this message; observers receive no file. */
export type ReplayDownloadMessage =
  | {
      kind: "ready";
      summary: ReplaySummary;
      viewerSeat: Seat;
      /** The server-side index entry, sent only to a signed-in participant, so the client can attach its Drive copy. */
      indexId?: string;
      /** gzip-compressed UTF-8 JSON, base64 encoded for the Colyseus channel. */
      data: string;
    }
  | { kind: "unavailable"; reason: "recording_limit" };

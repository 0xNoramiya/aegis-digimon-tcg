import { readFile } from "node:fs/promises";
import { extractReplay, ReplayExtractionError } from "#api/replays/inputs/extract";
import { matchReplayLogPath } from "#api/replays/inputs/matchReplayLogPath";
import type { ReplayRecord } from "#api/replays/inputs/types";

export async function extractReplayFromMatchLog({
  logDirectory,
  matchId,
  signal,
}: {
  logDirectory: string;
  matchId: string;
  signal?: AbortSignal;
}): Promise<ReplayRecord> {
  const path = matchReplayLogPath({ logDirectory, matchId });
  if (!path) throw new ReplayExtractionError(`Not a match id: ${JSON.stringify(matchId.slice(0, 64))}`);
  const contents = await readFile(path, { encoding: "utf8", ...(signal ? { signal } : {}) });
  return extractReplay(contents.split("\n"), matchId);
}

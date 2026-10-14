import { join } from "node:path";
import { matchReplayLogDirectory } from "#api/replays/inputs/matchReplayLogDirectory";

const MATCH_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function matchReplayLogPath({
  logDirectory,
  matchId,
}: {
  logDirectory: string;
  matchId: string;
}): string | undefined {
  if (!MATCH_ID.test(matchId)) return undefined;
  return join(matchReplayLogDirectory(logDirectory), `${matchId}.jsonl`);
}

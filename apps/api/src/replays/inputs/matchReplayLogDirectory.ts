import { join } from "node:path";

export function matchReplayLogDirectory(logDirectory: string): string {
  return join(logDirectory, "replays");
}

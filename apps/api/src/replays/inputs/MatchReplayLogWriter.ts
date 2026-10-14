import { appendFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { LOG_RETENTION_MS } from "#api/logRetentionMs";
import { matchReplayLogDirectory } from "#api/replays/inputs/matchReplayLogDirectory";
import { matchReplayLogPath } from "#api/replays/inputs/matchReplayLogPath";

const MATCH_REPLAY_LOG = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/;
const PRUNE_INTERVAL_MS = 60_000;

function reportFailure(error: unknown): void {
  process.stderr.write(`[logger] match replay log failure: ${String(error)}\n`);
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

export class MatchReplayLogWriter {
  private readonly directory: string;
  private readonly queues = new Map<string, Promise<void>>();
  private readonly timer: ReturnType<typeof setInterval>;

  constructor(
    private readonly logDirectory: string,
    private readonly report: (error: unknown) => void = reportFailure,
  ) {
    this.directory = matchReplayLogDirectory(logDirectory);
    this.timer = setInterval(() => void this.prune(), PRUNE_INTERVAL_MS);
    this.timer.unref();
    void this.prune();
  }

  readonly write = (matchId: string, line: string): void => {
    const path = matchReplayLogPath({ logDirectory: this.logDirectory, matchId });
    if (!path) return;
    const queued = (this.queues.get(matchId) ?? Promise.resolve())
      .then(() => this.append(path, line))
      .catch((error: unknown) => this.report(error));
    this.queues.set(matchId, queued);
    void queued.then(() => {
      if (this.queues.get(matchId) === queued) this.queues.delete(matchId);
    });
  };

  async prune(now = Date.now()): Promise<void> {
    try {
      const names = await readdir(this.directory).catch((error: unknown) => {
        if (isMissing(error)) return [];
        throw error;
      });
      for (const name of names) {
        if (!MATCH_REPLAY_LOG.test(name)) continue;
        const path = join(this.directory, name);
        const info = await stat(path).catch(() => undefined);
        if (info && info.mtimeMs <= now - LOG_RETENTION_MS) await rm(path, { force: true });
      }
    } catch (error) {
      this.report(error);
    }
  }

  async close(): Promise<void> {
    clearInterval(this.timer);
    await Promise.all(this.queues.values());
  }

  private async append(path: string, line: string): Promise<void> {
    try {
      await appendFile(path, line);
    } catch (error) {
      if (!isMissing(error)) throw error;
      await mkdir(this.directory, { recursive: true });
      await appendFile(path, line);
    }
  }
}

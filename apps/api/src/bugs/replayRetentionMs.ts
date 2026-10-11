const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_REPLAY_RETENTION_DAYS = 30;

export function replayRetentionMs(env: NodeJS.ProcessEnv = process.env): number {
  const days = Number(env.AEGIS_REPLAY_RETENTION_DAYS);
  return (Number.isFinite(days) && days > 0 ? days : DEFAULT_REPLAY_RETENTION_DAYS) * DAY_MS;
}

export function hasDatabaseConfig(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.DATABASE_URL || env.PGHOST || env.PGDATABASE || env.PGSERVICE);
}

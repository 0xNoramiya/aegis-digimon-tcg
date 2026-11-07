import type { RankedConfig } from "@aegis/shared/ranked/RankedContracts";
import { getRankedSeason } from "#api/ranked/getRankedSeason";

type Params = { env?: NodeJS.ProcessEnv; now?: number };

export function getRankedConfig({ env = process.env, now = Date.now() }: Params = {}): RankedConfig {
  const season = getRankedSeason(now);
  const formats = now < season.startsAt ? [] : season.formats;
  return { enabled: env.AEGIS_RANKED_ENABLED === "true", formats };
}

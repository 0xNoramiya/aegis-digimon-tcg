import { isDeckFormat, formatIsUnlimited } from "@aegis/shared/deckFormat";
import type { DeckFormat } from "@aegis/shared/deckFormat";

type Params = { env?: NodeJS.ProcessEnv };

export function getRankedConfig({ env = process.env }: Params = {}): { enabled: boolean; formats: DeckFormat[] } {
  const formats = (env.AEGIS_RANKED_FORMATS ?? "standard")
    .split(",")
    .filter((value): value is DeckFormat => isDeckFormat(value) && !formatIsUnlimited(value));
  return { enabled: env.AEGIS_RANKED_ENABLED === "true", formats };
}

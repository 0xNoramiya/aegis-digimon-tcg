import type { BotDifficulty } from "@aegis/shared/bot/BotDifficulty";
import type { BotStyle } from "@aegis/shared/bot/BotStyle";
import { BOT_LEVEL_CONFIGS } from "#api/bot/levels/BOT_LEVEL_CONFIGS";
import { weakenWeights } from "#api/bot/levels/weakenWeights";
import { BOT_PROFILES, type BotProfile } from "#api/bot/profiles";

type Params = {
  difficulty: BotDifficulty;
  style: BotStyle;
};

export function createLevelProfile({ difficulty, style }: Params): BotProfile {
  const scales = BOT_LEVEL_CONFIGS[difficulty].weightScales;
  const profile = BOT_PROFILES[style];
  if (Object.keys(scales).length === 0) {
    return profile;
  }
  return { ...profile, weights: weakenWeights({ weights: profile.weights, scales }) };
}

import type { BotDifficulty } from "@aegis/shared/bot/BotDifficulty";
import type { BotStyle } from "@aegis/shared/bot/BotStyle";
import { BOT_LEVEL_CONFIGS } from "#api/bot/levels/BOT_LEVEL_CONFIGS";
import { STYLE_TEMPERATURE_SCALES } from "#api/bot/levels/STYLE_TEMPERATURE_SCALES";

type Params = {
  difficulty: BotDifficulty;
  style: BotStyle;
};

export function levelTemperature({ difficulty, style }: Params): number {
  return BOT_LEVEL_CONFIGS[difficulty].temperature * STYLE_TEMPERATURE_SCALES[style];
}

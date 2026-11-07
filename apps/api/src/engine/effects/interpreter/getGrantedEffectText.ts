import type { CardEffect } from "@aegis/shared";
import { describeEffect } from "#api/engine/effects/interpreter/describe";
import { GRANTED_EFFECT_LIBRARY } from "#api/engine/effects/interpreter/grantedEffects";

export function getGrantedEffectText(token: string): string {
  if (token.startsWith("[")) return token;
  const libraryEntry = GRANTED_EFFECT_LIBRARY[token];
  const effects: readonly CardEffect[] =
    libraryEntry === undefined ? [] : Array.isArray(libraryEntry) ? libraryEntry : [libraryEntry as CardEffect];
  return effects.length === 0 ? token : effects.map(describeEffect).join(" ");
}

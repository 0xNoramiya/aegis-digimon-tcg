import { expect, it } from "vitest";
import { allCards } from "@aegis/shared/cards/registry";
import { effectClausesForTiming, TIMING_LABELS } from "@/game/overlay/effectText";
import { loadPrintedCardTranslations } from "@/i18n/loadPrintedCardTranslations";
import { getTranslatedCardText } from "@/i18n/getTranslatedCardText";
import { normalizePrintedTextKey } from "@/i18n/normalizePrintedTextKey";

it("covers every recognized resolving clause in the current Chinese catalog", async () => {
  const translations = await loadPrintedCardTranslations();
  const missing: string[] = [];
  for (const card of allCards()) {
    for (const full of [
      card.effectText,
      card.inheritedEffectText,
      card.securityEffectText,
      card.optionEffect,
      card.linkEffect,
    ]) {
      if (!full) {
        continue;
      }
      const seen = new Set<string>();
      for (const [timing, label] of Object.entries(TIMING_LABELS)) {
        if (label === "Rule") {
          continue;
        }
        for (const text of effectClausesForTiming(full, timing)) {
          const key = normalizePrintedTextKey(text);
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          if (getTranslatedCardText({ text, cardId: card.cardId, translations }) === text) {
            missing.push(`${card.cardId}: ${timing}: ${key}`);
          }
        }
      }
    }
  }
  expect(missing).toEqual([]);
});

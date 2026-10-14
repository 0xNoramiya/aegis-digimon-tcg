import { requireCardDefinition, type Permanent } from "@aegis/shared";
import { decoySpecFromText } from "#api/engine/combat/keywords";
import type { ContinuousEffectLedger } from "#api/engine/effects/continuous";

export type DecoySource = {
  sourceCardId: string;
  effectText: string;
  specifiers: readonly string[] | undefined;
};

export function listDecoySources(continuous: ContinuousEffectLedger, holder: Permanent): DecoySource[] {
  const grants = continuous.keywordGrantSources(holder.permanentId, "Decoy");
  const provenances =
    grants.length > 0
      ? grants
      : [
          {
            sourceCardId: holder.topCard.cardId,
            effectText: requireCardDefinition(holder.topCard.cardId).effectText,
            specifiers: continuous.keywordSpecifiers(holder.permanentId, "Decoy"),
          },
        ];
  return provenances.map((source) => {
    const sourceCardId = source.sourceCardId ?? holder.topCard.cardId;
    const effectText = source.effectText ?? requireCardDefinition(sourceCardId).effectText ?? "";
    return { sourceCardId, effectText, specifiers: source.specifiers ?? decoySpecFromText(effectText) };
  });
}

import type { CardDefinition } from "@aegis/shared";
import { decoyMatches, decoySpecMatches } from "#api/engine/combat/keywords";
import type { DecoySource } from "#api/engine/effects/listDecoySources";

export function isDecoySourceProtecting(source: DecoySource, targetDefinition: CardDefinition): boolean {
  return source.specifiers !== undefined && source.specifiers.length > 0
    ? decoySpecMatches(source.specifiers, targetDefinition)
    : decoyMatches(source.sourceCardId, targetDefinition);
}

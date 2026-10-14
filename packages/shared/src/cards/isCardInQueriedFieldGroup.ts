import { effectiveStaticTraits, sameTrait } from "#shared/cards/effectiveTraits";
import { findFieldGroupTraitsInQuery } from "#shared/cards/findFieldGroupTraitsInQuery";
import type { CardDefinition } from "#shared/cards/types";

type Params = {
  card: Pick<CardDefinition, "forms" | "attributes" | "types" | "effectText">;
  query: string;
};

export function isCardInQueriedFieldGroup({ card, query }: Params): boolean {
  const groupTraits = findFieldGroupTraitsInQuery(query);
  if (groupTraits.length === 0) {
    return false;
  }
  return effectiveStaticTraits(card).some((trait) => groupTraits.some((groupTrait) => sameTrait(trait, groupTrait)));
}

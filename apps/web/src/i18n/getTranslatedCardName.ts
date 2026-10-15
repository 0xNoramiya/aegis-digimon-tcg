import { getDictionaryValue } from "@/i18n/getDictionaryValue";
import type { CardTranslationData } from "@/i18n/cardTranslationTypes";

type Params = { name: string; translations?: CardTranslationData };

export function getTranslatedCardName({ name, translations }: Params): string {
  return getDictionaryValue({ dictionary: translations?.names, key: name }) || name;
}

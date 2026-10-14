import { FieldGroup } from "#shared/cards/FieldGroup";
import { traitKey } from "#shared/cards/effectiveTraits";

function getWords(text: string): string[] {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

type WordSequenceParams = {
  words: readonly string[];
  sequence: readonly string[];
};

function containsWordSequence({ words, sequence }: WordSequenceParams): boolean {
  for (let start = 0; start + sequence.length <= words.length; start += 1) {
    if (sequence.every((word, offset) => words[start + offset] === word)) {
      return true;
    }
  }
  return false;
}

const searchableFieldGroups = Object.values(FieldGroup).map((group) => ({
  trait: group.value,
  abbreviation: traitKey(group.value),
  labelWords: getWords(group.label),
}));

export function findFieldGroupTraitsInQuery(query: string): FieldGroup[] {
  const words = getWords(query);
  if (words.length === 0) {
    return [];
  }
  return searchableFieldGroups
    .filter(
      (group) => words.includes(group.abbreviation) || containsWordSequence({ words, sequence: group.labelWords }),
    )
    .map((group) => group.trait);
}

import { KeywordReaction } from "#api/engine/effects/KeywordReaction";

const precedingActivationIdentities = new Set<string>(
  Object.values(KeywordReaction)
    .filter((reaction) => reaction.precedesCardReactions)
    .map((reaction) => reaction.value),
);

export function isKeywordReactionPrecedingCardReactions(activationIdentity: string | undefined): boolean {
  return activationIdentity !== undefined && precedingActivationIdentities.has(activationIdentity);
}

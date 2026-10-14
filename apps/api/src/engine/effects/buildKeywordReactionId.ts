import type { KeywordReaction, KeywordReactionId } from "#api/engine/effects/KeywordReaction";

export function buildKeywordReactionId(reaction: KeywordReaction, permanentId: string): KeywordReactionId {
  return `${reaction}/${permanentId}`;
}

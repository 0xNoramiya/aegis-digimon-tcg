import type { Feature, HeuristicProgram } from "#api/bot/evolution/heuristic";

export function scoreFastHeuristic(
  program: HeuristicProgram,
  features: Record<Feature, number>,
  kind: string,
  sourceCardId?: string,
): number {
  let score = 0;
  for (const rule of program.rules) {
    const condition = rule.when;
    const matches =
      condition === undefined ||
      ((condition.kind === undefined || condition.kind === kind) &&
        (condition.sourceCardIds === undefined ||
          (sourceCardId !== undefined && condition.sourceCardIds.includes(sourceCardId))) &&
        Object.entries(condition.minimum ?? {}).every(([feature, limit]) => features[feature as Feature] >= limit!) &&
        Object.entries(condition.maximum ?? {}).every(([feature, limit]) => features[feature as Feature] <= limit!));
    score += matches ? features[rule.feature] * rule.weight : 0;
  }
  return score;
}

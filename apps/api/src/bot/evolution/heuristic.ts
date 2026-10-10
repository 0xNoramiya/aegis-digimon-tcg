import { CardKind } from "@aegis/shared";
import type { TrainingWindow } from "../training/policy.js";

/** GEPA evolves data, never executable code. Guides come from these same rules. */
export const FEATURES = [
  "bias",
  "cost",
  "handover",
  "attackPlayer",
  "lethal",
  "attackWinningBattle",
  "attackLosingBattle",
  "digivolve",
  "breedingGrowth",
  "levelGain",
  "dpGain",
  "playBody",
  "playTamer",
  "playOption",
  "opponentBodies",
  "hatch",
  "deploy",
  "sourceLevel",
  "sourceDp",
  "targetDp",
  "ownSecurity",
  "opponentSecurity",
  "block",
  "criticalBlock",
  "accept",
  "finish",
  "pass",
  "openingRookie",
] as const;
export type Feature = (typeof FEATURES)[number];
export interface HeuristicRule {
  feature: Feature;
  weight: number;
  advice: string;
}
export interface HeuristicProgram {
  schemaVersion: 1;
  title: string;
  rules: HeuristicRule[];
}

export function parseHeuristic(value: unknown): HeuristicProgram {
  if (typeof value !== "object" || value === null) throw new Error("Expected heuristic object");
  const program = value as HeuristicProgram;
  if (
    program.schemaVersion !== 1 ||
    typeof program.title !== "string" ||
    !program.title.trim() ||
    program.title.length > 120
  )
    throw new Error("Invalid heuristic version or title");
  if (!Array.isArray(program.rules) || program.rules.length === 0 || program.rules.length > 100)
    throw new Error("Expected 1–100 heuristic rules");
  for (const rule of program.rules) {
    if (
      typeof rule !== "object" ||
      rule === null ||
      !FEATURES.includes(rule.feature) ||
      !Number.isFinite(rule.weight) ||
      Math.abs(rule.weight) > 10000 ||
      typeof rule.advice !== "string" ||
      !rule.advice.trim() ||
      rule.advice.length > 600
    )
      throw new Error("Invalid heuristic rule");
  }
  return { schemaVersion: 1, title: program.title, rules: program.rules.map((rule) => ({ ...rule })) };
}

export function actionFeatures(window: TrainingWindow, index: number): Record<Feature, number> {
  const action = window.actions[index];
  if (action === undefined) throw new Error("Action is outside legal choices");
  const features = Object.fromEntries(FEATURES.map((key) => [key, 0])) as Record<Feature, number>;
  const own = window.observation.players.find((player) => player.seat === window.observation.seat)!;
  const enemy = window.observation.players.find((player) => player.seat !== window.observation.seat)!;
  const ownUnits = [...own.board, ...(own.breeding === undefined ? [] : [own.breeding])];
  const units = [...ownUnits, ...enemy.board];
  const source = units.find((unit) => unit.permanentId === action.sourceId);
  const target = units.find((unit) => unit.permanentId === action.targetId);
  const card = [...own.hand, ...own.trash, ...window.observation.revealed].find(
    (entry) => entry.instanceId === action.sourceId,
  );
  features.bias = 1;
  features.cost = action.projectedCost ?? 0;
  features.handover = Math.max(0, features.cost - window.observation.memory);
  features.sourceLevel = source?.top.level ?? card?.level ?? 0;
  features.sourceDp = (source?.dp ?? card?.dp ?? 0) / 1000;
  features.targetDp = (target?.dp ?? 0) / 1000;
  features.ownSecurity = own.securityCount;
  features.opponentSecurity = enemy.securityCount;
  features.opponentBodies = enemy.board.length;
  const intent = action.intent;
  if (intent.type === "attack") {
    features.attackPlayer = Number(intent.target.kind === "player");
    // This expresses an opportunity, not certainty: blockers/counters can stop it.
    features.lethal = Number(intent.target.kind === "player" && enemy.securityCount === 0);
    features.attackWinningBattle = Number(
      intent.target.kind === "permanent" && source !== undefined && target !== undefined && source.dp > target.dp,
    );
    features.attackLosingBattle = Number(
      intent.target.kind === "permanent" && source !== undefined && target !== undefined && source.dp <= target.dp,
    );
  }
  if (intent.type === "digivolve") {
    features.digivolve = 1;
    features.breedingGrowth = Number(target?.inBreeding === true);
    features.levelGain = (card?.level ?? 0) - (target?.top.level ?? 0);
    features.dpGain = ((card?.dp ?? 0) - (target?.dp ?? 0)) / 1000;
  }
  if (intent.type === "playCard") {
    features.playBody = Number(card?.kinds?.includes(CardKind.Digimon) === true) * features.sourceDp;
    features.playTamer = Number(card?.kinds?.includes(CardKind.Tamer) === true);
    features.playOption = Number(card?.kinds?.includes(CardKind.Option) === true);
  }
  features.hatch = Number(intent.type === "hatchEgg");
  features.deploy = Number(intent.type === "moveFromBreeding");
  features.pass = Number(intent.type === "endPhase");
  features.block = Number(intent.type === "declareBlock");
  features.criticalBlock = Number(
    intent.type === "declareBlock" && window.combat?.targetsPlayer === true && own.securityCount === 0,
  );
  features.finish = Number(action.label === "Finish selection");
  if (intent.type === "respondEvade" || intent.type === "respondBarrier") features.accept = Number(intent.accept);
  if (intent.type === "respondDecision" && intent.response.kind === "optional")
    features.accept = Number(intent.response.accept);
  if (intent.type === "mulligan")
    features.openingRookie = Number(intent.keep) * (own.hand.some((entry) => entry.level === 3) ? 1 : -1);
  return features;
}

export function rankHeuristic(program: HeuristicProgram, window: TrainingWindow) {
  return window.actions
    .map((_, index) => {
      const features = actionFeatures(window, index);
      const contributions = program.rules.map((rule) => ({ ...rule, value: features[rule.feature] * rule.weight }));
      return { index, score: contributions.reduce((total, rule) => total + rule.value, 0), contributions };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index);
}

export function chooseHeuristic(program: HeuristicProgram, window: TrainingWindow): number {
  const best = rankHeuristic(program, window)[0];
  if (best === undefined) throw new Error("No legal heuristic action");
  return best.index;
}

export const SEED_HEURISTIC: HeuristicProgram = {
  schemaVersion: 1,
  title: "Build safely, spend carefully, finish decisively",
  rules: [
    { feature: "cost", weight: -0.6, advice: "Prefer efficient actions when their outcomes are similar." },
    { feature: "handover", weight: -1.8, advice: "Giving the opponent more memory needs a strong payoff." },
    { feature: "attackPlayer", weight: 4, advice: "Use available attacks to pressure security." },
    {
      feature: "lethal",
      weight: 100,
      advice: "At zero opposing security, look for an attack that can end the game; check blockers and counters first.",
    },
    {
      feature: "attackWinningBattle",
      weight: 5,
      advice: "Attack vulnerable opposing Digimon when your attacker can survive.",
    },
    {
      feature: "attackLosingBattle",
      weight: -8,
      advice: "Avoid battles that sacrifice your attacker without a clear benefit.",
    },
    { feature: "digivolve", weight: 2, advice: "Digivolution develops your line and draws a card." },
    { feature: "breedingGrowth", weight: 2, advice: "Grow a line in breeding while it is protected." },
    { feature: "levelGain", weight: 1.5, advice: "Advance your evolution line toward higher levels." },
    { feature: "dpGain", weight: 0.4, advice: "Value evolution that improves battle strength." },
    { feature: "playBody", weight: 0.6, advice: "Build a board when the memory cost is reasonable." },
    { feature: "playTamer", weight: 2, advice: "Establish Tamers when you can afford the tempo investment." },
    { feature: "hatch", weight: 10, advice: "Hatch when the breeding area is empty." },
    { feature: "deploy", weight: 2, advice: "Move a developed line out to contest the board." },
    { feature: "criticalBlock", weight: 100, advice: "At zero security, prioritize blocking an attack on the player." },
    {
      feature: "accept",
      weight: 1,
      advice: "Consider optional effects and defensive responses when their costs are acceptable.",
    },
    {
      feature: "finish",
      weight: 0.1,
      advice: "Finish optional selections when additional cards do not improve the outcome.",
    },
    { feature: "openingRookie", weight: 5, advice: "Keep an opening hand with a rookie that can start your line." },
  ],
};

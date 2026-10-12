import type { Intent } from "@aegis/shared";

export interface OfferedTriggerKeys {
  decisionId: string;
  triggerKeys?: readonly string[];
}

const legacyKeyPattern = /^(.*?)::subtrigger\/\d+\/(.*)$/s;
const stableKeyPattern = /^(.*?)::subtrigger\/([^/]+)\/(.*)$/s;
const activationSuffixPattern = /\/activation-\d+$/;

function getLegacyShape(key: string): string | undefined {
  const match = legacyKeyPattern.exec(key);
  if (match === null) {
    return undefined;
  }
  return `${match[1]}::${match[2]}`;
}

function getStableShape(key: string): string | undefined {
  const match = stableKeyPattern.exec(key);
  if (match === null || match[2] === "opt" || /^\d+$/.test(match[2]!)) {
    return undefined;
  }
  return `${match[1]}::${match[3]}`;
}

function stripActivationSuffix(shape: string): string {
  return shape.replace(activationSuffixPattern, "");
}

function findStableCandidates(legacyShape: string, offeredKeys: readonly string[]): string[] {
  const shaped = offeredKeys.flatMap((key) => {
    const shape = getStableShape(key);
    return shape === undefined ? [] : [{ key, shape }];
  });
  const exact = shaped.filter(({ shape }) => shape === legacyShape);
  if (exact.length > 0) {
    return exact.map(({ key }) => key);
  }
  const unsuffixed = stripActivationSuffix(legacyShape);
  return shaped.filter(({ shape }) => stripActivationSuffix(shape) === unsuffixed).map(({ key }) => key);
}

function buildTranslations(recordedKeys: readonly string[], offeredKeys: readonly string[]): Map<string, string> {
  const translations = new Map<string, string>();
  for (const key of new Set(recordedKeys)) {
    const shape = getLegacyShape(key);
    if (shape === undefined || offeredKeys.includes(key)) {
      continue;
    }
    const candidates = findStableCandidates(shape, offeredKeys);
    if (candidates.length === 1) {
      translations.set(key, candidates[0]!);
    }
  }
  const targets = [...translations.values()];
  for (const [legacy, stable] of translations) {
    if (targets.indexOf(stable) !== targets.lastIndexOf(stable) || recordedKeys.includes(stable)) {
      translations.delete(legacy);
    }
  }
  return translations;
}

export function translateLegacySubTriggerKeys(intent: Intent, offered: OfferedTriggerKeys | undefined): Intent {
  const offeredKeys = offered?.triggerKeys;
  if (
    intent.type !== "respondDecision" ||
    intent.response.kind !== "orderTriggers" ||
    offeredKeys === undefined ||
    offered?.decisionId !== intent.decisionId
  ) {
    return intent;
  }
  const response = intent.response;
  const answers = response.optionalAnswers;
  const translations = buildTranslations([...response.order, ...Object.keys(answers ?? {})], offeredKeys);
  if (translations.size === 0) {
    return intent;
  }
  const translate = (key: string): string => translations.get(key) ?? key;
  return {
    ...intent,
    response: {
      ...response,
      order: response.order.map(translate),
      ...(answers === undefined
        ? {}
        : {
            optionalAnswers: Object.fromEntries(
              Object.entries(answers).map(([key, accept]) => [translate(key), accept]),
            ),
          }),
    },
  };
}

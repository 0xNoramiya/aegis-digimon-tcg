export interface DecisionPromptKeys {
  readoutPromptKey?: string;
  pingPromptKey?: string;
}

interface ResolveDecisionPromptKeysParams {
  promptKey?: string;
  spectating: boolean;
  opponentTurn: boolean;
  pingEnabled: boolean;
}

export function resolveDecisionPromptKeys({
  promptKey,
  spectating,
  opponentTurn,
  pingEnabled,
}: ResolveDecisionPromptKeysParams): DecisionPromptKeys {
  if (spectating) {
    return {};
  }
  if (!opponentTurn) {
    return { readoutPromptKey: promptKey };
  }
  if (!pingEnabled) {
    return {};
  }
  return { pingPromptKey: promptKey };
}

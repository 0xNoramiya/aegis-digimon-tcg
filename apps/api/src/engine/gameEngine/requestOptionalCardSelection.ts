import type { Seat } from "@aegis/shared";
import type { GameEngine } from "#api/engine/GameEngine";

type OptionalCardSelectionParams = {
  seat: Seat;
  candidateInstanceIds: string[];
  max: number;
  promptText: string;
  source: { sourceCardId: string; sourceInstanceId: string; sourcePermanentId: string };
};

export async function requestOptionalCardSelection(
  engine: GameEngine,
  { seat, candidateInstanceIds, max, promptText, source }: OptionalCardSelectionParams,
): Promise<string[]> {
  const response = await engine.decisions.request({
    seat,
    kind: "selectCards",
    promptText,
    ...source,
    options: { candidateInstanceIds, min: 0, max },
  });
  return response.kind === "selectCards" ? response.instanceIds : [];
}

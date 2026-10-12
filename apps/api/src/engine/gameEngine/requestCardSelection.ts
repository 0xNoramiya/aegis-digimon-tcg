import type { Seat } from "@aegis/shared";
import type { GameEngine } from "#api/engine/GameEngine";

type CardSelectionParams = {
  seat: Seat;
  candidateInstanceIds: string[];
  min: number;
  max: number;
  promptText: string;
  source: { sourceCardId: string; sourceInstanceId: string; sourcePermanentId: string };
};

export async function requestCardSelection(
  engine: GameEngine,
  { seat, candidateInstanceIds, min, max, promptText, source }: CardSelectionParams,
): Promise<string[]> {
  const response = await engine.decisions.request({
    seat,
    kind: "selectCards",
    promptText,
    ...source,
    options: { candidateInstanceIds, min, max },
  });
  return response.kind === "selectCards" ? response.instanceIds : [];
}

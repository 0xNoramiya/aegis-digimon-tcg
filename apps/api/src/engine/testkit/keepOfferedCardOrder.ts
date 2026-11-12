import type { Seat } from "@aegis/shared";
import type { ReplayRun } from "#api/replays/inputs/run";

export async function keepOfferedCardOrder({ replay }: { replay: ReplayRun }): Promise<boolean> {
  const pending = replay.state.pendingDecision;
  if (pending?.kind !== "orderCards") return false;
  const { candidateInstanceIds } = JSON.parse(pending.payloadJson) as { candidateInstanceIds: string[] };
  const result = await replay.applyIntent(pending.seat as Seat, {
    type: "respondDecision",
    decisionId: pending.decisionId,
    response: { kind: "orderCards", order: candidateInstanceIds },
  });
  if (!result.ok) throw new Error(`The offered card order was refused: ${result.reason}`);
  return true;
}

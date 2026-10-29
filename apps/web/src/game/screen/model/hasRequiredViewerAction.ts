import type { Seat } from "@aegis/shared/schema/enums";

type Params = {
  viewerSeat: Seat;
  pendingDecisionSeat?: Seat;
  combatWindowSeat?: Seat;
  presenting: boolean;
  decisionAnimationsPending: boolean;
  effectAwaitingConfirmation: boolean;
};

export function hasRequiredViewerAction({
  viewerSeat,
  pendingDecisionSeat,
  combatWindowSeat,
  presenting,
  decisionAnimationsPending,
  effectAwaitingConfirmation,
}: Params): boolean {
  if (effectAwaitingConfirmation) {
    return true;
  }
  return (
    !presenting && !decisionAnimationsPending && (pendingDecisionSeat === viewerSeat || combatWindowSeat === viewerSeat)
  );
}

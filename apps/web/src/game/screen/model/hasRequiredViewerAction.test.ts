import { expect, it } from "vitest";
import { hasRequiredViewerAction } from "@/game/screen/model/hasRequiredViewerAction";

it.each([
  { label: "own decision", pendingDecisionSeat: 0, expected: true },
  { label: "opponent decision", pendingDecisionSeat: 1, expected: false },
  { label: "own combat response", combatWindowSeat: 0, expected: true },
  { label: "opponent combat response", combatWindowSeat: 1, expected: false },
  { label: "unfinished presentation", combatWindowSeat: 0, presenting: true, expected: false },
  { label: "unfinished decision animation", pendingDecisionSeat: 0, decisionAnimationsPending: true, expected: false },
  { label: "explicit effect confirmation", effectAwaitingConfirmation: true, presenting: true, expected: true },
  { label: "no pending action", expected: false },
] as const)("indicates $label", ({ label: _label, expected, ...input }) => {
  expect(
    hasRequiredViewerAction({
      viewerSeat: 0,
      presenting: false,
      decisionAnimationsPending: false,
      effectAwaitingConfirmation: false,
      ...input,
    }),
  ).toBe(expected);
});

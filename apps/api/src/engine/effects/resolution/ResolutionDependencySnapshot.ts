import type { CardInstance } from "@aegis/shared/schema/CardInstance";
import type { Seat } from "@aegis/shared/schema/enums";
import type { CollectedEffect } from "#api/engine/effects/collect";

export type ResolutionDependencySnapshot = {
  turnSeat: Seat;
  listCandidate: () => readonly CardInstance[];
  outermost?: boolean;
  extraPending?: readonly CollectedEffect[];
  excludeNestedPending?: ReadonlySet<CollectedEffect>;
  derivedPending: CollectedEffect[];
  announced: Set<CollectedEffect>;
};

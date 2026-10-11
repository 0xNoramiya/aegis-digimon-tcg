import type { CandidateZone } from "../../decisionModel";

/** A candidate DecisionOverlay can render: a selectable target, a card to reorder, or both. */
export interface DecisionCandidate {
  instanceId: string;
  cardId?: string;
  artId?: string;
  selectable?: boolean;
  sourceCount?: number;
  /** The Digimon holding this digivolution card. */
  hostCardId?: string;
  hostPermanentId?: string;
  currentDP?: number;
  isSuspended?: boolean;
  /** Where the card sits, so a mixed-zone prompt can group its candidates. */
  zone?: CandidateZone;
  /** Last public movement into trash came from this Digimon's sources. */
  trashOriginCardId?: string;
}

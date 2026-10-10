import { GameState, Zone, type CardInstance, type Permanent, type Seat } from "@aegis/shared";
import { Decoder, Encoder } from "@colyseus/schema";
import { settle, type EngineSetup } from "../../engine/testkit/harness.js";

/** Digivolution-card instance ids, bottom first. */
export function stackIds(permanent: Permanent): string[] {
  return permanent.stack.map(({ instanceId }) => instanceId);
}

/**
 * Whether each seat's client receives the card's identity, decoded from the full snapshot that
 * seat's StateView sends. It looks anywhere in that seat's copy of the state, including the
 * public `securityView` projection, through which an opponent sees a face-up security card.
 */
export function identityVisibility(s: EngineSetup, card: CardInstance): { owner: boolean; opponent: boolean } {
  const ownerSeat = card.ownerSeat as Seat;
  const [ownerState, opponentState] = decodeSnapshotsForSeats(s, [ownerSeat, (1 - ownerSeat) as Seat]);
  return {
    owner: decodedStateHasIdentity(ownerState!, card),
    opponent: decodedStateHasIdentity(opponentState!, card),
  };
}

function decodeSnapshotsForSeats(s: EngineSetup, seats: readonly Seat[]): GameState[] {
  s.engine.syncCounts();
  const encoder = new Encoder(s.state);
  const iterator = { offset: 0 };
  encoder.encodeAll(iterator);
  const sharedOffset = iterator.offset;
  const decoded = seats.map((seat) => {
    const decoder = new Decoder(new GameState());
    iterator.offset = sharedOffset;
    decoder.decode(encoder.encodeAllView(s.engine.makeStateView(seat)!, sharedOffset, iterator));
    return decoder.state;
  });
  encoder.discardChanges();
  return decoded;
}

function decodedStateHasIdentity(decoded: GameState, card: CardInstance): boolean {
  const pending: unknown[] = [decoded.toJSON()];
  while (pending.length > 0) {
    const node = pending.pop();
    if (node === null || typeof node !== "object") continue;
    const fields = node as Record<string, unknown>;
    if (fields.instanceId === card.instanceId && fields.cardId === card.cardId) return true;
    pending.push(...Object.values(fields));
  }
  return false;
}

/**
 * Play ST24-12 Falcomon from seat 0's hand (seeding one when absent) and pay its [On Play]
 * cost of trashing the bottom face-down card from under a Tamer. Returns every card id any
 * decision of that play offered, and the card the cost trashed.
 */
export async function trashBottomTamerCardWithFalcomon(
  s: EngineSetup,
): Promise<{ offeredInstanceIds: string[]; trashed: CardInstance | undefined }> {
  const player = s.state.players[0]!;
  const falcomon = player.hand.find(({ cardId }) => cardId === "ST24-12") ?? s.give(0, Zone.Hand, "ST24-12");
  // A recovery target, so the optional return has something to do and its cost is paid.
  s.give(0, Zone.Trash, "ST24-08");
  const trashBefore = new Set(player.trash.map(({ instanceId }) => instanceId));
  const decisionsBefore = s.decisions.length;
  s.state.memory = 3;
  const result = s.engine.applyIntent(0, { type: "playCard", instanceId: falcomon.instanceId });
  if (!result.ok) throw new Error(`Falcomon play rejected: ${JSON.stringify(result)}`);
  await settle(() =>
    player.trash.some(({ instanceId }) => !trashBefore.has(instanceId) && instanceId !== falcomon.instanceId),
  );
  await settle(() => s.state.pendingDecision === undefined);
  return {
    offeredInstanceIds: s.decisions
      .slice(decisionsBefore)
      .flatMap(({ req }) => [...(req.options?.candidateInstanceIds ?? []), ...(req.options?.visibleInstanceIds ?? [])]),
    trashed: player.trash.find(({ instanceId }) => !trashBefore.has(instanceId) && instanceId !== falcomon.instanceId),
  };
}

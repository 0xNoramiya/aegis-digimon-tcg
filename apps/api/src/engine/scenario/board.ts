import {
  CardInstance,
  Permanent,
  Zone,
  getCardDefinition,
  isDigiEgg,
  isDigimon,
  isOption,
  type GameState,
  type Seat,
} from "@aegis/shared";
import {
  fillZone,
  linkCard,
  placePermanent,
  pushOnStack,
  setBreeding,
  setTopCard,
  type CardZone,
} from "../state/access.js";

export type { CardSpec, PermanentSpec, SeatSpec, BoardSpec } from "./types.js";
import type { CardSpec, PermanentSpec, SeatSpec, BoardSpec } from "./types.js";

export interface BoardIds {
  next(): number;
  prefix: string;
}

export function createBoardIds(prefix = ""): BoardIds {
  let seq = 0;
  return { prefix, next: () => ++seq };
}

const defaultIds = createBoardIds();

/** Build a bare `CardInstance` — a hand/deck/trash/security card, not yet on the board. */
export function makeInstance(cardId: string, seat: Seat, faceUp: boolean, ids = defaultIds): CardInstance {
  const seq = ids.next();
  const card = new CardInstance();
  card.instanceId = `${ids.prefix}inst-${seq}`;
  card.cardId = cardId;
  card.ownerSeat = seat;
  card.faceUp = faceUp;
  return card;
}

/**
 * Build a battle-area `Permanent` with a face-up top card. `cardId` only affects what the
 * top card claims to be (`AD1-001` — an arbitrary Lv.4 Digimon — unless overridden); `dp`
 * is the permanent's actual (base and current) DP.
 */
export function makeDigimon(seat: Seat, dp: number, cardId = "AD1-001", ids = defaultIds): Permanent {
  const seq = ids.next();
  const top = makeInstance(cardId, seat, true, ids);
  const permanent = new Permanent();
  // Distinct id namespace: the engine mints its own `perm-N` for permanents it creates
  // (plays, merges), so a hand-laid `perm-N` could collide and falsely look "still
  // present" after e.g. a DNA merge consumes the hand-laid permanent.
  permanent.permanentId = `${ids.prefix}seed-perm-${seq}`;
  permanent.controllerSeat = seat;
  setTopCard(permanent, top);
  permanent.isSuspended = false;
  permanent.inBreeding = false;
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  // A manually seeded battle-area Digimon is established by default, matching
  // Board Spec fixtures. Tests for summoning sickness opt in by setting the
  // entry turn explicitly.
  permanent.enterFieldTurnCount = ESTABLISHED_TURN;
  return permanent;
}

/**
 * A permanent laid by a Board Spec is ESTABLISHED by default: it entered the field before
 * the current turn, so summoning sickness (§16-1) and the ＜Delay＞ activation gate treat it
 * as an old permanent. A test wanting a freshly-arrived permanent sets `enteredThisTurn`.
 *
 * The sentinel exists because "entered before now" has no natural value at `turnCount` 0 —
 * the engine records the turn a permanent arrived (`enterFieldTurnCount = state.turnCount`)
 * and both gates compare it for equality, so any value the current turn will never take
 * reads as "arrived earlier". Raising the board's `turnCount` instead would arm summoning
 * sickness for every scenario at once, which is a rules change, not a setup detail.
 */
const ESTABLISHED_TURN = 4294967295;

/** Alias -> its stable card identity and, for a seeded field card, original permanent identity. */
export type AliasTable = Map<string, { kind: "permanent" | "instance"; id: string; instanceId?: string }>;

function cardOf(spec: CardSpec): { card: string; as?: string; faceUp?: boolean } {
  return typeof spec === "string" ? { card: spec } : spec;
}

function permanentSpecOf(spec: PermanentSpec | string): PermanentSpec {
  return typeof spec === "string" ? { card: spec } : spec;
}

export function buildInstance(
  spec: CardSpec,
  seat: Seat,
  defaultFaceUp: boolean,
  aliases: AliasTable,
  ids = defaultIds,
): CardInstance {
  const { card, as, faceUp } = cardOf(spec);
  const instance = makeInstance(card, seat, faceUp ?? defaultFaceUp, ids);
  if (as !== undefined) aliases.set(as, { kind: "instance", id: instance.instanceId });
  return instance;
}

export function buildPermanent(
  spec: PermanentSpec | string,
  seat: Seat,
  aliases: AliasTable,
  ids = defaultIds,
): Permanent {
  const resolved = permanentSpecOf(spec);
  const dp = resolved.dp ?? getCardDefinition(resolved.card)?.dp ?? 0;
  const permanent = makeDigimon(seat, dp, resolved.card, ids);
  permanent.isSuspended = resolved.suspended ?? false;
  permanent.enterFieldTurnCount = resolved.enteredThisTurn === true ? 0 : ESTABLISHED_TURN;
  const definition = getCardDefinition(resolved.card);
  const isPureOption =
    definition !== undefined && isOption(definition) && !isDigimon(definition) && !isDigiEgg(definition);
  permanent.placedByEffect = resolved.placedByEffect ?? isPureOption;
  for (const under of resolved.under ?? []) pushOnStack(permanent, buildInstance(under, seat, true, aliases, ids));
  for (const linked of resolved.linked ?? [])
    linkCard(permanent, buildInstance(linked, seat, true, aliases, ids), "bottom");
  if (resolved.as !== undefined) {
    aliases.set(resolved.as, {
      kind: "permanent",
      id: permanent.permanentId,
      instanceId: permanent.topCard!.instanceId,
    });
  }
  return permanent;
}

const LOOSE_ZONES: [keyof SeatSpec, CardZone, boolean][] = [
  ["hand", Zone.Hand, true],
  ["deck", Zone.Deck, false],
  ["eggDeck", Zone.EggDeck, false],
  ["trash", Zone.Trash, true],
  ["delayZone", Zone.Delay, false],
];

export function layBoard(state: GameState, board: BoardSpec, aliases: AliasTable, ids = defaultIds): void {
  for (const seat of [0, 1] as Seat[]) {
    const spec = board[seat];
    const player = state.players[seat];
    if (spec === undefined || player === undefined) continue;

    for (const [key, zone, faceUp] of LOOSE_ZONES) {
      const cards = spec[key] as CardSpec[] | undefined;
      if (cards === undefined) continue;
      fillZone(
        player,
        zone,
        cards.map((card) => buildInstance(card, seat, faceUp, aliases, ids)),
      );
    }

    if (spec.security !== undefined) {
      const cards =
        typeof spec.security === "number"
          ? Array.from({ length: spec.security }, (_, n) => makeSecurityCard(seat, n))
          : spec.security.map((card) => buildInstance(card, seat, false, aliases, ids));
      fillZone(player, Zone.Security, cards);
    }

    for (const permanent of spec.battleArea ?? []) {
      placePermanent(player, buildPermanent(permanent, seat, aliases, ids));
    }

    if (spec.breeding !== undefined) {
      const permanent = buildPermanent(spec.breeding, seat, aliases, ids);
      permanent.inBreeding = true;
      setBreeding(player, permanent);
    }
  }
}

/**
 * A face-down security card owned by `seat`.
 *
 * The default is an inert main-deck Digimon: BT1-009 Monodramon, level 3, 3000 DP, no effects. The
 * previous default (BT1-001) is a Digi-Egg, which can never legally be in a security stack — a
 * numeric `security: <n>` fixture built a board no game can reach, and its 0 DP quietly made
 * every security battle a win for the attacker.
 */
export function makeSecurityCard(seat: Seat, n: number, cardId = "BT1-009"): CardInstance {
  const card = new CardInstance();
  card.instanceId = `sec-${seat}-${n}`;
  card.cardId = cardId;
  card.ownerSeat = seat;
  card.faceUp = false; // face-down in security
  return card;
}

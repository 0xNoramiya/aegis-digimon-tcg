import type { PlayerIdentity } from "./design/primitives";
import { filterDeckToKnownCards, type DeckListing } from "./game/decks";
import { newGuestIdentity } from "./guest";

const STORAGE_KEY = "aegis:player";

export const DEFAULT_PLAYER: PlayerIdentity = {
  name: "Tamer",
  color: "Blue",
  shards: 12480,
  avatarId: null,
  avatarUrl: null,
  guestAvatarId: null,
};

/** First visit has no stored player, and there is no onboarding form to fill one
    in, so a guest identity is minted and persisted on the spot. */
export function loadIdentity(): PlayerIdentity {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PLAYER, ...JSON.parse(raw) };
  } catch {
    // ignore malformed storage
  }
  const guest = newGuestIdentity(DEFAULT_PLAYER);
  saveIdentity(guest);
  return guest;
}

export function saveIdentity(player: PlayerIdentity): void {
  writeStorage(STORAGE_KEY, JSON.stringify(player));
}

export function hasStoredIdentity(): boolean {
  return readStorage(STORAGE_KEY) !== null;
}

const DECKS_KEY = "aegis:decks";
const ACTIVE_DECK_KEY = "aegis:activeDeckId";

export function loadDecks(): DeckListing[] {
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    if (raw) return (JSON.parse(raw) as DeckListing[]).map(filterDeckToKnownCards);
  } catch {
    // ignore malformed storage
  }
  return [];
}

export function saveDecks(decks: DeckListing[]): void {
  writeStorage(DECKS_KEY, JSON.stringify(decks));
}

export function loadActiveDeckId(decks: DeckListing[]): string {
  const stored = readStorage(ACTIVE_DECK_KEY);
  if (stored && decks.some((d) => d.id === stored)) return stored;
  return decks[0]?.id ?? "";
}

export function saveActiveDeckId(id: string): void {
  writeStorage(ACTIVE_DECK_KEY, id);
}

// Safari and Firefox throw on any storage access when cookies are blocked, and
// every browser throws when the quota is full. The session then runs in memory.
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // keep the in-memory value for this session
  }
}

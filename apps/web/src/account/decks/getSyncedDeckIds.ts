type Params = { accountId: string };

export function getSyncedDeckIds({ accountId }: Params): Set<string> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(`aegis:synced-decks:${accountId}`) ?? "[]");
    if (!Array.isArray(stored)) {
      return new Set();
    }
    return new Set(stored.filter((entry): entry is string => typeof entry === "string"));
  } catch {
    return new Set();
  }
}

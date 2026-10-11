/** Stable identities for semantic fixture aliases, independent of array order. */
export function fixtureInstanceId(alias: string): string {
  return `scenario-card:${encodeURIComponent(alias)}`;
}

export function fixturePermanentId(alias: string): string {
  return `scenario-permanent:${encodeURIComponent(alias)}`;
}

/** Select an explicitly authored variant, reporting an invalid test parameter immediately. */
export function fixtureVariant<T>(variants: Readonly<Record<string, T>>, key: string | number): T {
  const variant = variants[key];
  if (variant === undefined) throw new Error(`Unknown fixture variant: ${key}`);
  return variant;
}

/** Address a card in an explicitly ordered fixture pile, including a seeded top/source. */
export function fixtureZoneId(
  fixture: import("./types.js").ScenarioFixture,
  seat: 0 | 1,
  zone: "hand" | "deck" | "eggDeck" | "trash" | "security" | "field" | "source" | "breeding",
  index: number,
  sourceIndex = 0,
): string {
  const player = fixture.board[seat];
  if (!player) throw new Error(`Missing fixture seat: ${seat}`);
  const permanent = zone === "breeding" ? player.breeding : player.battleArea?.[index];
  if (zone === "field" || zone === "breeding") {
    if (typeof permanent === "string" || !permanent?.as) throw new Error("Fixture permanent needs an alias");
    return fixturePermanentId(permanent.as);
  }
  const value =
    zone === "source"
      ? typeof permanent === "string"
        ? undefined
        : permanent?.under?.[sourceIndex]
      : Array.isArray(player[zone])
        ? player[zone]?.[index]
        : undefined;
  if (typeof value === "string" || !value?.as) throw new Error(`Fixture ${zone} card ${index} needs an alias`);
  return fixtureInstanceId(value.as);
}

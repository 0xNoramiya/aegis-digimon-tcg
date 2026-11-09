import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { matchNameOrTrait } from "../effects/interpreter/matching/definition.js";
import "../../cards/index.js";

type NameReference = Parameters<typeof matchNameOrTrait>[1];

const gates = [
  { cardId: "BT14-078", token: "Loogamon", exactId: "BT14-071", containingId: "BT14-081" },
  { cardId: "BT14-094", token: "Angemon", exactId: "BT1-055", containingId: "BT1-060" },
  { cardId: "BT18-053", token: "Kazemon", exactId: "BT18-048", containingId: "BT18-054" },
  { cardId: "BT12-084", token: "Sparrowmon", exactId: "BT10-060", containingId: "BT19-061" },
];

function nameReferences(node: unknown, token: string): NameReference[] {
  if (Array.isArray(node)) return node.flatMap((child) => nameReferences(child, token));
  if (node === null || typeof node !== "object") return [];
  const record = node as Record<string, unknown>;
  const own =
    Array.isArray(record.tokens) && record.tokens.includes(token) && typeof record.match === "string"
      ? [record as unknown as NameReference]
      : [];
  return [...own, ...Object.values(record).flatMap((child) => nameReferences(child, token))];
}

describe("a bracketed card name without 'in its name' refers to that exact card name", () => {
  it.each(gates)("$cardId accepts [$token] but not a card that only contains it", (gate) => {
    const references = nameReferences(getCompiledCard(gate.cardId), gate.token);
    const exact = getCardDefinition(gate.exactId)!;
    const containing = getCardDefinition(gate.containingId)!;

    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect(matchNameOrTrait(exact, reference)).toBe(true);
      expect(matchNameOrTrait(containing, reference)).toBe(false);
    }
  });
});

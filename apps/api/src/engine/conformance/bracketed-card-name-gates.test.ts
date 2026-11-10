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
  { cardId: "LM-026", token: "Guilmon", exactId: "BT2-009", containingId: "BT9-009" },
  { cardId: "BT11-083", token: "Angewomon", exactId: "BT2-037", containingId: "BT9-040" },
  { cardId: "BT11-030", token: "Cyberdramon", exactId: "BT10-025", containingId: "EX8-052" },
  { cardId: "BT12-029", token: "UlforceVeedramon", exactId: "BT11-032", containingId: "P-048" },
  { cardId: "BT12-112", token: "Shoutmon", exactId: "BT10-008", containingId: "BT10-009" },
  { cardId: "BT16-014", token: "Goldramon", exactId: "BT3-029", containingId: "BT16-014" },
  { cardId: "BT8-043", token: "Cherubimon", exactId: "BT7-079", containingId: "BT16-079" },
  { cardId: "EX1-065", token: "Diaboromon", exactId: "BT2-082", containingId: "BT24-065" },
  { cardId: "EX2-020", token: "Shu-Chong Wong", exactId: "EX2-059", containingId: "EX4-063" },
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

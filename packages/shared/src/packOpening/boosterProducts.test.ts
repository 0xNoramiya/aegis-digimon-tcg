import { expect, it } from "vitest";
import { boosterProducts } from "#shared/packOpening/boosterProducts";
import { findBoosterProduct } from "#shared/packOpening/findBoosterProduct";
import { getBoosterProductPool } from "#shared/packOpening/getBoosterProductPool";
import { listSealedProducts } from "#shared/sealed/listSealedProducts";
import { drawBoosterPack } from "#shared/packOpening/drawBoosterPack";
import { getCardDefinition } from "#shared/cards/registry";
import { CardKind } from "#shared/schema/enums";

it("separates released English products from incomplete upcoming BT27 even after its release date", () => {
  expect(listSealedProducts({ asOf: "2026-11-01" })[0]?.value).toBe("EX13");
  expect(listSealedProducts({ asOf: "2026-10-01" }).some((product) => product.value === "EX13")).toBe(false);
  expect(listSealedProducts({ asOf: "2026-10-02" }).some((product) => product.value === "EX13")).toBe(true);
  expect(listSealedProducts({ asOf: "2027-01-01" }).some((product) => product.value === "BT27")).toBe(false);
  expect(findBoosterProduct("BT27")).toMatchObject({ releaseDate: "2026-12-11", unavailableReason: "incomplete" });
  expect(findBoosterProduct("constructor")).toBeUndefined();
  expect(findBoosterProduct({})).toBeUndefined();
});

it("covers every ordinary released English booster with explicit combined product identities", () => {
  const ids = listSealedProducts({ asOf: "2026-11-01" }).map((product) => product.value);
  expect(ids).toEqual(boosterProducts.filter((product) => !product.unavailableReason).map((product) => product.value));
  expect(ids).toContain("BT26");
  expect(ids).toContain("EX13");
  expect(ids).toContain("BT01-03-V1");
  expect(ids).toContain("BT01-03-V1.5");
  expect(ids).toContain("BT18-19");
  expect(ids).toContain("BT19-20");
  expect(ids).not.toContain("BT1");
  expect(ids).not.toContain("BT18");
});

it.each(boosterProducts.filter((product) => !product.unavailableReason))(
  "generates known complete deterministic $value pools with enough main cards",
  (product) => {
    const cards = getBoosterProductPool(product);
    expect(cards).toHaveLength(product.printings.length);
    expect(new Set(cards.map((card) => card.cardId)).size).toBe(cards.length);
    for (const value of [0, 0.1, 0.5, 0.999999]) {
      const pack = drawBoosterPack({ setId: product.value, cards, random: () => value });
      expect(pack).toEqual(drawBoosterPack({ setId: product.value, cards, random: () => value }));
      expect(pack).toHaveLength(product.cardsPerPack);
      expect(pack.every((card) => cards.some((candidate) => candidate.cardId === card.cardId))).toBe(true);
      expect(pack.every((card) => !getCardDefinition(card.cardId)?.isToken)).toBe(true);
      expect(cards.filter((card) => !card.kinds.includes(CardKind.DigiEgg)).length).toBeGreaterThanOrEqual(40);
    }
  },
);

it("uses the official newest base identities and excludes bonus products", () => {
  expect(getBoosterProductPool(findBoosterProduct("EX13")!)).toHaveLength(77);
  const newest = getBoosterProductPool(findBoosterProduct("BT26")!);
  expect(newest).toHaveLength(104);
  expect(newest.find((card) => card.cardId === "BT26-091")?.rarity).toBe("R");
  expect(newest.every((card) => card.set === "BT26")).toBe(true);
  expect(getBoosterProductPool(findBoosterProduct("BT25")!).find((card) => card.cardId === "BT2-047")).toMatchObject({
    rarity: "C",
    artId: "BT2-047_P2",
  });
  expect(getBoosterProductPool(findBoosterProduct("EX11")!).find((card) => card.cardId === "EX11-005")?.rarity).toBe(
    "C",
  );
  expect(getBoosterProductPool(findBoosterProduct("EX10")!).some((card) => card.cardId.startsWith("LM"))).toBe(false);
});

it("keeps only the thirteen BT11 reprints named by the official product panels", () => {
  const cards = getBoosterProductPool(findBoosterProduct("BT11")!);
  expect(cards).toHaveLength(125);
  expect(
    cards
      .filter((card) => card.set !== "BT11")
      .map((card) => card.cardId)
      .sort(),
  ).toEqual([
    "BT1-063",
    "BT2-032",
    "BT2-046",
    "BT2-051",
    "BT3-077",
    "BT3-103",
    "BT4-063",
    "BT5-032",
    "BT6-085",
    "BT7-005",
    "BT7-036",
    "EX1-073",
    "ST10-06",
  ]);
  expect(cards.some((card) => card.cardId === "BT1-115")).toBe(false);
});

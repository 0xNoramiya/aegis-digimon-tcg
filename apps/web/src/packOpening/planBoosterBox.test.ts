import { expect, it } from "vitest";
import { boosterProducts } from "@aegis/shared/packOpening/boosterProducts";
import { drawBoosterPack } from "@aegis/shared/packOpening/drawBoosterPack";
import { getBoosterProductPool } from "@aegis/shared/packOpening/getBoosterProductPool";
import { resolveCardArt } from "@aegis/shared/cards/arts";
import { planBoosterBox } from "@/packOpening/planBoosterBox";
import { appendOpenedPacks } from "@/packOpening/appendOpenedPacks";
import { BOOSTER_BOX_PACK_COUNT, type BoosterProgress } from "@/packOpening/BoosterProgress";
import { groupPackResults } from "@/packOpening/results/groupPackResults";
import { ResultGrouping } from "@/packOpening/results/ResultGrouping";
import { ResultSort } from "@/packOpening/results/ResultSort";
import { ResultRarityFilter } from "@/packOpening/results/ResultRarityFilter";

it.each(boosterProducts.filter((product) => !product.unavailableReason))(
  "retains $value planned hits and exact printings through solo box history and results",
  (product) => {
    const cards = getBoosterProductPool(product);
    const params = { setId: product.value, cards, random: () => 0.5 };
    const hits = planBoosterBox(params);
    expect(hits).toHaveLength(BOOSTER_BOX_PACK_COUNT);
    expect(hits).toEqual(planBoosterBox(params));
    const packs = hits.map((hit) => drawBoosterPack({ ...params, hit }));
    const progress: BoosterProgress = {
      version: 2,
      activeBox: { setId: product.value, packs: [], hits },
    };
    const next = appendOpenedPacks({ progress, setId: product.value, packs, openedAt: 100 });
    expect(progress.activeBox?.packs).toEqual([]);
    expect(next.activeBox?.hits).toEqual(hits);
    expect(next.activeBox?.packs).toEqual(
      packs.map((pack) => ({ openedAt: 100, cards: pack.map(({ cardId, artId }) => ({ cardId, artId })) })),
    );
    expect(appendOpenedPacks({ progress: next, setId: product.value, packs: [packs[0]!], openedAt: 200 })).toBe(next);
    for (const card of packs.flat()) {
      expect(cards.some((printing) => printing.cardId === card.cardId)).toBe(true);
      expect(resolveCardArt(card.cardId, card.artId).artId).toBe(card.artId ?? card.cardId);
    }
    const groups = groupPackResults({
      cards: packs.flat(),
      query: "",
      rarity: ResultRarityFilter.ALL.value,
      sort: ResultSort.PACK_ORDER.value,
      grouping: ResultGrouping.PACK.value,
    });
    expect(groups).toHaveLength(BOOSTER_BOX_PACK_COUNT);
    expect(groups.map((group) => group.entries.map((entry) => entry.card))).toEqual(packs);
  },
);

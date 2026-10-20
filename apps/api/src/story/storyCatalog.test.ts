import { storyWorkInventory } from "@aegis/shared/story/storyWorkInventory";
import { expect, it } from "vitest";
import { storyCatalogBattles } from "@aegis/shared/story/storyCatalogBattles";
import { storyCatalogCampaigns } from "@aegis/shared/story/storyCatalogCampaigns";
import { storyCatalogDecks } from "@aegis/shared/story/storyCatalogDecks";

it("publishes every documented encounter exactly once with real deck references", () => {
  expect(storyCatalogBattles).toHaveLength(443);
  expect(new Set(storyCatalogBattles.map((battle) => battle.id)).size).toBe(443);
  expect(storyCatalogCampaigns).toHaveLength(34);
  for (const battle of storyCatalogBattles) {
    expect(storyCatalogCampaigns.some((campaign) => campaign.id === battle.campaignId)).toBe(true);
    expect(battle.sourceUrl.startsWith("https://")).toBe(true);
    expect(battle.playerDeckRefs.length).toBeGreaterThan(0);
    for (const ref of [...battle.playerDeckRefs, battle.opponentDeckRef]) {
      expect(storyCatalogDecks[ref]).toBeDefined();
    }
  }
});

it("keeps all original deck recipes complete with their tournament provenance", () => {
  expect(Object.keys(storyCatalogDecks)).toHaveLength(82);
  for (const deck of Object.values(storyCatalogDecks)) {
    expect(deck.main.reduce((total, [, count]) => total + count, 0)).toBe(50);
    expect(deck.eggs.reduce((total, [, count]) => total + count, 0)).toBeLessThanOrEqual(5);
    expect(deck.resultId).toBeGreaterThan(0);
    expect(deck.eventDate).toMatch(/^2026-\d{2}-\d{2}$/);
    expect(deck.hash).toMatch(/^[a-f\d]{64}$/);
  }
});

it("preserves all inventoried works and editions without inventing campaign battles", () => {
  expect(storyWorkInventory).toHaveLength(238);
  expect(new Set(storyWorkInventory.map((work) => work.id)).size).toBe(238);
  expect(storyWorkInventory.some((work) => work.title.includes("Dreamers"))).toBe(true);
  expect(storyWorkInventory.some((work) => work.title.includes("Time Stranger"))).toBe(true);
});

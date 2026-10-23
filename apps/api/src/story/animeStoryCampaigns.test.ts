import { expect, it } from "vitest";
import { getStoryCampaignBattles } from "@aegis/shared/story/getStoryCampaignBattles";
import { animeStoryBattles } from "@aegis/shared/story/animeStoryBattles";

it.each([
  ["digimon-savers-data-squad", 17, "sv01", "sa06"],
  ["digimon-xros-wars", 17, "xw08", "xw06"],
  ["digimon-xros-wars-hunters", 16, "hu01", "xw07"],
  ["digimon-adventure-2020", 16, "av01", "re03"],
  ["digimon-ghost-game", 16, "gg02", "gg01"],
  ["digimon-beatbreak", 12, "bb01", "bb13"],
] as const)("publishes the expanded chronological campaign %s", (campaignId, count, first, last) => {
  const battles = getStoryCampaignBattles({ campaignId });
  expect(battles).toHaveLength(count);
  expect(battles[0]?.id).toBe(first);
  expect(battles.at(-1)?.id).toBe(last);
  expect(battles.every((battle) => battle.playable)).toBe(true);
});

it("records official episode evidence and distinguishes unknown narrative outcomes", () => {
  const selected = animeStoryBattles.filter((battle) => battle.id !== "XW05");
  expect(selected.every((battle) => /^https:\/\/(?:www\.|lineup\.)toei-anim\.co\.jp\//.test(battle.sourceUrl))).toBe(
    true,
  );
  expect(selected.every((battle) => battle.canonicalOutcome.length > 0)).toBe(true);
  expect(selected.find((battle) => battle.id === "BB13")?.canonicalOutcome).toMatch(/não descreve/);
  expect(selected.find((battle) => battle.id === "SA02")?.protagonist).toBe("Sleipmon e DATS");
  expect(selected.find((battle) => battle.id === "GG01")?.canonicalOutcome).toMatch(/se rende/);
});

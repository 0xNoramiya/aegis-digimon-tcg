import fixture, {
  optionUnderTamerFixture,
} from "../../api/src/engine/scenarios/nightchiropmon-tamer-cost-uses-glowing-dawn-option.fixture";
import { test, expect } from "./scenario-page";

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  for (const { label, board, costTamers } of [
    { label: "Option already in trash", board: fixture, costTamers: ["reina", "kyo"] },
    {
      label: "Option trashed by the cost",
      board: optionUnderTamerFixture,
      costTamers: ["tomoroAndKyo", "tomoroAndKyo"],
    },
  ]) {
    test(`NightChiropmon uses the Glowing Dawn Option after the Tamer cost (${label}, ${viewport.width}px)`, async ({
      scenario,
    }) => {
      const { page } = scenario;
      await page.setViewportSize(viewport);
      const refs = await scenario.openFixture(board);
      const nightChiropmon = refs.permanentId("nightChiropmon");
      const glowingDawn = refs.instanceId("glowingDawn");
      await scenario.resolveUntil(
        (state) => state.phase === "Main" && !state.pendingDecision,
        () => ({ accept: false }),
      );
      const before = await scenario.snapshot();
      const tamerTopCard = (alias: string) =>
        before.players[0]!.battleArea.find((permanent) => permanent.permanentId === refs.permanentId(alias))!.topCard
          .instanceId;
      const costPicks = costTamers.map(tamerTopCard);

      await page.locator(`[data-drop="perm-you"][data-id="${nightChiropmon}"]`).click();
      await page.getByRole("button", { name: /^Activate effect: \[Main\] \[Once Per Turn\] By trashing 2/ }).click();

      const tamerPicks: string[] = [];
      const optionOffers: string[][] = [];
      await scenario.resolveUntil(
        (state) =>
          !state.pendingDecision &&
          state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === glowingDawn),
        (decision) => {
          if (decision.sourceCardId !== "BT26-070" || decision.kind !== "selectCards") return { accept: true };
          const candidates = decision.options.candidateInstanceIds ?? [];
          if (candidates.includes(glowingDawn)) {
            optionOffers.push(candidates);
            return { instanceId: glowingDawn };
          }
          const pick = costPicks[tamerPicks.length]!;
          tamerPicks.push(pick);
          return { instanceId: pick };
        },
      );

      const after = await scenario.snapshot();
      const sourceCount = (alias: string) =>
        after.players[0]!.battleArea.find((permanent) => permanent.permanentId === refs.permanentId(alias))!.stack
          .length;
      expect(tamerPicks).toEqual(costPicks);
      expect(optionOffers).toEqual([[glowingDawn]]);
      expect(sourceCount("tomoroAndKyo") + sourceCount("reina") + sourceCount("kyo")).toBe(4);
      expect(after.memory).toBe(before.memory - 1);
      await scenario.healthy();
    });
  }
}

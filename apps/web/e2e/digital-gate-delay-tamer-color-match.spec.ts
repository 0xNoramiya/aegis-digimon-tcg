import fixture, {
  sameColorBreedingFixture,
} from "../../api/src/engine/scenarios/digital-gate-delay-tamer-color-match.fixture";
import { test, expect } from "./scenario-page";

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
]) {
  for (const { board, sharesColor } of [
    { board: fixture, sharesColor: false },
    { board: sameColorBreedingFixture, sharesColor: true },
  ]) {
    test(`Digital Gate Open Delay plays the Tamer only for a same-color Digimon (shares color ${sharesColor}, ${viewport.width}px)`, async ({
      scenario,
    }) => {
      const { page } = scenario;
      await page.setViewportSize(viewport);
      const refs = await scenario.openFixture(board, "normal", "none");
      const digitalGate = refs.permanentId("digitalGate");
      const handTamer = refs.instanceId("handTaiAndMatt");
      await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
      const before = await scenario.snapshot();

      await page.locator(`[data-drop="perm-you"][data-id="${digitalGate}"]`).click();
      await page.getByRole("button", { name: /^Activate effect: \[Main\] ＜Delay＞/ }).click();

      const tamerOffers: string[] = [];
      await scenario.resolveUntil(
        (s) =>
          !s.pendingDecision &&
          !s.players[0]!.battleArea.some((permanent) => permanent.permanentId === digitalGate) &&
          s.players[0]!.hand!.some((card) => card.instanceId === handTamer) !== sharesColor,
        (decision) => {
          if (decision.options.candidateInstanceIds?.includes(handTamer)) {
            tamerOffers.push(decision.kind);
            return { instanceId: handTamer };
          }
          return { accept: true };
        },
      );

      const after = await scenario.snapshot();
      if (!sharesColor) expect(tamerOffers).toEqual([]);
      expect(after.players[0]!.trash.map((card) => card.cardId)).toContain("P-206");
      expect(after.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === handTamer)).toBe(
        sharesColor,
      );
      expect(after.memory).toBe(before.memory);
      await scenario.healthy();
    });
  }
}

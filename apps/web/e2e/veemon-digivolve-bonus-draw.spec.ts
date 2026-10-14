import fixture from "../../api/src/engine/scenarios/veemon-digivolve-bonus-draw.fixture";
import { test, expect } from "./scenario-page";

for (const width of [1440, 390]) {
  test(`Veemon digivolving into Stingmon shows the bonus draw in hand at ${width}px`, async ({ scenario, page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const refs = await scenario.openFixture(fixture);
    await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
    const hand = page.getByTestId("hand");
    await expect(hand.getByRole("button", { name: "Select Wormmon", exact: true })).toHaveCount(0);

    await scenario.evolve("Stingmon", refs.permanentId("veemon"));
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision &&
        state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === refs.instanceId("stingmon")),
    );

    const own = (await scenario.snapshot()).players[0]!;
    expect(own.hand.map((card) => card.instanceId)).toEqual([
      refs.instanceId("turnDraw"),
      refs.instanceId("bonusDraw"),
    ]);
    await scenario.idle();
    await expect(hand.getByRole("button", { name: "Select Wormmon", exact: true })).toBeVisible();
    await expect(hand.getByRole("button", { name: "Select Monodramon", exact: true })).toBeVisible();
    await scenario.healthy();
  });
}

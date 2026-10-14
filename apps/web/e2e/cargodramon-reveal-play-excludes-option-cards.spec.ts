import fixture from "../../api/src/engine/scenarios/cargodramon-reveal-play-excludes-option-cards.fixture";
import { test, expect } from "./scenario-page";

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`Cargodramon digivolve reveal plays the Tamer and disables Options at ${viewport.width}px`, async ({
    scenario,
  }) => {
    await scenario.page.setViewportSize(viewport);
    const refs = await scenario.openFixture(fixture);
    await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
    await scenario.evolve("Cargodramon", refs.permanentId("vegiemon"));
    let revealSelections = 0;
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision &&
        state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === refs.instanceId("satsuki")),
      async (decision) => {
        if (decision.kind !== "selectCards" || decision.sourceCardId !== "BT14-064") return {};
        revealSelections += 1;
        expect(decision.options.candidateInstanceIds).toEqual([refs.instanceId("satsuki")]);
        const dialog = scenario.page.getByRole("dialog");
        await expect(dialog.locator(`[data-instance-id="${refs.instanceId("satsuki")}"]`)).toBeEnabled();
        for (const option of ["crimeResponseTeam", "dcdBomb"])
          await expect(dialog.locator(`[data-instance-id="${refs.instanceId(option)}"]`)).toBeDisabled();
        return { instanceId: refs.instanceId("satsuki") };
      },
    );
    const human = (await scenario.snapshot()).players[0]!;
    const handIds = human.hand.map((card) => card.instanceId);
    expect(revealSelections).toBe(1);
    expect(human.battleArea.find((perm) => perm.permanentId === refs.permanentId("vegiemon"))?.topCard.cardId).toBe(
      "BT14-064",
    );
    for (const option of ["crimeResponseTeam", "dcdBomb", "satsuki"])
      expect(handIds).not.toContain(refs.instanceId(option));
    expect(human.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([refs.instanceId("crimeResponseTeam"), refs.instanceId("dcdBomb")]),
    );
    await scenario.healthy();
  });
}

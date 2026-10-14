import fixture from "../../api/src/engine/scenarios/reveal-play-excludes-option-cards.fixture";
import { test, expect } from "./scenario-page";

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`Andromon reveal play disables Option cards at ${viewport.width}px`, async ({ scenario }) => {
    await scenario.page.setViewportSize(viewport);
    const refs = await scenario.openFixture(fixture);
    await scenario.play("Andromon", "Digimon");
    let revealSelections = 0;
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision &&
        state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === refs.instanceId("hagurumon")),
      async (decision) => {
        if (decision.kind !== "selectCards" || decision.sourceCardId !== "EX12-055") return {};
        revealSelections += 1;
        expect(decision.options.candidateInstanceIds).toEqual([refs.instanceId("hagurumon")]);
        const dialog = scenario.page.getByRole("dialog");
        await expect(dialog.locator(`[data-instance-id="${refs.instanceId("hagurumon")}"]`)).toBeEnabled();
        for (const option of ["giantMeat", "metalEmpire"])
          await expect(dialog.locator(`[data-instance-id="${refs.instanceId(option)}"]`)).toBeDisabled();
        return { instanceId: refs.instanceId("hagurumon") };
      },
    );
    const state = await scenario.snapshot();
    const human = state.players[0]!;
    const handIds = human.hand.map((card) => card.instanceId);
    expect(revealSelections).toBe(1);
    expect(handIds).not.toContain(refs.instanceId("giantMeat"));
    expect(handIds).not.toContain(refs.instanceId("metalEmpire"));
    expect(human.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([refs.instanceId("giantMeat"), refs.instanceId("metalEmpire")]),
    );
    await scenario.healthy();
  });
}

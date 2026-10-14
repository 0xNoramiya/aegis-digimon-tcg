import fixture from "../../api/src/engine/scenarios/monarchlizamon-tamer-source-de-digivolve.fixture";
import { test, expect } from "./scenario-page";

test.use({ holdBotAfterTurn: 1 });

for (const width of [1440, 390]) {
  test(`Arts Digivolved Monarchlizamon pays De-Digivolve with a Tamer source at ${width}px`, async ({
    scenario,
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const refs = await scenario.openFixture(fixture);
    await scenario.resolveUntil(
      (state) => state.phase === "Main" && !state.pendingDecision,
      () => ({ accept: false }),
    );
    await scenario.hand("Monarchlizamon");
    await page
      .getByRole("button", { name: /Option/ })
      .first()
      .click();
    await page.getByRole("button", { name: "Use as Option", exact: true }).click();

    const tamerCandidates: string[][] = [];
    await scenario.resolveUntil(
      (state) => state.players[1]!.trash.some((card) => card.cardId === "EX13-014") && !state.pendingDecision,
      (decision) => {
        const candidates = decision.options.candidateInstanceIds ?? [];
        if (decision.kind === "optional")
          return { accept: /^Attack with a Digimon$|De-Digivolve$/.test(decision.promptText) };
        if (decision.kind === "orderTriggers") return { triggerCardId: "BT25-057" };
        if (decision.promptText.includes("Arts Digivolve")) return { instanceId: refs.permanentId("armalizamon") };
        if (candidates.includes("player")) return { instanceId: "player" };
        if (decision.options.purpose === "cost" && candidates.includes(refs.instanceId("reina"))) {
          tamerCandidates.push(candidates);
          return { instanceId: refs.instanceId("reina") };
        }
        if (candidates.includes(refs.permanentId("jesmon"))) return { instanceId: refs.permanentId("jesmon") };
        return {};
      },
    );

    expect(tamerCandidates).toEqual([[refs.instanceId("tomoro"), refs.instanceId("reina"), refs.instanceId("kyo")]]);
    const after = await scenario.snapshot();
    const own = after.players[0]!;
    const reina = own.battleArea.find((permanent) => permanent.permanentId === refs.permanentId("reina"))!;
    expect(reina.stack.map((card) => card.instanceId)).toEqual([refs.instanceId("reinaTopSource")]);
    expect(own.trash.map((card) => card.instanceId)).toContain(refs.instanceId("reinaBottomSource"));
    const monarchlizamon = own.battleArea.find(
      (permanent) => permanent.permanentId === refs.permanentId("armalizamon"),
    )!;
    expect(monarchlizamon.topCard.instanceId).toBe(refs.instanceId("monarchlizamon"));
    const jesmon = after.players[1]!.battleArea.find(
      (permanent) => permanent.permanentId === refs.permanentId("jesmon"),
    )!;
    expect(jesmon.topCard.instanceId).toBe(refs.instanceId("jesmonPrevious"));
    await scenario.healthy();
  });
}

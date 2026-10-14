import fixture from "../../api/src/engine/scenarios/monica-reacts-to-placed-ts-option.fixture";
import { test, expect } from "./scenario-page";

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`Monica offers her suspend after In-Between Theater is placed (${viewport.width}px)`, async ({ scenario }) => {
    const { page } = scenario;
    await page.setViewportSize(viewport);
    const refs = await scenario.openFixture(fixture);
    const monica = refs.instanceId("monica");
    const theater = refs.instanceId("inBetweenTheater");
    const opponentDigimon = refs.permanentId("opponentDigimon");
    const revealedTsDigimon = refs.instanceId("revealedTsDigimon");
    await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);

    await scenario.play("Monica Simmons", "Tamer");
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision &&
        state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === monica),
    );

    await scenario.play("In-Between Theater", "Option");
    const monicaOffers: string[] = [];
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision &&
        state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === theater) &&
        state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === monica && permanent.isSuspended,
        ),
      (decision) => {
        if (decision.sourceCardId === "BT25-091" && decision.kind === "optional") {
          monicaOffers.push(decision.decisionId);
          return { accept: true };
        }
        if (decision.kind === "selectCards") return { instanceId: revealedTsDigimon };
        return {};
      },
    );

    const after = await scenario.snapshot();
    expect(monicaOffers).toHaveLength(1);
    expect(after.players[0]!.hand.map((card) => card.instanceId)).toContain(revealedTsDigimon);
    expect(
      after.players[1]!.battleArea.find((permanent) => permanent.permanentId === opponentDigimon)!.cannotAttack,
    ).toBe(true);
    await scenario.healthy();
  });
}

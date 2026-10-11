import prepared0 from "../../api/src/engine/scenarios/arisa-effect-play.fixture";
import { fixtureVariant, fixtureInstanceId } from "../../api/src/engine/scenario/references";

const preparedFixtures = { "arisa-effect-play": prepared0 };

import { test, expect } from "./scenario-page";

test.use({ holdBotAfterTurn: 1 });

for (const mode of ["non-puppet", "accept", "decline"] as const) {
  test(`Feedback #68: effect-played ${mode} has only legal Rush attacks`, async ({ scenario, page }) => {
    await page.setViewportSize({ width: mode === "accept" ? 390 : 1440, height: mode === "accept" ? 844 : 1000 });
    await scenario.openFixture(fixtureVariant(preparedFixtures, "arisa-effect-play"));
    await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
    const before = await scenario.snapshot();
    expect(before.memory).toBe(10);
    if (process.env.AEGIS_E2E_PRODUCTION === "true") {
      await expect(page.locator("style[data-vite-dev-id]")).toHaveCount(0);
      expect(await page.locator('link[rel="stylesheet"][href*="/assets/"]').count()).toBeGreaterThan(0);
    }
    const selected =
      mode === "non-puppet" ? fixtureInstanceId("feedback68-non-puppet") : fixtureInstanceId("feedback68-puppet");
    let arisaDecisions = 0;
    await scenario.play("Underworld's Call", "Option");
    await scenario.resolveUntil(
      (state) =>
        !state.pendingDecision &&
        state.players[0]!.trash.some((card) => card.instanceId === fixtureInstanceId("feedback68-call")) &&
        state.players[0]!.battleArea.some(
          (card) => card.topCard.instanceId === selected && card.keywords.includes("Rush") === (mode === "accept"),
        ) &&
        state.players[0]!.battleArea.some(
          (card) => card.topCard.cardId === "ST19-14" && card.isSuspended === (mode === "accept"),
        ) &&
        (mode === "non-puppet" || arisaDecisions === 1),
      (decision) => {
        if (decision.kind === "optional" && decision.sourceCardId === "ST19-14") {
          arisaDecisions++;
          return { accept: mode === "accept" };
        }
        if (decision.options.candidateInstanceIds?.includes(selected)) return { instanceId: selected };
        return {};
      },
    );
    const after = await scenario.snapshot();
    const played = after.players[0]!.battleArea.find((card) => card.topCard.instanceId === selected)!;
    const arisa = after.players[0]!.battleArea.find((card) => card.topCard.cardId === "ST19-14")!;
    expect(after.memory).toBe(6);
    expect(after.turnSeat).toBe(0);
    expect(after.phase).toBe("Main");
    expect(played.keywords.includes("Rush")).toBe(mode === "accept");
    expect(played.canAttackPlayer).toBe(mode === "accept");
    expect(arisa.isSuspended).toBe(mode === "accept");
    expect(after.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      fixtureInstanceId("feedback68-reserve"),
      fixtureInstanceId("feedback68-deck-0-0"),
    ]);
    expect(after.players[0]!.deckCount).toBe(before.players[0]!.deckCount);
    expect(after.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      mode === "non-puppet" ? fixtureInstanceId("feedback68-puppet") : fixtureInstanceId("feedback68-non-puppet"),
      fixtureInstanceId("feedback68-call"),
    ]);
    expect(
      (await scenario.presentation()).decisions.filter((decision) => decision.sourceCardId === "ST19-14"),
    ).toHaveLength(mode === "non-puppet" ? 0 : 1);
    if (mode === "accept") {
      await scenario.attack(played.permanentId);
      await scenario.resolveUntil(
        (state) => !state.combatWindow && !state.pendingDecision && state.players[1]!.securityCount === 2,
      );
    } else {
      await page.locator(`[data-drop="perm-you"][data-id="${played.permanentId}"]`).click();
      await expect(page.getByRole("button", { name: "Attack", exact: true })).toHaveCount(0);
    }
    const final = await scenario.snapshot();
    expect(final.memory).toBe(6);
    expect(final.players[1]!.securityCount).toBe(mode === "accept" ? 2 : 3);
    expect(final.players[0]!.battleArea.find((card) => card.topCard.instanceId === selected)!.isSuspended).toBe(
      mode === "accept",
    );
    await scenario.healthy();
  });
}

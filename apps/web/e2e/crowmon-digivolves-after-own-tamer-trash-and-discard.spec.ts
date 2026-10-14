import fixture from "../../api/src/engine/scenarios/crowmon-digivolves-after-own-tamer-trash-and-discard.fixture";
import { fixtureInstanceId, fixturePermanentId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const SUNFLOWMON_ID = fixturePermanentId("sunflowmon");
const RAVEMON_CARD = fixtureInstanceId("ravemon-card");

for (const viewport of [
  { name: "phone", width: 412, height: 839 },
  { name: "desktop", width: 1440, height: 1000 },
]) {
  test(`Crowmon digivolves into Ravemon from the trash after its own Tamer trash and discard on ${viewport.name}`, async ({
    scenario,
  }) => {
    const { page } = scenario;
    await page.setViewportSize(viewport);
    await scenario.openFixture(fixture);
    await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);

    await scenario.evolve("Crowmon", SUNFLOWMON_ID);
    let offered: string[] | undefined;
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        s.players[0]!.battleArea.some(
          (permanent) => permanent.permanentId === SUNFLOWMON_ID && permanent.topCard.instanceId === RAVEMON_CARD,
        ),
      (decision) => {
        if (decision.kind === "orderTriggers") offered = [...(decision.options.triggerCardIds ?? [])];
        return { accept: true };
      },
    );

    expect(offered).toEqual(["BT26-076", "BT26-076"]);
    const state = await scenario.snapshot();
    expect(state.players[1]!.battleArea).toHaveLength(0);
    expect(state.players[1]!.handCount).toBe(1);
    const crowmonTriggers = (await scenario.presentation()).events.flatMap((event) =>
      event.kind === "effectTriggered" && event.sourceCardId === "BT26-076" ? [event.timing ?? ""] : [],
    );
    expect(crowmonTriggers).toHaveLength(2);
    expect(crowmonTriggers[0]).toBe("WhenDigivolving");
    expect(crowmonTriggers[1]).toMatch(/^(whenHandTrashed|whenDigivolutionTrashed)$/);
    await scenario.healthy();
  });
}

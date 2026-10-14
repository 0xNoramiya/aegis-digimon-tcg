import fixture from "../../api/src/engine/scenarios/turn-player-hand-trash-before-opponent-deletion.fixture";
import { fixtureInstanceId, fixturePermanentId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const PLUTOMON_ID = fixturePermanentId("plutomon");
const GLADIMON_ID = fixturePermanentId("gladimon");
const AGUMON_ID = fixturePermanentId("agumon");

for (const viewport of [
  { name: "phone", width: 412, height: 839 },
  { name: "desktop", width: 1440, height: 1000 },
]) {
  test(`Plutomon's hand-trash trigger from Witchmon resolves before Gladimon's On Deletion on ${viewport.name}`, async ({
    scenario,
  }) => {
    const { page } = scenario;
    await page.setViewportSize(viewport);
    await scenario.openFixture(fixture);
    await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);

    await scenario.attack(PLUTOMON_ID);
    let offered: string[] | undefined;
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        !s.combatWindow &&
        !s.players[1]!.battleArea.some((permanent) => [GLADIMON_ID, AGUMON_ID].includes(permanent.permanentId)),
      (decision) => {
        if (decision.kind === "orderTriggers") {
          offered = [...(decision.options.triggerCardIds ?? [])];
          return { triggerCardId: "BT25-080" };
        }
        if (decision.kind === "selectCards" && decision.sourceCardId === "BT26-059") {
          return decision.options.purpose === "cost"
            ? { instanceId: fixtureInstanceId("plutomon-cost-card") }
            : { instanceId: fixtureInstanceId("witchmon-card") };
        }
        if (decision.kind === "selectCards" && decision.sourceCardId === "BT25-080")
          return { instanceId: fixtureInstanceId("witchmon-cost-card") };
        if (decision.kind === "chooseTargets" && decision.sourceCardId === "BT25-080")
          return { instanceId: GLADIMON_ID };
        return { accept: true };
      },
    );

    expect(offered?.sort()).toEqual(["BT25-080", "BT26-059"]);
    const order = (await scenario.presentation()).events.flatMap((event) =>
      event.kind === "effectTriggered" && ["BT26-059", "EX13-052"].includes(event.sourceCardId ?? "")
        ? [`${event.seat}:${event.sourceCardId}`]
        : [],
    );
    expect(order).toEqual(["0:BT26-059", "0:BT26-059", "1:EX13-052"]);
    await scenario.healthy();
  });
}

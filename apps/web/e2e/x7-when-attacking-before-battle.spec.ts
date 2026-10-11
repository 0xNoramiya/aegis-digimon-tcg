import fixtureX7DigixrosZones from "../../api/src/engine/scenarios/x7-digixros-zones.fixture";
import { fixturePermanentId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const SHOUTMON_X7_PERMANENT = fixturePermanentId("own-x7");
const OMNIMON_PERMANENT = fixturePermanentId("opponent-x7-omnimon");

// Rules 11-1-3 and 11-1-4: [When Attacking] effects resolve before the battle. Starmons (BT10-029)
// under Shoutmon X7 (AD1-006) draws 1 card; its clause must settle before the field clash starts.
test("Starmons' [When Attacking] clause settles before Shoutmon X7's battle starts", async ({ scenario, page }) => {
  await scenario.openFixture(fixtureX7DigixrosZones);
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);

  await page.locator(`[data-drop="perm-you"][data-id="${SHOUTMON_X7_PERMANENT}"]`).click();
  await page.getByRole("button", { name: "Attack", exact: true }).click();
  await page.locator(`[data-drop="perm-opp"][data-id="${OMNIMON_PERMANENT}"]`).click();

  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      !s.combatWindow &&
      !s.players[0]!.battleArea.some((p) => p.permanentId === SHOUTMON_X7_PERMANENT),
    (decision) => (decision.kind === "optional" ? { accept: false } : {}),
  );
  await scenario.idle();

  const { steps, events } = await scenario.presentation();
  expect(events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT10-029")).toBe(true);
  const clashStart = steps.find((step) => step.id.startsWith("field-clash-") && step.phase === "started");
  expect(clashStart, "the battle was shown").toBeDefined();
  const settlesStartedBeforeClash = steps.filter(
    (step) => step.id.startsWith("effect-unit-settle-") && step.phase === "started" && step.at <= clashStart!.at,
  );
  expect(settlesStartedBeforeClash.length, "Starmons' clause was paced before the battle").toBeGreaterThan(0);
  for (const settle of settlesStartedBeforeClash) {
    const finish = steps.find((step) => step.id === settle.id && step.phase === "finished");
    expect(finish, settle.id).toBeDefined();
    expect(finish!.at, `${settle.id} finishes before the field clash starts`).toBeLessThanOrEqual(clashStart!.at);
  }
  await scenario.healthy();
});

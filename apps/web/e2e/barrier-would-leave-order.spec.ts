import fixtureBarrierWouldLeaveOrder from "../../api/src/engine/scenarios/barrier-would-leave-order.fixture";
import { test, expect } from "./scenario-page";

test("a battle loss offers ＜Barrier＞ and a would-leave effect in one order prompt", async ({ scenario, page }) => {
  const refs = await scenario.openFixture(fixtureBarrierWouldLeaveOrder, "normal", "none");
  const silphymonId = refs.permanentId("silphymon");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);

  await page.locator(`[data-drop="perm-you"][data-id="${silphymonId}"]`).click();
  await page.getByRole("button", { name: "Attack", exact: true }).click();
  await page.locator(`[data-drop="perm-opp"][data-id="${refs.permanentId("defender")}"]`).click();

  let offered: string[] | undefined;
  await scenario.resolveUntil(
    (s) => s.combatWindow?.kind === "barrier",
    (decision) => {
      if (decision.kind === "orderTriggers") {
        offered = [...(decision.options.triggerCardIds ?? [])].sort();
        return { triggerCardId: "ST19-07" };
      }
      return { accept: true };
    },
  );
  expect(offered).toEqual(["BT24-037", "ST19-07"]);

  const barrier = page.getByRole("dialog", { name: "＜Barrier＞", exact: true });
  await expect(barrier).toBeVisible();
  await barrier.getByRole("button", { name: "Use", exact: true }).click();
  await scenario.resolveUntil(
    (s) => !s.pendingDecision && !s.combatWindow && s.players[0]!.battleArea.length === 2,
    () => ({ accept: true, instanceId: refs.instanceId("barrierSource") }),
  );

  const final = await scenario.snapshot();
  expect(final.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
    refs.instanceId("silphymon"),
    refs.instanceId("barrierSource"),
  ]);
  expect(final.players[0]!.securityCount).toBe(2);
  await scenario.healthy();
});

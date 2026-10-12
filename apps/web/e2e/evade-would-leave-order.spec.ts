import fixtureEvadeWouldLeaveOrder from "../../api/src/engine/scenarios/evade-would-leave-order.fixture";
import { fixturePermanentId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

test.use({
  holdBotAfterTurn: 5,
  botMainIntents: [
    [
      { type: "attack", attackerPermanentId: fixturePermanentId("attacker"), target: { kind: "player" } },
      { type: "endPhase" },
    ],
    { scope: "test" },
  ],
});

test("a battle loss offers ＜Evade＞ and a would-leave effect in one order prompt", async ({ scenario, page }) => {
  const refs = await scenario.openFixture(fixtureEvadeWouldLeaveOrder, "normal", "none");

  let offered: string[] | undefined;
  await scenario.resolveUntil(
    (s) => s.combatWindow?.kind === "evade",
    (decision) => {
      if (decision.kind === "orderTriggers") {
        offered = [...(decision.options.triggerCardIds ?? [])].sort();
        return { triggerCardId: "BT13-031" };
      }
      return { accept: true };
    },
    30_000,
  );
  expect(offered).toEqual(["BT13-031", "BT24-037"]);

  const evade = page.getByRole("dialog", { name: "＜Evade＞", exact: true });
  await expect(evade).toBeVisible();
  await evade.getByRole("button", { name: "Use", exact: true }).click();
  await scenario.resolveUntil(
    (s) => !s.pendingDecision && !s.combatWindow && s.players[0]!.battleArea.length === 2,
    () => ({ accept: true, instanceId: refs.instanceId("playableSource") }),
  );

  const final = await scenario.snapshot();
  expect(final.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
    refs.instanceId("evadeHolder"),
    refs.instanceId("playableSource"),
  ]);
  expect(final.players[0]!.battleArea[0]!.isSuspended).toBe(true);
  await scenario.healthy();
});

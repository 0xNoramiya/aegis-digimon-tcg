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

test("a Yes preset on ＜Evade＞ in the order panel uses it without the ＜Evade＞ dialog", async ({
  scenario,
  page,
}) => {
  const refs = await scenario.openFixture(fixtureEvadeWouldLeaveOrder, "normal", "none");

  await scenario.resolveUntil(
    (s) => s.pendingDecision?.kind === "orderTriggers",
    () => ({ accept: true }),
    30_000,
  );
  const preset = page.getByRole("group", { name: /MirageGaogamon/ });
  await preset.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(preset.getByRole("button", { name: "Yes", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Resolve in this order", exact: true }).click();

  let evadeDialogOpened = false;
  await scenario.resolveUntil(
    (s) => {
      evadeDialogOpened ||= s.combatWindow?.kind === "evade";
      return evadeDialogOpened || (!s.pendingDecision && !s.combatWindow && s.players[0]!.battleArea.length === 2);
    },
    () => ({ accept: true, instanceId: refs.instanceId("playableSource") }),
  );
  expect(evadeDialogOpened).toBe(false);
  await expect(page.getByRole("dialog", { name: "＜Evade＞", exact: true })).toHaveCount(0);

  const final = await scenario.snapshot();
  expect(final.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
    refs.instanceId("evadeHolder"),
    refs.instanceId("playableSource"),
  ]);
  expect(final.players[0]!.battleArea[0]!.isSuspended).toBe(true);
  await scenario.healthy();
});

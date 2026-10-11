import fixtureBt26029SingleRemovalTrigger from "../../api/src/engine/scenarios/bt26-029-single-removal-trigger.fixture";
import { fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const HOLY = fixtureInstanceId("bt26-029-holy-card");

// Feedback #20 follow-up (match 023effb9): one security trash listed Aegiochusmon: Holy's
// "[All Turns] [Once Per Turn] When your security stack is removed from" effect twice in the
// order prompt. Kari Kamiya reacts to the same removal, so a correct prompt lists each card once.
test("follow-up: Aegiochusmon: Holy appears once in the order prompt and resolves once", async ({ scenario, page }) => {
  await scenario.openFixture(fixtureBt26029SingleRemovalTrigger);
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);

  await scenario.play("Aegiochusmon: Holy", "Digimon");
  const offered: string[][] = [];
  const visibleHolyEntries: number[] = [];
  await scenario.resolveUntil(
    (s) => !s.pendingDecision && s.players[1]!.battleArea.length === 0,
    async (decision) => {
      if (decision.kind === "orderTriggers") {
        offered.push([...(decision.options.triggerCardIds ?? [])].sort());
        const panel = page
          .getByRole("dialog")
          .filter({ has: page.getByRole("heading", { name: "Order pending effects", exact: true }) });
        await expect(panel).toBeVisible();
        visibleHolyEntries.push(await panel.getByRole("button", { name: /Aegiochusmon: Holy/ }).count());
        return { triggerCardId: "BT26-029" };
      }
      if (decision.kind === "optional") return { accept: decision.sourceCardId !== "BT15-084" };
      return {};
    },
  );

  expect(offered).toEqual([["BT15-084", "BT26-029"]]);
  expect(visibleHolyEntries).toEqual([1]);
  const probe = await scenario.presentation();
  const holyRemovalResolutions = probe.events.filter(
    (event) =>
      event.kind === "effectResolved" &&
      event.sourceCardId === "BT26-029" &&
      String(event.effectKey).includes("security-removed-dp"),
  );
  expect(holyRemovalResolutions).toHaveLength(1);
  const state = await scenario.snapshot();
  expect(state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === HOLY)).toBe(true);
  expect(state.players[0]!.securityCount).toBe(3);
  expect(state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(3);
  await scenario.healthy();
});

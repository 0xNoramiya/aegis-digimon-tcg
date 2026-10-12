import fixture from "../../api/src/engine/scenarios/lordknightmon-alliance-restoration.fixture";
import { test, expect } from "./scenario-page";

test("Gladimon uses Alliance after LordKnightmon is removed by security and digivolves again", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  await scenario.attack(refs.permanentId("firstAttacker"));
  await scenario.resolveUntil(
    (state) => state.players[1]!.securityCount === 4 && !state.pendingDecision && !state.combatWindow,
  );
  expect(
    (await scenario.snapshot()).players[0]!.battleArea.find(
      (permanent) => permanent.permanentId === refs.permanentId("lord"),
    )!.topCard.cardId,
  ).toBe("EX13-058");
  await scenario.evolve("LordKnightmon", refs.permanentId("lord"), true);
  await scenario.resolveUntil(
    (state) => state.combatWindow?.kind === "alliance",
    (decision) => {
      if (decision.kind === "selectCards") return { instanceId: refs.instanceId("gladimon") };
      if (decision.kind === "chooseTargets") return { cardId: "EX13-052" };
      return { accept: true };
    },
  );
  await expect(scenario.page.getByRole("region", { name: "Alliance window", exact: true })).toBeVisible();
  await scenario.page.locator(`[data-drop="perm-you"][data-id="${refs.permanentId("lord")}"]`).click();
  await scenario.page.getByRole("button", { name: "Use Alliance", exact: true }).click();
  await scenario.resolveUntil(
    (state) => state.players[1]!.securityCount === 2 && !state.pendingDecision && !state.combatWindow,
  );
  expect((await scenario.presentation()).events.filter((event) => event.kind === "allianceResolved")).toHaveLength(1);
  await scenario.healthy();
});

import fixture from "../../api/src/engine/scenarios/leave-prevention-cost-payer-stays.fixture";
import { test, expect } from "./scenario-page";

test("a they-don't-leave cost paid by a leaving Digimon still keeps every matching Digimon", async ({
  scenario,
  page,
}) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  const savedIds = ["salamon", "leopardmon"].map((alias) => refs.permanentId(alias));
  const goblimonId = refs.permanentId("goblimon");

  await scenario.resolveUntil((state) => state.pendingDecision?.kind === "optional", undefined, 30_000);
  for (const permanentId of [...savedIds, goblimonId])
    await expect(page.locator(`[data-id="${permanentId}"] [data-fate="effectTarget"]`)).toBeVisible();

  await scenario.resolveUntil(
    (state) => !state.pendingDecision && state.players[0]!.battleArea.length === 2,
    (decision) =>
      decision.kind === "chooseTargets"
        ? { instanceId: refs.permanentId("leopardmon") }
        : { accept: true, decisionBudgetMs: 10_000 },
    30_000,
  );

  const final = await scenario.snapshot();
  expect(final.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(savedIds);
  expect(final.players[0]!.trash.map((card) => card.instanceId)).toContain(refs.instanceId("goblimon"));
  await scenario.healthy();
});

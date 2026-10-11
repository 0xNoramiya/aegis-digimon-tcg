import fixtureBurstTamerChoice from "../../api/src/engine/scenarios/burst-tamer-choice.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const SHINEGREYMON_ID = fixturePermanentId("own-shinegreymon");
const READY_MARCUS_ID = fixturePermanentId("own-marcus-ready");
const READY_MARCUS_TOP = fixtureInstanceId("own-card-marcus-ready-card");
const SUSPENDED_MARCUS_TOP = fixtureInstanceId("own-card-marcus-suspended-card");
const SUSPENDED_MARCUS_SOURCE = fixtureInstanceId("own-source-marcus-suspended-0-card");

test("Burst Digivolve asks which Marcus Damon returns to hand", async ({ scenario, page }) => {
  await scenario.openFixture(fixtureBurstTamerChoice);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.evolve("ShineGreymon: Burst Mode", SHINEGREYMON_ID);
  const costs = page.getByRole("dialog", { name: "Digivolve cost", exact: true });
  await expect(costs).toBeVisible();
  await costs.getByRole("button", { name: /^ShineGreymon Lv\.6 · 0 memory/ }).click();

  let offered: string[] | undefined;
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      s.players[0]!.battleArea.find((permanent) => permanent.permanentId === SHINEGREYMON_ID)?.topCard.cardId ===
        "BT13-020",
    (decision) => {
      if (decision.kind === "chooseTargets" && decision.options.targetFate === "returnToHand") {
        offered = [...decision.options.candidateInstanceIds!];
        return { instanceId: SUSPENDED_MARCUS_TOP };
      }
      return { accept: false };
    },
  );

  expect(offered).toEqual([READY_MARCUS_TOP, SUSPENDED_MARCUS_TOP]);
  const state = await scenario.snapshot();
  const human = state.players[0]!;
  expect(human.hand.map((card) => card.instanceId)).toContain(SUSPENDED_MARCUS_TOP);
  expect(human.trash.map((card) => card.instanceId)).toContain(SUSPENDED_MARCUS_SOURCE);
  expect(human.battleArea.map((permanent) => permanent.permanentId)).toContain(READY_MARCUS_ID);
  expect(human.battleArea.some((permanent) => permanent.topCard.instanceId === SUSPENDED_MARCUS_TOP)).toBe(false);
  await scenario.healthy();
});

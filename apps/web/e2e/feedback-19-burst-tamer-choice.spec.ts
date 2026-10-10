import { test, expect } from "./scenario-page";

const SHINEGREYMON_ID = "dev-perm-0-feedback19-shinegreymon";
const READY_MARCUS_ID = "dev-perm-0-feedback19-marcus-ready";
const READY_MARCUS_TOP = "dev-field-0-feedback19-marcus-ready";
const SUSPENDED_MARCUS_TOP = "dev-field-0-feedback19-marcus-suspended";
const SUSPENDED_MARCUS_SOURCE = "dev-stack-0-feedback19-marcus-suspended-0";

test("feedback #19: Burst Digivolve asks which Marcus Damon returns to hand", async ({ scenario, page }) => {
  await scenario.open("arena-feedback19-burst-tamer-choice");
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

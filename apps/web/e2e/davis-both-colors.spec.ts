import fixtureDavisBothColors from "../../api/src/engine/scenarios/davis-both-colors.fixture";
import { fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const VEEMON = fixtureInstanceId("davis-reveal-veemon-card");
const LIGHDRAMON = fixtureInstanceId("davis-reveal-lighdramon-card");
const OPTION = fixtureInstanceId("davis-reveal-option-card");

// BT3-093 Q1123: Davis adds 1 blue and 1 green Digimon card, so neither color choice offers a
// way to skip while a matching card remains.
test("BT3-093 Davis must add both the blue and the green Digimon (Q1123)", async ({ scenario, page }) => {
  await scenario.openFixture(fixtureDavisBothColors);
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  await scenario.play("Davis Motomiya", "Tamer");

  const offered: { candidates: string[]; min: number | undefined }[] = [];
  await scenario.resolveUntil(
    (s) => !s.pendingDecision && s.players[0]!.hand.some((card) => card.instanceId === LIGHDRAMON),
    async (decision) => {
      if (decision.kind !== "selectCards" || decision.sourceCardId !== "BT3-093") return {};
      offered.push({ candidates: [...decision.options.candidateInstanceIds!], min: decision.options.min });
      const prompt = page.getByRole("dialog", { name: "Davis Motomiya · effect" });
      await expect(prompt.getByRole("button", { name: "Confirm targets", exact: true })).toBeVisible();
      await expect(prompt.getByRole("button", { name: /^(No selection|Pass · no selection|Pass|None)$/i })).toHaveCount(
        0,
      );
      return { instanceId: offered.length === 1 ? VEEMON : LIGHDRAMON };
    },
  );

  expect(offered).toEqual([
    { candidates: [VEEMON, LIGHDRAMON], min: 1 },
    { candidates: [LIGHDRAMON], min: 1 },
  ]);
  const human = (await scenario.snapshot()).players[0]!;
  expect(human.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([VEEMON, LIGHDRAMON]));
  expect(human.hand.map((card) => card.instanceId)).not.toContain(OPTION);
  await scenario.healthy();
});

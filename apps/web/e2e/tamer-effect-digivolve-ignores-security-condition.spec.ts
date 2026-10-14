import fixtureTamerEffectDigivolveIgnoresSecurityCondition from "../../api/src/engine/scenarios/tamer-effect-digivolve-ignores-security-condition.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const RIE = fixturePermanentId("own-rie");
const LORDKNIGHTMON = fixtureInstanceId("lordknightmon-card");
const MAIN_EFFECT = /^Activate effect: \[Main\] \[Once Per Turn\] If this Tamer has 3 or more/;

test("Rie Kishibe's [Main] digivolves into LordKnightmon with 4 security cards", async ({ scenario, page }) => {
  await scenario.openFixture(fixtureTamerEffectDigivolveIgnoresSecurityCondition);
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  const before = await scenario.snapshot();
  expect(before.players[0]!.security).toHaveLength(4);
  expect(before.memory).toBe(3);

  await page.locator(`[data-drop="perm-you"][data-id="${RIE}"]`).click();
  await page.getByRole("button", { name: MAIN_EFFECT }).click();
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      s.players[0]!.battleArea.find((permanent) => permanent.permanentId === RIE)?.topCard.instanceId === LORDKNIGHTMON,
    (decision) => (decision.kind === "selectCards" ? { instanceId: LORDKNIGHTMON } : { accept: true }),
  );

  const after = await scenario.snapshot();
  expect(after.players[0]!.security).toHaveLength(4);
  expect(after.memory).toBe(0);
  expect(after.players[0]!.hand.some((card) => card.instanceId === LORDKNIGHTMON)).toBe(false);
  await scenario.healthy();
});

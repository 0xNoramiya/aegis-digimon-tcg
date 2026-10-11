import prepared0 from "../../api/src/engine/scenarios/metalgarurumon-field-warp.fixture";
import prepared1 from "../../api/src/engine/scenarios/metalgarurumon-printed-breeding.fixture";
import prepared2 from "../../api/src/engine/scenarios/wargreymon-field-warp.fixture";
import { fixtureVariant, fixtureInstanceId, fixturePermanentId } from "../../api/src/engine/scenario/references";

const preparedFixtures = {
  "metalgarurumon-field-warp": prepared0,
  "metalgarurumon-printed-breeding": prepared1,
  "wargreymon-field-warp": prepared2,
};

import { test, expect } from "./scenario-page";

const FIELD = fixturePermanentId("dev-perm-0-feedback59-field");
const BREEDING = fixturePermanentId("dev-perm-0-feedback59-breeding");
const OPPONENT = fixturePermanentId("dev-perm-1-feedback59-opponent");
const EVOLUTION = fixtureInstanceId("feedback59-evolution");

test.use({ holdBotAfterTurn: 1 });

for (const mode of ["metal", "war"] as const) {
  test(`Feedback #59: ${mode} projects only the qualified battle-area warp`, async ({ scenario, page }) => {
    const cardName = mode === "metal" ? "MetalGarurumon" : "WarGreymon";
    await scenario.openFixture(
      fixtureVariant(preparedFixtures, `${mode === "metal" ? "metalgarurumon" : "wargreymon"}-field-warp`),
    );
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const before = await scenario.snapshot();
    const evolution = before.players[0]!.hand.find((c) => c.instanceId === EVOLUTION)!;
    expect([...new Set(evolution.digivolveRoutes.map((route) => route.permanentId))]).toEqual([FIELD]);
    expect(evolution.digivolveRoutes.every((route) => route.projectedCost === 4)).toBe(true);
    expect(JSON.parse(evolution.activatableEffectsJson || "[]")).toEqual([]);
    const source = before.players[0]!.battleArea.find((p) => p.permanentId === FIELD)!;
    await scenario.hand(cardName);
    await expect(page.getByRole("button", { name: /^Activate.*Effect/i })).toHaveCount(0);
    await page.getByRole("button", { name: "Digivolve", exact: true }).click();
    await page.locator(`[data-drop="perm-you"][data-id="${FIELD}"]`).click();
    await scenario.resolveUntil(
      (s) =>
        s.players[0]!.battleArea.find((p) => p.permanentId === FIELD)?.topCard.instanceId === EVOLUTION &&
        !s.pendingDecision &&
        !s.combatWindow,
      (decision) => {
        if (decision.kind === "optional") return { accept: false };
        if (decision.options.candidateInstanceIds?.includes(OPPONENT)) return { instanceId: OPPONENT };
        return {};
      },
    );
    const after = await scenario.snapshot();
    expect(after.memory).toBe(before.memory - 4);
    expect(after.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 1);
    expect(after.players[0]!.battleArea.find((p) => p.permanentId === FIELD)!.stack.map((c) => c.instanceId)).toEqual([
      source.topCard.instanceId,
    ]);
    expect(after.players[0]!.breeding).toMatchObject({
      permanentId: BREEDING,
      topCard: { instanceId: before.players[0]!.breeding!.topCard.instanceId },
    });
    expect(
      after.players[0]!.battleArea.find((p) => p.permanentId === fixturePermanentId("dev-perm-0-feedback59-near"))!
        .topCard.instanceId,
    ).toBe(
      before.players[0]!.battleArea.find((p) => p.permanentId === fixturePermanentId("dev-perm-0-feedback59-near"))!
        .topCard.instanceId,
    );
    expect(after.players[0]!.hand.some((c) => c.instanceId === EVOLUTION)).toBe(false);
    expect(after.players[1]!.securityCount).toBe(before.players[1]!.securityCount);
    expect(after.players[1]!.battleArea.find((p) => p.permanentId === OPPONENT)!.cannotSuspend).toBe(mode === "metal");
    await scenario.healthy();
  });
}

test("Feedback #59: the printed Garurumon level-5 path remains legal in breeding", async ({ scenario, page }) => {
  await scenario.openFixture(fixtureVariant(preparedFixtures, "metalgarurumon-printed-breeding"));
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const evolution = before.players[0]!.hand.find((c) => c.instanceId === EVOLUTION)!;
  expect([...new Set(evolution.digivolveRoutes.map((route) => route.permanentId))]).toEqual([BREEDING]);
  expect(before.players[0]!.breeding!.topCard.cardId).toBe("BT2-078");
  await scenario.hand("MetalGarurumon");
  await page.getByRole("button", { name: "Digivolve", exact: true }).click();
  await page.locator('[data-drop="breeding-you"]').click();
  await scenario.resolveUntil((s) => s.players[0]!.breeding?.topCard.instanceId === EVOLUTION && !s.pendingDecision);
  const after = await scenario.snapshot();
  expect(after.memory).toBe(before.memory - 4);
  expect(after.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 1);
  expect(after.players[0]!.breeding!.stack.map((c) => c.instanceId)).toEqual([
    before.players[0]!.breeding!.topCard.instanceId,
  ]);
  expect(after.players[0]!.battleArea).toHaveLength(0);
  expect(after.players[0]!.hand.some((c) => c.instanceId === EVOLUTION)).toBe(false);
  expect(
    (await scenario.presentation()).events.some(
      (event) =>
        event.kind === "effectTriggered" && event.sourceCardId === "BT15-101" && event.timing === "WhenDigivolving",
    ),
  ).toBe(false);
  await scenario.healthy();
});

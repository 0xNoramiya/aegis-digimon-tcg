import { test, expect } from "./scenario-page";

test("Feedback #42: a placed Parkour ends the waiver; a blue/green Tamer permits the second copy", async ({
  scenario,
}) => {
  await scenario.open("arena-feedback42-parkour-sequential", "normal", "none");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  // Equivalent starting copies need explicit instance selectors to keep the sequential proof deterministic.
  const first = scenario.page.locator('[data-hand-instance-id="feedback42-first"]');
  await first.focus();
  await first.press("Enter");
  await scenario.page.getByRole("button", { name: "Play Option", exact: true }).click();
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.instanceId === "feedback42-first") && !s.pendingDecision,
    () => ({ instanceId: "feedback42-deck-1" }),
  );
  expect((await scenario.snapshot()).memory).toBe(6);
  await scenario.healthy();
  await scenario.hand("Parkour Training");
  await expect(scenario.page.getByRole("dialog", { name: "Parkour Training", exact: true })).toBeVisible();
  await expect(scenario.page.getByRole("button", { name: "Play Option", exact: true })).toHaveCount(0);
  await scenario.page
    .getByRole("dialog", { name: "Parkour Training", exact: true })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  expect((await scenario.snapshot()).players[0]!.hand.some((c) => c.instanceId === "feedback42-second")).toBe(true);
  await scenario.play("Davis Motomiya & Ken Ichijoji", "Tamer");
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT16-085") && !s.pendingDecision,
  );
  expect((await scenario.snapshot()).memory).toBe(2);
  await scenario.play("Parkour Training", "Option");
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.instanceId === "feedback42-second") && !s.pendingDecision,
    () => ({ instanceId: "feedback42-deck-3" }),
  );
  const state = await scenario.snapshot();
  expect(state.memory).toBe(0);
  expect(state.turnSeat).toBe(0);
  expect(state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["LM-058", "BT16-085", "LM-058"]);
  expect(state.players[0]!.hand.map((c) => c.instanceId)).toEqual(["feedback42-deck-0", "feedback42-deck-3"]);
  expect(state.players[0]!.trash).toHaveLength(0);
  await scenario.healthy();
});

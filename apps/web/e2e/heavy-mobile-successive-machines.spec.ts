import { test, expect } from "./scenario-page";

test("Discord 1558754612205322250: second Machinedramon attacks with Heavy Mobile Blitz", async ({
  scenario,
  page,
}) => {
  test.setTimeout(120_000);
  await scenario.open("arena-heavy-mobile-successive-machines");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.play("Attack of the Heavy Mobile Digimon!", "Option");
  await scenario.resolveUntil(
    (s) => s.players[0]!.trash.some((c) => c.cardId === "BT9-102") && !s.pendingDecision,
    () => ({ cardId: "BT9-029" }),
  );
  const firstId = "heavy-hand-2";
  const secondId = "heavy-hand-3";
  const playMachine = async (id: string) => {
    // Two identical printed cards; select the exact hand identity for each play.
    const hand = page.locator(`[data-hand-instance-id="${id}"]`);
    await hand.focus();
    await hand.press("Enter");
    await page.getByRole("button", { name: "Play Digimon", exact: true }).click();
  };
  await playMachine(firstId);
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.battleArea.some((p) => p.topCard.instanceId === firstId && p.stack.length === 5) &&
      !s.pendingDecision,
    (d) => (d.kind === "selectCards" ? { instanceIds: [4, 5, 6, 7, 8].map((i) => `heavy-hand-${i}`) } : {}),
  );
  let state = await scenario.snapshot();
  const first = state.players[0]!.battleArea.find((p) => p.topCard.instanceId === firstId)!;
  expect(state.memory).toBe(3);
  await scenario.attack(first.permanentId);
  await scenario.resolveUntil((s) => s.players[1]!.securityCount === 4 && !s.combatWindow && !s.pendingDecision);
  await playMachine(secondId);
  await scenario.resolveUntil(
    (s) => !!s.pendingDecision && JSON.parse(s.pendingDecision.payloadJson || "{}").promptKey === "activateBlitz",
    (d) => (d.kind === "selectCards" ? { instanceId: "heavy-hand-9" } : {}),
  );
  state = await scenario.snapshot();
  expect(state.turnSeat).toBe(0);
  expect(state.memory).toBe(-8);
  const second = state.players[0]!.battleArea.find((p) => p.topCard.instanceId === secondId)!;
  expect(second.stack.map((c) => c.instanceId)).toEqual(["heavy-hand-9"]);
  await page.getByRole("button", { name: "Yes, activate", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await scenario.snapshot()).players[0]!.battleArea.find((p) => p.permanentId === second.permanentId)!
          .canAttackPlayer,
    )
    .toBe(true);
  await scenario.attack(second.permanentId);
  await scenario.resolveUntil((s) => s.turnSeat === 1 && !s.pendingDecision);
  expect((await scenario.snapshot()).players[1]!.securityCount).toBe(3);
  const events = (await scenario.presentation()).events;
  expect(events.filter((e) => e.kind === "attackDeclared")).toHaveLength(2);
  expect(events.map((e) => e.kind).lastIndexOf("attackEnded")).toBeLessThan(
    events.map((e) => e.kind).lastIndexOf("turnEnded"),
  );
  await scenario.healthy();
});

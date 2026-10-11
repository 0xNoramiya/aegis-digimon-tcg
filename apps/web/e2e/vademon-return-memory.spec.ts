import fixtureBt22VademonReturnAce from "../../api/src/engine/scenarios/bt22-vademon-return-ace.fixture";
import fixtureBt22VademonReturnTamer from "../../api/src/engine/scenarios/bt22-vademon-return-tamer.fixture";
import { fixtureVariant, fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const vademonId = fixturePermanentId("own-dm-vademon");
const paymentId = fixtureInstanceId("dm-payment-card");
const targetPermanentId = fixturePermanentId("opponent-dm-target");
const targetInstanceId = fixtureInstanceId("opponent-card-dm-target-card");

type Probe = Awaited<ReturnType<import("./scenario-page").ScenarioPage["presentation"]>>;

function overflowEvents(probe: Probe) {
  return probe.events.filter((e) => e.kind === "memoryChanged" && e.reason === "overflow");
}

function returnedTarget(probe: Probe) {
  return probe.events.some(
    (e) =>
      e.kind === "cardsMoved" &&
      e.returnedPermanents?.some((p) => p.instanceId === targetInstanceId && p.seat === 1) === true,
  );
}

for (const target of [
  { arena: "tamer", cardId: "BT1-085", attack: "security", memoryAfter: 3, overflow: 0 },
  // BT14-014 MetalGreymon is a play cost 4 ACE: its Overflow -3 belongs to the bot that owns it.
  { arena: "ace", cardId: "BT14-014", attack: "target", memoryAfter: 6, overflow: 1 },
] as const) {
  test(`Vademon returns the bot's cost-4 ${target.arena} without charging its player memory`, async ({
    scenario,
    page,
  }) => {
    test.setTimeout(120_000);
    await scenario.openFixture(
      fixtureVariant({ tamer: fixtureBt22VademonReturnTamer, ace: fixtureBt22VademonReturnAce }, target.arena),
    );
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const initial = await scenario.snapshot();
    expect(initial.memory).toBe(3);
    expect(initial.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual([target.cardId]);
    expect(
      initial.players[0]!.battleArea.find((p) => p.permanentId === vademonId)!.stack.map((c) => c.instanceId),
    ).toEqual([paymentId]);
    const ownHand = initial.players[0]!.handCount;
    const botHand = initial.players[1]!.handCount;

    await page.locator(`[data-drop="perm-you"][data-id="${vademonId}"]`).click();
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    if (target.attack === "security") await page.getByRole("button", { name: /^Opponent security/ }).click();
    else await page.locator(`[data-id="${targetPermanentId}"][role="button"]`).click();

    const decisions: string[] = [];
    await scenario.resolveUntil(
      (s) =>
        s.players[1]!.handCount === botHand + 1 &&
        s.players[1]!.securityCount === (target.attack === "security" ? 4 : 5) &&
        !s.pendingDecision &&
        !s.combatWindow,
      (d) => {
        decisions.push(`${d.kind}: ${d.promptText}`);
        return d.kind === "chooseTargets" ? { instanceId: targetPermanentId } : {};
      },
    );

    const final = await scenario.snapshot();
    const probe = await scenario.presentation();
    // The bot's card is the only legal return target, so the engine selects it once the payment is accepted.
    expect(decisions).toEqual([expect.stringMatching(/^optional: .*bottom face-down digivolution card/)]);
    expect(final.memory).toBe(target.memoryAfter);
    expect(probe.visible?.memory.value).toBe(final.memory);
    expect(overflowEvents(probe)).toHaveLength(target.overflow);
    expect(returnedTarget(probe)).toBe(true);
    expect(final.players[1]!.battleArea).toEqual([]);
    expect(final.players[0]!.handCount).toBe(ownHand);
    expect(final.players[0]!.trash.map((c) => c.instanceId)).toEqual([paymentId]);
    const vademon = final.players[0]!.battleArea.find((p) => p.permanentId === vademonId)!;
    expect(vademon.topCard.cardId).toBe("BT22-061");
    expect(vademon.stack).toEqual([]);
    await scenario.healthy();
  });
}

test("declining Vademon's payment keeps the bot's Tamer, the source and memory", async ({ scenario, page }) => {
  test.setTimeout(120_000);
  await scenario.openFixture(fixtureBt22VademonReturnTamer);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const botHand = (await scenario.snapshot()).players[1]!.handCount;

  await scenario.attack(vademonId);
  let declined = false;
  await scenario.resolveUntil(
    (s) => s.players[1]!.securityCount === 4 && !s.pendingDecision && !s.combatWindow,
    (d) => {
      if (d.kind === "optional" && /bottom face-down digivolution card/.test(d.promptText)) {
        declined = true;
        return { accept: false };
      }
      return {};
    },
  );

  const final = await scenario.snapshot();
  const probe = await scenario.presentation();
  expect(declined).toBe(true);
  expect(final.memory).toBe(3);
  expect(overflowEvents(probe)).toEqual([]);
  expect(returnedTarget(probe)).toBe(false);
  expect(final.players[1]!.handCount).toBe(botHand);
  expect(final.players[1]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([targetInstanceId]);
  expect(final.players[0]!.trash).toEqual([]);
  expect(final.players[0]!.battleArea.find((p) => p.permanentId === vademonId)!.stack.map((c) => c.instanceId)).toEqual(
    [paymentId],
  );
  await page.getByRole("button", { name: /^end turn$/i }).waitFor();
  await scenario.healthy();
});

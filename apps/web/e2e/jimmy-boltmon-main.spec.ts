import fixtureJimmyBoltmonSingle from "../../api/src/engine/scenarios/jimmy-boltmon-single.fixture";
import fixtureJimmyBoltmonDouble from "../../api/src/engine/scenarios/jimmy-boltmon-double.fixture";
import { fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect, type ScenarioPage } from "./scenario-page";

async function assembleBoltmon(scenario: ScenarioPage) {
  const before = await scenario.snapshot();
  const materials = before.players[0]!.trash;
  expect(materials).toHaveLength(5);
  await scenario.play("Boltmon", "Digimon");
  const panel = scenario.page.getByRole("dialog", { name: "＜Assembly＞ Boltmon", exact: true });
  await expect(panel.locator(".material-prompt__body").getByRole("button")).toHaveCount(5);
  for (const material of materials) {
    const button = panel
      .locator(".material-prompt__body")
      .getByRole("button")
      .filter({
        has: scenario.page.locator(`img[src*="${material.cardId}"]`),
      });
    await expect(button).toBeEnabled();
    await button.click();
  }
  await panel.getByRole("button", { name: "Assembly (5 cards)", exact: true }).click();
  return before;
}

test("one Jimmy executes Boltmon's copied Main and refunds memory after its cost", async ({ scenario }) => {
  await scenario.openFixture(fixtureJimmyBoltmonSingle);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await assembleBoltmon(scenario);
  await scenario.resolveUntil(
    (s) => !s.pendingDecision && !s.combatWindow && s.memory === 3,
    (decision) => ({ accept: !/attack/i.test(decision.promptText) }),
  );
  const final = await scenario.snapshot();
  const boltmon = final.players[0]!.battleArea.find((p) => p.topCard.instanceId === fixtureInstanceId("boltmon-card"))!;
  expect(boltmon.stack.map((c) => c.instanceId)).toEqual(
    before.players[0]!.trash.map((c) => c.instanceId).toReversed(),
  );
  expect(boltmon.keywords).toEqual(expect.arrayContaining(["Raid", "Piercing"]));
  expect(final.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT22-092")!.isSuspended).toBe(true);
  expect(final.memory).toBe(10 - 6 - 2 + 1);
  expect(final.turnSeat).toBe(0);
  expect(final.players[0]!.trash).toHaveLength(0);
  expect(final.players[0]!.deckCount).toBe(before.players[0]!.deckCount);
  expect(final.players[1]!.securityCount).toBe(before.players[1]!.securityCount);
  await scenario.healthy();
});

test("refusing Jimmy preserves the Tamer and pays only Assembly", async ({ scenario }) => {
  await scenario.openFixture(fixtureJimmyBoltmonSingle);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await assembleBoltmon(scenario);
  let refusals = 0;
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      s.players[0]!.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("boltmon-card")),
    (decision) => {
      expect(decision.kind).toBe("optional");
      expect(decision.sourceCardId).toBe("BT22-092");
      refusals++;
      return { accept: false };
    },
  );
  const final = await scenario.snapshot();
  const boltmon = final.players[0]!.battleArea.find((p) => p.topCard.instanceId === fixtureInstanceId("boltmon-card"))!;
  expect(refusals).toBe(1);
  expect(boltmon.stack.map((c) => c.instanceId)).toEqual(
    before.players[0]!.trash.map((c) => c.instanceId).toReversed(),
  );
  expect(boltmon.keywords).not.toContain("Raid");
  expect(final.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT22-092")!.isSuspended).toBe(false);
  expect(final.memory).toBe(4);
  expect(final.turnSeat).toBe(0);
  expect(final.players[0]!.trash).toHaveLength(0);
  await scenario.healthy();
});

test("two Jimmys execute distinct copied Main effects before passing the turn", async ({ scenario }) => {
  await scenario.openFixture(fixtureJimmyBoltmonDouble);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await assembleBoltmon(scenario);
  let choices = 0;
  await scenario.resolveUntil(
    (s) => s.turnSeat === 1 && !s.pendingDecision && !s.combatWindow,
    (decision) => {
      if (decision.kind === "chooseOption") {
        const clauses = decision.options.choices!;
        if (choices === 0) {
          expect(clauses).toHaveLength(3);
          const choice = clauses.findIndex((clause) => clause.includes("level 5 or lower"));
          expect(choice).toBeGreaterThanOrEqual(0);
          choices++;
          return { choice };
        }
        expect(clauses).toHaveLength(2);
        expect(clauses.some((clause) => clause.includes("level 5 or lower"))).toBe(false);
        const choice = clauses.findIndex((clause) => clause.includes("By trashing"));
        expect(choice).toBeGreaterThanOrEqual(0);
        choices++;
        return { choice };
      }
      if (decision.options.candidateInstanceIds?.includes(fixtureInstanceId("payment-card"))) {
        expect(decision.options.candidateInstanceIds).toEqual([fixtureInstanceId("payment-card")]);
        return { instanceId: fixtureInstanceId("payment-card") };
      }
      return { accept: !/attack/i.test(decision.promptText) };
    },
  );
  const final = await scenario.snapshot();
  const boltmon = final.players[0]!.battleArea.find((p) => p.topCard.instanceId === fixtureInstanceId("boltmon-card"))!;
  expect(choices).toBe(2);
  expect(boltmon.stack.map((c) => c.instanceId)).toEqual(
    before.players[0]!.trash.map((c) => c.instanceId).toReversed(),
  );
  expect(final.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT22-092").map((p) => p.isSuspended)).toEqual(
    [true, true],
  );
  expect(final.players[0]!.trash.map((c) => c.instanceId)).toEqual([fixtureInstanceId("payment-card")]);
  expect(final.players[0]!.hand.map((c) => c.instanceId)).toContain(fixtureInstanceId("wrong-trait-card"));
  expect(final.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 2);
  expect(final.players[1]!.battleArea).toHaveLength(0);
  expect(final.memory).toBe(4);
  expect(final.turnSeat).toBe(1);
  expect(final.players[1]!.securityCount).toBe(before.players[1]!.securityCount);
  await scenario.healthy();
});

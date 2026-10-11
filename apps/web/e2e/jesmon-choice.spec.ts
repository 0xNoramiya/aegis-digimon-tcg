import fixtureJesmonChoice from "../../api/src/engine/scenarios/jesmon-choice.fixture";
import fixtureJesmonNameRestriction from "../../api/src/engine/scenarios/jesmon-name-restriction.fixture";
import { fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const CHOICES = ["Play an Atho, René & Por Token", "Play a Sistermon from hand or trash", "Don't use"];

test("both Jesmon timings visibly offer Sistermon, playing hand then trash", async ({ scenario, page }) => {
  await scenario.openFixture(fixtureJesmonChoice);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const base = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT6-015")!;
  let choices = 0;
  await scenario.evolve("Jesmon", base.permanentId, true);
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      s.players[0]!.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("hand-sistermon-card")),
    (decision) => {
      if (decision.kind === "chooseOption" && decision.sourceCardId === "BT23-013") {
        expect(decision.options.choices).toEqual(CHOICES);
        choices++;
        return { choice: 1 };
      }
      if (decision.kind === "selectCards") return { instanceId: fixtureInstanceId("hand-sistermon-card") };
      return { accept: false };
    },
  );
  const evolved = await scenario.snapshot();
  expect(evolved.memory).toBe(7);
  expect(evolved.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 2);
  expect(
    evolved.players[0]!.battleArea.find((p) => p.permanentId === base.permanentId)!.stack.map((c) => c.instanceId),
  ).toEqual([base.topCard.instanceId]);
  await scenario.attack(base.permanentId);
  await scenario.resolveUntil(
    (s) => s.combatWindow?.kind === "alliance",
    (decision) => {
      if (decision.kind === "chooseOption" && decision.sourceCardId === "BT23-013") {
        expect(decision.options.choices).toEqual(CHOICES);
        choices++;
        return { choice: 1 };
      }
      if (decision.kind === "selectCards") {
        expect(decision.options.candidateInstanceIds).toEqual([fixtureInstanceId("trash-sistermon-card")]);
        return { instanceId: fixtureInstanceId("trash-sistermon-card") };
      }
      return { accept: false };
    },
  );
  await expect(page.getByRole("region", { name: "Alliance window", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Pass$/i }).click();
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision && !s.combatWindow && s.players[1]!.securityCount === before.players[1]!.securityCount - 1,
  );
  const final = await scenario.snapshot();
  expect(choices).toBe(2);
  expect(final.memory).toBe(8); // Ciel's On Play gains 1; Jesmon pays no play cost.
  expect(final.players[0]!.trash).toHaveLength(0);
  expect(final.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual(
    expect.arrayContaining([fixtureInstanceId("hand-sistermon-card"), fixtureInstanceId("trash-sistermon-card")]),
  );
  expect(final.players[0]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-AthoRenePor-Token")).toBe(false);
  await scenario.healthy();
});

test("existing token and Ciel names leave only the legal trash Sistermon", async ({ scenario, page }) => {
  await scenario.openFixture(fixtureJesmonNameRestriction);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const jesmon = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT23-013")!;
  let optionalOffers = 0;
  await scenario.attack(jesmon.permanentId);
  await scenario.resolveUntil(
    (s) => s.combatWindow?.kind === "alliance",
    (decision) => {
      if (
        decision.kind === "optional" &&
        decision.sourceCardId === "BT23-013" &&
        decision.options.timing === "WhenAttacking"
      ) {
        optionalOffers++;
        return { accept: true };
      }
      if (decision.kind === "selectCards") {
        expect(decision.options.candidateInstanceIds).toEqual([fixtureInstanceId("trash-sistermon-card")]);
        return { instanceId: fixtureInstanceId("trash-sistermon-card") };
      }
      expect(decision.kind).not.toBe("chooseOption");
      return { accept: false };
    },
  );
  await expect(page.getByRole("region", { name: "Alliance window", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Pass$/i }).click();
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision && !s.combatWindow && s.players[1]!.securityCount === before.players[1]!.securityCount - 1,
  );
  const final = await scenario.snapshot();
  expect(optionalOffers).toBe(1);
  expect(final.players[0]!.battleArea.filter((p) => p.topCard.cardId === "TOKEN-AthoRenePor-Token")).toHaveLength(1);
  expect(final.players[0]!.hand.map((c) => c.instanceId)).toContain(fixtureInstanceId("blocked-ciel-card"));
  expect(final.players[0]!.trash).toHaveLength(0);
  expect(final.memory).toBe(10);
  expect(final.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 1);
  await scenario.healthy();
});

for (const choice of [0, 2]) {
  test(`Jesmon can ${choice === 0 ? "choose the token" : "decline both branches"}`, async ({ scenario }) => {
    await scenario.openFixture(fixtureJesmonChoice);
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const before = await scenario.snapshot();
    const base = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT6-015")!;
    await scenario.evolve("Jesmon", base.permanentId, true);
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        s.players[0]!.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("jesmon-card")),
      (decision) => {
        if (decision.kind === "chooseOption" && decision.sourceCardId === "BT23-013") {
          expect(decision.options.choices).toEqual(CHOICES);
          return { choice };
        }
        return { accept: false };
      },
    );
    const final = await scenario.snapshot();
    expect(final.players[0]!.battleArea.filter((p) => p.topCard.cardId === "TOKEN-AthoRenePor-Token")).toHaveLength(
      choice === 0 ? 1 : 0,
    );
    expect(final.players[0]!.hand.map((c) => c.instanceId)).toContain(fixtureInstanceId("hand-sistermon-card"));
    expect(final.players[0]!.trash.map((c) => c.instanceId)).toContain(fixtureInstanceId("trash-sistermon-card"));
    expect(final.memory).toBe(7);
    await scenario.healthy();
  });
}

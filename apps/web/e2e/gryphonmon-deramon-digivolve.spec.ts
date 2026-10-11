import fixtureDeramonBreedingLevel from "../../api/src/engine/scenarios/deramon-breeding-level.fixture";
import fixtureGryphonmonDeramon from "../../api/src/engine/scenarios/gryphonmon-deramon.fixture";
import { fixtureInstanceId, fixturePermanentId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const candidateClass = /game-permanent--candidate/;

test("Deramon is not offered on Pomumon over Yokomon in breeding, only on Parasaurmon", async ({ scenario, page }) => {
  await scenario.openFixture(fixtureDeramonBreedingLevel);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const deramon = before.players[0]!.hand.find((card) => card.instanceId === fixtureInstanceId("deramon-card"))!;
  expect([...deramon.digivolveTargetPermanentIds]).toEqual([fixturePermanentId("own-parasaurmon")]);

  await scenario.hand("Deramon");
  const pomumon = page.locator(`.game-permanent[data-permanent-id="${fixturePermanentId("own-pomumon")}"]`);
  const parasaurmon = page.locator(`.game-permanent[data-permanent-id="${fixturePermanentId("own-parasaurmon")}"]`);
  await expect(parasaurmon).toHaveClass(candidateClass);
  await expect(pomumon).not.toHaveClass(candidateClass);

  await page.getByRole("button", { name: "Digivolve", exact: true }).click();
  await page.locator(`[data-drop="perm-you"][data-id="${fixturePermanentId("own-parasaurmon")}"]`).click();
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("deramon-card")) &&
      !s.pendingDecision,
    () => ({ accept: false }),
  );
  const after = await scenario.snapshot();
  expect(after.memory).toBe(before.memory - 3);
  expect(after.players[0]!.breeding?.topCard.cardId).toBe("EX9-036");
  expect(after.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(["BT21-003"]);
  await scenario.healthy();
});

test("Gryphonmon's When Attacking offers Deramon and Toropiamon to Parasaurmon", async ({ scenario, page }) => {
  test.setTimeout(120_000);
  const parasaurmonId = fixturePermanentId("own-parasaurmon");
  await scenario.openFixture(fixtureGryphonmonDeramon);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  let offeredCards: string[] | undefined;

  await scenario.attack(fixturePermanentId("own-gryphonmon"));
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.battleArea.find((p) => p.permanentId === parasaurmonId)?.topCard.cardId === "BT21-038" &&
      s.combatWindow?.kind === "alliance",
    (decision) => {
      const candidates = decision.options.candidateInstanceIds ?? [];
      if (candidates.includes(parasaurmonId)) return { instanceId: parasaurmonId };
      if (candidates.includes(fixtureInstanceId("toropiamon-card"))) {
        offeredCards = [...candidates];
        return { instanceId: fixtureInstanceId("deramon-card") };
      }
      return { accept: decision.kind === "optional" };
    },
  );
  expect(offeredCards).toEqual(
    expect.arrayContaining([fixtureInstanceId("deramon-card"), fixtureInstanceId("toropiamon-card")]),
  );

  await page.getByRole("button", { name: /^Pass$/i }).click();
  await scenario.resolveUntil(
    (s) => s.players[1]!.securityCount === 3 && !s.pendingDecision && !s.combatWindow,
    () => ({ accept: false }),
  );
  const after = await scenario.snapshot();
  const evolved = after.players[0]!.battleArea.find((p) => p.permanentId === parasaurmonId)!;
  expect(evolved.stack.map((card) => card.cardId)).toEqual(["EX9-040"]);
  expect(after.players[0]!.hand.map((card) => card.instanceId)).toContain(fixtureInstanceId("toropiamon-card"));
  expect(after.memory).toBe(before.memory);
  await scenario.healthy();
});

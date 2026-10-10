import { test, expect } from "./scenario-page";

const candidateClass = /game-permanent--candidate/;

test("feedback #6: Deramon is not offered on Pomumon over Yokomon in breeding, only on Parasaurmon", async ({
  scenario,
  page,
}) => {
  await scenario.open("arena-feedback6-deramon-breeding-level");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const deramon = before.players[0]!.hand.find((card) => card.instanceId === "dev-feedback6-deramon")!;
  expect([...deramon.digivolveTargetPermanentIds]).toEqual(["dev-perm-0-feedback6-parasaurmon"]);

  await scenario.hand("Deramon");
  const pomumon = page.locator('.game-permanent[data-permanent-id="dev-perm-0-feedback6-pomumon"]');
  const parasaurmon = page.locator('.game-permanent[data-permanent-id="dev-perm-0-feedback6-parasaurmon"]');
  await expect(parasaurmon).toHaveClass(candidateClass);
  await expect(pomumon).not.toHaveClass(candidateClass);

  await page.getByRole("button", { name: "Digivolve", exact: true }).click();
  await page.locator('[data-drop="perm-you"][data-id="dev-perm-0-feedback6-parasaurmon"]').click();
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.instanceId === "dev-feedback6-deramon") && !s.pendingDecision,
    () => ({ accept: false }),
  );
  const after = await scenario.snapshot();
  expect(after.memory).toBe(before.memory - 3);
  expect(after.players[0]!.breeding?.topCard.cardId).toBe("EX9-036");
  expect(after.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(["BT21-003"]);
  await scenario.healthy();
});

test("feedback #15: Gryphonmon's When Attacking offers Deramon and Toropiamon to Parasaurmon", async ({
  scenario,
  page,
}) => {
  test.setTimeout(120_000);
  const parasaurmonId = "dev-perm-0-feedback15-parasaurmon";
  await scenario.open("arena-feedback15-gryphonmon-deramon");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  let offeredCards: string[] | undefined;

  await scenario.attack("dev-perm-0-feedback15-gryphonmon");
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.battleArea.find((p) => p.permanentId === parasaurmonId)?.topCard.cardId === "BT21-038" &&
      s.combatWindow?.kind === "alliance",
    (decision) => {
      const candidates = decision.options.candidateInstanceIds ?? [];
      if (candidates.includes(parasaurmonId)) return { instanceId: parasaurmonId };
      if (candidates.includes("dev-feedback15-toropiamon")) {
        offeredCards = [...candidates];
        return { instanceId: "dev-feedback15-deramon" };
      }
      return { accept: decision.kind === "optional" };
    },
  );
  expect(offeredCards).toEqual(expect.arrayContaining(["dev-feedback15-deramon", "dev-feedback15-toropiamon"]));

  await page.getByRole("button", { name: /^Pass$/i }).click();
  await scenario.resolveUntil(
    (s) => s.players[1]!.securityCount === 3 && !s.pendingDecision && !s.combatWindow,
    () => ({ accept: false }),
  );
  const after = await scenario.snapshot();
  const evolved = after.players[0]!.battleArea.find((p) => p.permanentId === parasaurmonId)!;
  expect(evolved.stack.map((card) => card.cardId)).toEqual(["EX9-040"]);
  expect(after.players[0]!.hand.map((card) => card.instanceId)).toContain("dev-feedback15-toropiamon");
  expect(after.memory).toBe(before.memory);
  await scenario.healthy();
});

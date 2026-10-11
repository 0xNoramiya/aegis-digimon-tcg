import { test, expect } from "./scenario-page";

const SCENARIO = "arena-feedback18-sukamon-inherited-protection";
const KINGSUKAMON_ID = "dev-perm-0-feedback18-kingsukamon";
const SUKAMON_ID = "dev-perm-0-feedback18-sukamon";

// DB feedback #18 (no match id): "New Sukamon Protection Inheritables are not activating". The
// EX13 Chuumon and Sukamon inherited clauses delete 1 other [Sukamon] Digimon so that the Digimon
// carrying them doesn't leave. KingSukamon carries both and loses a security battle to Omnimon.
test("feedback #18: KingSukamon stays in play after its inherited Sukamon protection is paid", async ({ scenario }) => {
  const { page } = scenario;
  await scenario.open(SCENARIO);
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  const before = (await scenario.snapshot()).players[0]!.battleArea.find((p) => p.permanentId === KINGSUKAMON_ID)!;

  await scenario.attack(KINGSUKAMON_ID);
  const preventPrompts: string[] = [];
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      !s.combatWindow &&
      s.players[1]!.securityCount === 2 &&
      !s.players[0]!.battleArea.some((p) => p.permanentId === SUKAMON_ID),
    (decision) => {
      if (decision.kind === "optional") preventPrompts.push(decision.sourceCardId ?? "");
      return {};
    },
  );

  const human = (await scenario.snapshot()).players[0]!;
  const kingSukamon = human.battleArea.find((p) => p.permanentId === KINGSUKAMON_ID);
  expect(kingSukamon?.topCard.cardId).toBe("EX13-031");
  expect(kingSukamon?.stack.map((card) => card.instanceId)).toEqual(before.stack.map((card) => card.instanceId));
  expect(preventPrompts).toEqual(["EX13-027"]);
  expect(human.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX13-027", "EX13-028"]));
  await expect(page.locator(`[data-drop="perm-you"][data-id="${KINGSUKAMON_ID}"]`)).toBeVisible();
  await expect(page.locator(`[data-drop="perm-you"][data-id="${SUKAMON_ID}"]`)).toHaveCount(0);
  await scenario.healthy();
});

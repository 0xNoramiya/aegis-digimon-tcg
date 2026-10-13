import fixture from "../../api/src/engine/scenarios/homeros-end-turn-cost.fixture";
import { test, expect } from "./scenario-page";

test("Homeros offers Wrath Mode's effect again after its per-turn use resets", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  await scenario.evolve("Jupitermon: Wrath Mode", refs.permanentId("base"), true);
  await scenario.resolveUntil(
    (state) => state.turnCount === 6 && state.turnSeat === 0 && state.phase === "Main" && !state.pendingDecision,
    (decision) => ({
      accept: decision.sourceCardId !== "BT24-102",
      decisionBudgetMs: decision.sourceCardId === "BT24-102" ? 10_000 : undefined,
    }),
  );
  expect((await scenario.snapshot()).players[0]!.securityCount).toBe(6);
  await scenario.page.getByRole("button", { name: /^End turn$/i }).click();
  await scenario.resolveUntil((state) => state.players[0]!.securityCount === 7 && !state.pendingDecision);
  expect(
    (await scenario.snapshot()).players[0]!.battleArea.find(
      (permanent) => permanent.permanentId === refs.permanentId("homeros"),
    )!.isSuspended,
  ).toBe(true);
  await scenario.healthy();
});

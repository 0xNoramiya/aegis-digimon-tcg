import fixture from "../../api/src/engine/scenarios/metalgreymon-printed-security-attack.fixture";
import { test, expect } from "./scenario-page";

test("MetalGreymon has no unprinted base Security Attack bonus", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  expect((await scenario.snapshot()).players[0]!.battleArea[0]!.securityAttackModifier).toBe(0);
  await scenario.attack(refs.permanentId("metalgreymon"));
  await scenario.resolveUntil(
    (state) => state.players[1]!.securityCount === 4 && !state.pendingDecision && !state.combatWindow,
  );
  expect((await scenario.presentation()).events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
  await scenario.healthy();
});

import fixtureToropiamonVortexControl from "../../api/src/engine/scenarios/toropiamon-vortex-control.fixture";
import { fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

test("/ Q2872: Vortex's attack suspension does not count as effect suspension", async ({ scenario, page }) => {
  await scenario.openFixture(fixtureToropiamonVortexControl);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const initial = await scenario.snapshot();
  expect(initial.players[0]!.battleArea[0]!.keywords).toContain("Vortex");
  await page.getByRole("button", { name: /^end turn$/i }).click();
  await scenario.resolveUntil((s) => s.turnSeat === 1 && !s.pendingDecision && !s.combatWindow);
  const final = await scenario.snapshot();
  expect(final.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-042");
  expect(final.players[0]!.hand.some((c) => c.instanceId === fixtureInstanceId("report-hydra-card"))).toBe(true);
  expect(final.players[1]!.battleArea).toHaveLength(0);
  const events = (await scenario.presentation()).events;
  expect(events.filter((e) => e.kind === "attackDeclared")).toHaveLength(1);
  expect(events.some((e) => e.kind === "digivolved" && e.cardId === "EX9-044")).toBe(false);
  expect(events.findIndex((e) => e.kind === "attackEnded")).toBeLessThan(
    events.findIndex((e) => e.kind === "turnEnded"),
  );
  await scenario.healthy();
});

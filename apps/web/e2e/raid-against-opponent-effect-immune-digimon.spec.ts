import fixtureRaidAgainstImmuneDigimon from "../../api/src/engine/scenarios/raid-against-opponent-effect-immune-digimon.fixture";
import { fixturePermanentId } from "../../api/src/engine/scenario/references";
import { test, expect, type ScenarioPage } from "./scenario-page";

test.use({ holdBotAfterTurn: 0 });

async function raidAgainstImmuneDefender(scenario: ScenarioPage) {
  const refs = await scenario.openFixture(fixtureRaidAgainstImmuneDigimon);
  await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);
  const firstDefender = fixturePermanentId("first-immune-defender");
  const secondDefender = fixturePermanentId("second-immune-defender");
  const before = await scenario.snapshot();
  const defenders = before.players[1]!.battleArea;
  expect(defenders.map((p) => p.permanentId)).toEqual([firstDefender, secondDefender]);
  for (const defender of defenders) {
    expect(defender.immuneToOpponentDigimonEffects && defender.immuneToOpponentOptionEffects).toBe(true);
    expect(defender.isSuspended).toBe(false);
  }
  await scenario.attack(fixturePermanentId("raid-attacker"));
  let raidCandidates: string[] = [];
  await scenario.resolveUntil(
    (s) => !s.pendingDecision && !s.combatWindow && s.players[1]!.battleArea.length === 1,
    (decision) => {
      if (!decision.promptText.includes("Raid")) return { accept: false };
      raidCandidates = decision.options.candidateInstanceIds ?? [];
      return { instanceId: refs.instanceId("second-immune-defender-card") };
    },
  );
  expect(raidCandidates).toEqual([
    refs.instanceId("first-immune-defender-card"),
    refs.instanceId("second-immune-defender-card"),
  ]);
  const probe = await scenario.presentation();
  expect(
    probe.events.some(
      (e) =>
        e.kind === "attackDeclared" &&
        e.redirected &&
        e.target.kind === "permanent" &&
        e.target.permanentId === secondDefender,
    ),
  ).toBe(true);
  const after = await scenario.snapshot();
  expect(after.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([firstDefender]);
  expect(after.players[0]!.battleArea).toHaveLength(0);
  expect(after.players[1]!.securityCount).toBe(3);
  expect(probe.events.filter((e) => e.kind === "securityChecked")).toHaveLength(0);
  await scenario.healthy();
}

test("Raid switches the attack to a Digimon unaffected by the attacker's effects", async ({ scenario }) => {
  await raidAgainstImmuneDefender(scenario);
});

test.describe("at phone width", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("Raid switches the attack to a Digimon unaffected by the attacker's effects", async ({ scenario }) => {
    await raidAgainstImmuneDefender(scenario);
  });
});

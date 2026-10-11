import fixturePreventedCostLucemonJupitermon from "../../api/src/engine/scenarios/prevented-cost-lucemon-jupitermon.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect, type DecisionPolicy, type ScenarioPage } from "./scenario-page";

const LUCEMON_ID = fixturePermanentId("own-prevented-cost-lucemon");
const JUPITERMON_ID = fixturePermanentId("own-prevented-cost-jupitermon");
const JUPITERMON_CARD = fixtureInstanceId("own-card-prevented-cost-jupitermon-card");
const CHAOS_MODE = fixtureInstanceId("prevented-cost-chaos-mode-card");

// Follow-up to feedback #36: a "by placing" cost that a leave prevention stops is not paid,
// so the rest of the effect does not happen (Q7247, Q5169).

async function endTurnAnsweringJupitermon(scenario: ScenarioPage, jupitermonPrevents: boolean): Promise<void> {
  await scenario.openFixture(fixturePreventedCostLucemonJupitermon);
  const prompts: string[] = [];
  const policy: DecisionPolicy = (decision) => {
    if (decision.kind === "optional") {
      if (decision.sourceCardId !== undefined) prompts.push(decision.sourceCardId);
      return { accept: decision.sourceCardId === "BT24-101" ? jupitermonPrevents : true };
    }
    if (decision.options.candidateInstanceIds?.includes(CHAOS_MODE)) return { instanceId: CHAOS_MODE };
    return { accept: false };
  };
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision, policy);
  const endingTurn = (await scenario.snapshot()).turnCount;
  await scenario.page.getByRole("button", { name: /^End turn$/i }).click();
  await scenario.resolveUntil((s) => s.turnCount > endingTurn && prompts.includes("BT24-101"), policy);
}

test("prevented cost: Lucemon does not digivolve when Jupitermon keeps itself on the field", async ({ scenario }) => {
  await endTurnAnsweringJupitermon(scenario, true);

  const human = (await scenario.snapshot()).players[0]!;
  expect(human.battleArea.map((permanent) => permanent.permanentId)).toContain(JUPITERMON_ID);
  expect(human.security.map((card) => card.instanceId)).not.toContain(JUPITERMON_CARD);
  expect(human.security).toHaveLength(2);
  expect(human.battleArea.find((permanent) => permanent.permanentId === LUCEMON_ID)?.topCard.cardId).toBe("BT18-034");
  expect(human.trash.map((card) => card.instanceId)).toContain(CHAOS_MODE);
  await scenario.healthy();
});

test("prevented cost: Lucemon digivolves when Jupitermon is declined", async ({ scenario }) => {
  await endTurnAnsweringJupitermon(scenario, false);

  const human = (await scenario.snapshot()).players[0]!;
  expect(human.battleArea.map((permanent) => permanent.permanentId)).not.toContain(JUPITERMON_ID);
  expect(human.security.map((card) => card.instanceId)).toContain(JUPITERMON_CARD);
  expect(human.battleArea.find((permanent) => permanent.permanentId === LUCEMON_ID)?.topCard.instanceId).toBe(
    CHAOS_MODE,
  );
  await scenario.healthy();
});

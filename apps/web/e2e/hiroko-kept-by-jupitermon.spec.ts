import fixtureHirokoKeptByJupitermon from "../../api/src/engine/scenarios/hiroko-kept-by-jupitermon.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const HIROKO_ID = fixturePermanentId("own-hiroko");
const FUGAMON = fixtureInstanceId("fugamon-card");

test("Hiroko kept on the field by Jupitermon plays nothing", async ({ scenario }) => {
  await scenario.openFixture(fixtureHirokoKeptByJupitermon, "normal", "none");
  const prompts: string[] = [];
  await scenario.resolveUntil(
    (s) => s.phase === "Breeding" && !s.pendingDecision && prompts.includes("BT24-101"),
    (decision) => {
      if (decision.kind === "optional" && decision.sourceCardId !== undefined) prompts.push(decision.sourceCardId);
      return { accept: true };
    },
  );

  expect(prompts).toEqual(["BT24-083", "BT24-101"]);
  const human = (await scenario.snapshot()).players[0]!;
  expect(human.battleArea.map((permanent) => permanent.permanentId)).toContain(HIROKO_ID);
  expect(human.security).toHaveLength(2);
  expect(human.hand.map((card) => card.instanceId)).toContain(FUGAMON);
  expect(human.battleArea.some((permanent) => permanent.topCard.instanceId === FUGAMON)).toBe(false);
  await scenario.healthy();
});

test("Hiroko returns and plays Fugamon when Jupitermon is declined", async ({ scenario }) => {
  await scenario.openFixture(fixtureHirokoKeptByJupitermon, "normal", "none");
  await scenario.resolveUntil(
    (s) =>
      s.phase === "Breeding" &&
      !s.pendingDecision &&
      s.players[0]!.battleArea.some((p) => p.topCard.instanceId === FUGAMON),
    (decision) => {
      if (decision.kind === "optional") return { accept: decision.sourceCardId !== "BT24-101" };
      return { instanceId: FUGAMON };
    },
  );

  const human = (await scenario.snapshot()).players[0]!;
  expect(human.battleArea.map((permanent) => permanent.permanentId)).not.toContain(HIROKO_ID);
  expect(human.security).toHaveLength(3);
  await scenario.healthy();
});

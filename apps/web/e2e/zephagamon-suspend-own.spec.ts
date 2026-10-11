import fixtureZephagamonSuspendOwn from "../../api/src/engine/scenarios/zephagamon-suspend-own.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const HOST_ID = fixturePermanentId("own-grandgalemon");
const FIELD_PTEROMON_ID = fixturePermanentId("own-pteromon");
const BOT_MONODRAMON_ID = fixturePermanentId("opponent-monodramon");
const HAND_PTEROMON = fixtureInstanceId("hand-pteromon-card");

test("Zephagamon suspends your own Digimon and plays a Bird from hand", async ({ scenario }) => {
  await scenario.openFixture(fixtureZephagamonSuspendOwn);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.evolve("Zephagamon", HOST_ID);

  const fates: string[] = [];
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      s.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === HAND_PTEROMON),
    (decision) => {
      if (decision.kind === "chooseTargets" && decision.sourceCardId === "EX11-035") {
        fates.push(decision.options.targetFate!);
        if (decision.options.targetFate === "unsuspend") {
          expect(decision.options.candidateInstanceIds).toEqual([BOT_MONODRAMON_ID]);
          return { accept: false };
        }
        expect([...decision.options.candidateInstanceIds!].sort()).toEqual(
          [BOT_MONODRAMON_ID, FIELD_PTEROMON_ID, HOST_ID].sort(),
        );
        return { instanceId: FIELD_PTEROMON_ID };
      }
      return { accept: true };
    },
  );

  expect(fates).toEqual(["unsuspend", "suspend"]);
  const state = await scenario.snapshot();
  const human = state.players[0]!.battleArea;
  expect(human.find((permanent) => permanent.permanentId === FIELD_PTEROMON_ID)?.isSuspended).toBe(true);
  expect(human.find((permanent) => permanent.permanentId === HOST_ID)?.topCard.cardId).toBe("EX11-035");
  expect(human.find((permanent) => permanent.permanentId === HOST_ID)?.isSuspended).toBe(false);
  expect(
    state.players[1]!.battleArea.find((permanent) => permanent.permanentId === BOT_MONODRAMON_ID)?.isSuspended,
  ).toBe(true);
  await scenario.healthy();
});

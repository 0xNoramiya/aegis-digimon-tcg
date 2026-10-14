import fixture from "../../api/src/engine/scenarios/zephagamon-delay-digivolve-suspend-choices.fixture";
import { test, expect } from "./scenario-page";

test("Zephagamon digivolved mid-attack offers every Digimon to its suspend step", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture);
  const attacker = refs.permanentId("attacker");
  const standingPteromon = refs.permanentId("standingPteromon");
  const opponentStanding = refs.permanentId("opponentStanding");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.attack(attacker);

  const fates: string[] = [];
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      !s.combatWindow &&
      s.players[0]!.battleArea.find((permanent) => permanent.permanentId === standingPteromon)?.isSuspended === true,
    (decision) => {
      if (decision.kind === "chooseTargets" && decision.sourceCardId === "EX11-062") return { instanceId: attacker };
      if (decision.kind === "chooseTargets" && decision.sourceCardId === "EX11-035") {
        fates.push(decision.options.targetFate!);
        if (decision.options.targetFate === "unsuspend") {
          expect(decision.options.candidateInstanceIds).toEqual([attacker]);
          return { accept: false };
        }
        expect([...decision.options.candidateInstanceIds!].sort()).toEqual(
          [attacker, standingPteromon, opponentStanding].sort(),
        );
        return { instanceId: standingPteromon };
      }
      return { accept: true };
    },
  );

  expect(fates).toEqual(["unsuspend", "suspend"]);
  const state = await scenario.snapshot();
  const zephagamon = state.players[0]!.battleArea.find((permanent) => permanent.permanentId === attacker);
  expect(zephagamon?.topCard.cardId).toBe("EX11-035");
  expect(
    state.players[1]!.battleArea.find((permanent) => permanent.permanentId === opponentStanding)?.isSuspended,
  ).toBe(false);
  await scenario.healthy();
});

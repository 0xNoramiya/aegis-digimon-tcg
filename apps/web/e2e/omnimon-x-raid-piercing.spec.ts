import fixtureOmnimonXRaidPiercing from "../../api/src/engine/scenarios/omnimon-x-raid-piercing.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const OMNIMON = fixturePermanentId("own-omnimon");
const PLESIOMON = fixturePermanentId("opponent-plesiomon");
const PLESIOMON_CARD = fixtureInstanceId("opponent-card-plesiomon-card");
const MONODRAMON = fixturePermanentId("opponent-monodramon");

test("Omnimon (X Antibody) checks security with Piercing after Raid wins the battle", async ({ scenario }) => {
  await scenario.openFixture(fixtureOmnimonXRaidPiercing);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.attack(OMNIMON);

  const prompts: string[] = [];
  await scenario.resolveUntil(
    (s) =>
      !s.combatWindow &&
      !s.pendingDecision &&
      s.players[1]!.securityCount === 2 &&
      !s.players[1]!.battleArea.some((permanent) => permanent.permanentId === PLESIOMON),
    (decision) => {
      prompts.push(`${decision.kind}:${decision.promptText}`);
      if (decision.kind === "orderTriggers") return { triggerCardId: "BT20-102" };
      if (decision.kind === "selectCards") return { instanceId: PLESIOMON_CARD };
      if (decision.kind === "chooseTargets") return { instanceId: MONODRAMON };
      return {};
    },
  );

  expect(prompts).toEqual([
    "orderTriggers:Choose the next pending effect to resolve.",
    "selectCards:＜Raid＞: switch the attack target to this opponent's Digimon?",
    "chooseTargets:WarGreymon",
  ]);
  const snapshot = await scenario.snapshot();
  expect(snapshot.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(MONODRAMON);
  expect(snapshot.players[1]!.securityCount).toBe(2);
  expect(snapshot.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(OMNIMON);
  await scenario.healthy();
});

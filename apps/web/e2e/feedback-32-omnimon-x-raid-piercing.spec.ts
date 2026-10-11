import { test, expect } from "./scenario-page";

const OMNIMON = "dev-perm-0-feedback32-omnimon";
const PLESIOMON = "dev-perm-1-feedback32-plesiomon";
const PLESIOMON_CARD = "dev-field-1-feedback32-plesiomon";
const MONODRAMON = "dev-perm-1-feedback32-monodramon";

test("feedback #32: Omnimon (X Antibody) checks security with Piercing after Raid wins the battle", async ({
  scenario,
}) => {
  await scenario.open("arena-feedback32-omnimon-x-raid-piercing");
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

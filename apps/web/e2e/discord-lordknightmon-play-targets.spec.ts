import { test, expect } from "./scenario-page";

const KNIGHTMON_ID = "dev-perm-0-lordknightmon-ex13-knightmon";
const HAND_DARKKNIGHTMON = "dev-lordknightmon-ex13-hand-darkknightmon";
const TRASH_DARKKNIGHTMON = "dev-lordknightmon-ex13-trash-darkknightmon";
const BT22_LORDKNIGHTMON_ID = "dev-perm-0-lordknightmon-bt22-lordknightmon";
const REVEALED_SKULLKNIGHTMON = "dev-lordknightmon-bt22-deck-0-1";

for (const [source, instanceId] of [
  ["hand", HAND_DARKKNIGHTMON],
  ["trash", TRASH_DARKKNIGHTMON],
] as const) {
  test(`Discord 1558289219074654299: EX13 LordKnightmon plays EX10 DarkKnightmon from ${source}`, async ({
    scenario,
  }) => {
    await scenario.open("arena-discord-lordknightmon-ex13-darkknightmon");
    await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
    await scenario.evolve("LordKnightmon", KNIGHTMON_ID);

    const offered: string[][] = [];
    await scenario.resolveUntil(
      (s) => !s.pendingDecision && s.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId),
      (decision) => {
        if (decision.sourceCardId === "EX13-064" && decision.kind === "selectCards") {
          offered.push([...decision.options.candidateInstanceIds!].sort());
          return { instanceId };
        }
        if (decision.kind === "optional") return { accept: false };
        return {};
      },
    );

    expect(offered).toEqual([[HAND_DARKKNIGHTMON, TRASH_DARKKNIGHTMON].sort()]);
    const after = await scenario.snapshot();
    expect(after.memory).toBe(0);
    expect(after.players[0]!.battleArea.map((p) => p.topCard.cardId).sort()).toEqual(["EX10-031", "EX13-064"]);
    await scenario.healthy();
  });
}

test("Discord 1558289910425985055: BT22 LordKnightmon plays a revealed Black/Purple SkullKnightmon", async ({
  scenario,
}) => {
  await scenario.open("arena-discord-lordknightmon-bt22-skullknightmon");
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  await scenario.attack(BT22_LORDKNIGHTMON_ID);

  const offered: string[][] = [];
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      !s.combatWindow &&
      s.players[0]!.battleArea.some((p) => p.topCard.instanceId === REVEALED_SKULLKNIGHTMON) &&
      s.players[1]!.securityCount < 4,
    (decision) => {
      if (decision.sourceCardId === "BT22-067" && decision.kind === "selectCards") {
        offered.push([...decision.options.candidateInstanceIds!]);
        return { instanceId: REVEALED_SKULLKNIGHTMON };
      }
      return { accept: false };
    },
  );

  expect(offered).toEqual([[REVEALED_SKULLKNIGHTMON]]);
  const after = await scenario.snapshot();
  expect(after.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT5-042", "EX13-058"]);
  await scenario.healthy();
});

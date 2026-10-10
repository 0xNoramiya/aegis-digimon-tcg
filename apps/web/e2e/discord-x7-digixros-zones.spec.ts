import { test, expect } from "./scenario-page";

const SHOUTMON_X7_PERMANENT = "dev-perm-0-discord-x7";
const SHOUTMON_X7 = "dev-field-0-discord-x7";
const SHOUTMON_X4 = "dev-stack-0-discord-x7-0";
const STARMONS = "dev-stack-0-discord-x7-1";
const BALLISTAMON = "dev-stack-0-discord-x7-2";
const TAI_PERMANENT = "dev-perm-0-discord-x7-tai";
const OLDER_DORULUMON = "dev-stack-0-discord-x7-tai-0";
const HAND_DORULUMON = "dev-discord-x7-hand-dorulumon";
const OMNIMON_PERMANENT = "dev-perm-1-discord-x7-omnimon";

// Discord 1558458433970380820. DigiXros materials come from the hand and battle area (rule 7-2-1).
// Q6060 adds only the cards that Shoutmon X7's own [All Turns] effect placed under a Tamer.
test("Discord 1558458433970380820: Shoutmon X7 replacement play offers only legal DigiXros zones", async ({
  scenario,
  page,
}) => {
  await scenario.open("arena-discord-x7-digixros-zones");
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);

  await page.locator(`[data-drop="perm-you"][data-id="${SHOUTMON_X7_PERMANENT}"]`).click();
  await page.getByRole("button", { name: "Attack", exact: true }).click();
  await page.locator(`[data-drop="perm-opp"][data-id="${OMNIMON_PERMANENT}"]`).click();

  const offered: string[][] = [];
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      !s.combatWindow &&
      s.players[0]!.battleArea.some((p) => p.topCard.instanceId === SHOUTMON_X4),
    (decision) => {
      if (decision.kind === "selectCards" && decision.options.digiXrosCardId === "BT10-009") {
        offered.push([...decision.options.candidateInstanceIds!].sort());
        return {};
      }
      if (decision.sourceCardId === "AD1-006" && decision.kind === "optional") return { accept: true };
      if (decision.kind === "selectCards" && decision.options.candidateInstanceIds?.includes(STARMONS)) {
        return { instanceIds: [STARMONS, BALLISTAMON] };
      }
      if (decision.kind === "selectCards" && decision.options.candidateInstanceIds?.includes(SHOUTMON_X4)) {
        return { instanceId: SHOUTMON_X4 };
      }
      if (decision.kind === "optional") return { accept: false };
      return {};
    },
  );

  expect(offered).toEqual([[SHOUTMON_X7, HAND_DORULUMON, STARMONS, BALLISTAMON].sort()]);
  const human = (await scenario.snapshot()).players[0]!;
  const tai = human.battleArea.find((p) => p.permanentId === TAI_PERMANENT)!;
  expect(tai.stack.map((card) => card.instanceId).sort()).toEqual([OLDER_DORULUMON, STARMONS, BALLISTAMON].sort());
  expect(human.battleArea.some((p) => p.permanentId === SHOUTMON_X7_PERMANENT)).toBe(false);
  await scenario.healthy();
});

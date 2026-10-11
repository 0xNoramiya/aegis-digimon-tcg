import { test, expect } from "./scenario-page";

const SHOUTMON_X7_PERMANENT = "dev-perm-0-discord-x7";
const SHOUTMON_X7 = "dev-field-0-discord-x7";
const SHOUTMON_X4 = "dev-stack-0-discord-x7-0";
const STARMONS = "dev-stack-0-discord-x7-1";
const BALLISTAMON = "dev-stack-0-discord-x7-2";
const TAIKI_PERMANENT = "dev-perm-0-discord-x7-taiki";
const TAIKI = "dev-field-0-discord-x7-taiki";
const OLDER_DORULUMON = "dev-stack-0-discord-x7-taiki-0";
const HAND_DORULUMON = "dev-discord-x7-hand-dorulumon";
const OMNIMON_PERMANENT = "dev-perm-1-discord-x7-omnimon";

// Discord 1558458433970380820. Shoutmon X7's effect does not open cards under Tamers by itself.
// Taiki Kudo's [Your Turn] permission does, by suspending Taiki (Q2011/Q2012). The cards X7 just
// placed under Taiki are then eligible like the older ones (Q6060), and X7 itself is too (Q6061).
test("Discord 1558458433970380820: Shoutmon X7 play uses under-Tamer DigiXros only through Taiki", async ({
  scenario,
  page,
}) => {
  await scenario.open("arena-discord-x7-digixros-zones");
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);

  await page.locator(`[data-drop="perm-you"][data-id="${SHOUTMON_X7_PERMANENT}"]`).click();
  await page.getByRole("button", { name: "Attack", exact: true }).click();
  await page.locator(`[data-drop="perm-opp"][data-id="${OMNIMON_PERMANENT}"]`).click();

  const offered: string[][] = [];
  let taikiOffered = false;
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
      if (decision.kind === "selectCards" && decision.options.candidateInstanceIds?.includes(TAIKI)) {
        taikiOffered = true;
        return { instanceIds: [TAIKI] };
      }
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

  expect(taikiOffered).toBe(true);
  expect(offered).toEqual([[SHOUTMON_X7, HAND_DORULUMON, OLDER_DORULUMON, STARMONS, BALLISTAMON].sort()]);
  const human = (await scenario.snapshot()).players[0]!;
  const taiki = human.battleArea.find((p) => p.permanentId === TAIKI_PERMANENT)!;
  expect(taiki.stack.map((card) => card.instanceId).sort()).toEqual([OLDER_DORULUMON, STARMONS, BALLISTAMON].sort());
  expect(human.battleArea.some((p) => p.permanentId === SHOUTMON_X7_PERMANENT)).toBe(false);
  await scenario.healthy();
});

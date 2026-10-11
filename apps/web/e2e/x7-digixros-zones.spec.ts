import fixtureX7DigixrosZones from "../../api/src/engine/scenarios/x7-digixros-zones.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const SHOUTMON_X7_PERMANENT = fixturePermanentId("own-x7");
const SHOUTMON_X7 = fixtureInstanceId("own-card-x7-card");
const SHOUTMON_X4 = fixtureInstanceId("own-source-x7-0-card");
const STARMONS = fixtureInstanceId("own-source-x7-1-card");
const BALLISTAMON = fixtureInstanceId("own-source-x7-2-card");
const TAIKI_PERMANENT = fixturePermanentId("own-x7-taiki");
const TAIKI = fixtureInstanceId("own-card-x7-taiki-card");
const OLDER_DORULUMON = fixtureInstanceId("own-source-x7-taiki-0-card");
const HAND_DORULUMON = fixtureInstanceId("x7-hand-dorulumon-card");
const OMNIMON_PERMANENT = fixturePermanentId("opponent-x7-omnimon");

// Discord 1558458433970380820. Shoutmon X7's effect does not open cards under Tamers by itself.
// Taiki Kudo's [Your Turn] permission does, by suspending Taiki (Q2011/Q2012). The cards X7 just
// placed under Taiki are then eligible like the older ones (Q6060), and X7 itself is too (Q6061).
test("Shoutmon X7 play uses under-Tamer DigiXros only through Taiki", async ({ scenario, page }) => {
  await scenario.openFixture(fixtureX7DigixrosZones);
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

import fixtureTaikiKeepsXrosDigimon from "../../api/src/engine/scenarios/taiki-keeps-xros-digimon.fixture";
import { fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const PLAYED_TAIKI = fixtureInstanceId("taiki-bt10-card");
const REVEALED_TAIKI = fixtureInstanceId("taiki-reveal-taiki-card");
const KOTONE = fixtureInstanceId("taiki-reveal-kotone-card");
const SHOUTMON_X7 = fixtureInstanceId("taiki-reveal-x7-card");
const XROS_HEART = [REVEALED_TAIKI, KOTONE, SHOUTMON_X7];

// Discord 1558457266485731358. Same rule as BT18 Vemmon (Discord 1557855696114946230): the hand
// pick is free, and the place-under part uses only the cards that remain.
test.describe("BT10 Taiki add or place under", () => {
  test("adds Shoutmon X7 to hand and places nothing under Taiki", async ({ scenario, page }) => {
    await scenario.openFixture(fixtureTaikiKeepsXrosDigimon);
    await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
    const deckBefore = (await scenario.snapshot()).players[0]!.deckCount;
    await scenario.play("Taiki Kudo", "Tamer");

    const offered: string[][] = [];
    await scenario.resolveUntil(
      (s) => !s.pendingDecision && s.players[0]!.hand.some((card) => card.instanceId === SHOUTMON_X7),
      async (decision) => {
        if (decision.kind !== "selectCards" || decision.sourceCardId !== "BT10-087") return {};
        offered.push([...decision.options.candidateInstanceIds!]);
        await expect(page.getByRole("dialog").locator(`[data-instance-id="${SHOUTMON_X7}"]`)).toBeEnabled();
        return { instanceId: SHOUTMON_X7 };
      },
    );

    expect(offered).toEqual([XROS_HEART]);
    const human = (await scenario.snapshot()).players[0]!;
    const handIds = human.hand.map((card) => card.instanceId);
    expect(handIds).toContain(SHOUTMON_X7);
    expect(handIds).not.toContain(KOTONE);
    const taiki = human.battleArea.find((p) => p.topCard.instanceId === PLAYED_TAIKI)!;
    expect(taiki.stack).toHaveLength(0);
    expect(human.deckCount).toBe(deckBefore - 1);
    await scenario.healthy();
  });

  test("adds Kotone to hand and places Shoutmon X7 under Taiki", async ({ scenario }) => {
    await scenario.openFixture(fixtureTaikiKeepsXrosDigimon);
    await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
    await scenario.play("Taiki Kudo", "Tamer");

    const offered: string[][] = [];
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        s.players[0]!.battleArea.some((p) => p.topCard.instanceId === PLAYED_TAIKI && p.stack.length === 1),
      async (decision) => {
        if (decision.kind !== "selectCards" || decision.sourceCardId !== "BT10-087") return {};
        offered.push([...decision.options.candidateInstanceIds!]);
        return { instanceId: offered.length === 1 ? KOTONE : SHOUTMON_X7 };
      },
    );

    expect(offered).toEqual([XROS_HEART, [SHOUTMON_X7]]);
    const human = (await scenario.snapshot()).players[0]!;
    expect(human.hand.map((card) => card.instanceId)).toContain(KOTONE);
    expect(human.hand.map((card) => card.instanceId)).not.toContain(SHOUTMON_X7);
    const taiki = human.battleArea.find((p) => p.topCard.instanceId === PLAYED_TAIKI)!;
    expect(taiki.stack.map((card) => card.instanceId)).toEqual([SHOUTMON_X7]);
    await scenario.healthy();
  });
});

import fixtureVemmonAddOrPlace from "../../api/src/engine/scenarios/vemmon-add-or-place.fixture";
import { fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const BT18_VEMMON = fixtureInstanceId("vemmon-bt18-card");
const SNATCHMON = fixtureInstanceId("vemmon-reveal-snatchmon-card");
const XENO = fixtureInstanceId("vemmon-reveal-xeno-card");
const BT11_VEMMON = fixtureInstanceId("vemmon-reveal-bt11-card");
const REVEALED = [SNATCHMON, XENO, BT11_VEMMON];

// Discord 1557855696114946230. The hand pick is free. If the only [Vemmon] goes to hand, nothing
// is placed and the other two go to the deck bottom. Otherwise the [Vemmon] must be placed.
test.describe("BT18 Vemmon add or place", () => {
  test("adds BT11 Vemmon to hand and sends the other two to the bottom", async ({ scenario, page }) => {
    await scenario.openFixture(fixtureVemmonAddOrPlace);
    await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
    const deckBefore = (await scenario.snapshot()).players[0]!.deckCount;
    await scenario.play("Vemmon", "Digimon");

    const offered: string[][] = [];
    await scenario.resolveUntil(
      (s) => !s.pendingDecision && s.players[0]!.hand.some((card) => card.instanceId === BT11_VEMMON),
      async (decision) => {
        if (decision.kind !== "selectCards" || decision.sourceCardId !== "BT18-060") return {};
        offered.push([...decision.options.candidateInstanceIds!]);
        await expect(page.getByRole("dialog").locator(`[data-instance-id="${BT11_VEMMON}"]`)).toBeEnabled();
        return { instanceId: BT11_VEMMON };
      },
    );

    expect(offered).toEqual([REVEALED]);
    const human = (await scenario.snapshot()).players[0]!;
    const handIds = human.hand.map((card) => card.instanceId);
    expect(handIds).toContain(BT11_VEMMON);
    expect(handIds).not.toContain(SNATCHMON);
    expect(handIds).not.toContain(XENO);
    const host = human.battleArea.find((p) => p.topCard.instanceId === BT18_VEMMON)!;
    expect(host.stack).toHaveLength(0);
    // Three cards left the deck and only BT11 Vemmon was kept, so the other two are back in the deck.
    expect(human.deckCount).toBe(deckBefore - 1);
    await scenario.healthy();
  });

  test("adds Snatchmon to hand and places BT11 Vemmon under BT18 Vemmon", async ({ scenario }) => {
    await scenario.openFixture(fixtureVemmonAddOrPlace);
    await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
    const deckBefore = (await scenario.snapshot()).players[0]!.deckCount;
    await scenario.play("Vemmon", "Digimon");

    const offered: string[][] = [];
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        s.players[0]!.battleArea.some((p) => p.topCard.instanceId === BT18_VEMMON && p.stack.length === 1),
      async (decision) => {
        if (decision.kind !== "selectCards" || decision.sourceCardId !== "BT18-060") return {};
        offered.push([...decision.options.candidateInstanceIds!]);
        return { instanceId: offered.length === 1 ? SNATCHMON : BT11_VEMMON };
      },
    );

    expect(offered).toEqual([REVEALED, [BT11_VEMMON]]);
    const human = (await scenario.snapshot()).players[0]!;
    const handIds = human.hand.map((card) => card.instanceId);
    expect(handIds).toContain(SNATCHMON);
    expect(handIds).not.toContain(BT11_VEMMON);
    const host = human.battleArea.find((p) => p.topCard.instanceId === BT18_VEMMON)!;
    expect(host.stack.map((card) => card.instanceId)).toEqual([BT11_VEMMON]);
    expect(human.deckCount).toBe(deckBefore - 2);
    await scenario.healthy();
  });
});

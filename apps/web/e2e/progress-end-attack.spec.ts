import fixtureProgressEndAttack from "../../api/src/engine/scenarios/progress-end-attack.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const MEDUSAMON = fixturePermanentId("opponent-medusamon");
const SLEEP = fixturePermanentId("own-sleep");
const COST_IDS = [fixtureInstanceId("cost-a-card"), fixtureInstanceId("cost-b-card")];

test.use({
  holdBotAfterTurn: 3,
  botMainIntents: [
    [{ type: "attack", attackerPermanentId: MEDUSAMON, target: { kind: "player" } }, { type: "endPhase" }],
    { scope: "test" },
  ],
});

for (const accept of [true, false]) {
  test(`${accept ? "paying" : "refusing"} Belphemon's cost ${accept ? "ends" : "allows"} a Progress attack`, async ({
    scenario,
  }) => {
    await scenario.openFixture(fixtureProgressEndAttack, "normal", "none");
    // The scripted opponent passes breeding and declares a real public attack.
    await expect
      .poll(async () => (await scenario.presentation()).decisions.some((d) => d.sourceCardId === "BT13-088"), {
        timeout: 40_000,
      })
      .toBe(true);
    const before = await scenario.snapshot();
    const attacker = before.players[1]!.battleArea.find((p) => p.permanentId === MEDUSAMON)!;
    expect(attacker.keywords).toContain("Progress");
    expect(before.players[0]!.hand.map((c) => c.instanceId)).toEqual(expect.arrayContaining(COST_IDS));
    let decisions = 0;
    await scenario.resolveUntil(
      (s) => s.turnSeat === 0 && s.phase === "Breeding" && !s.pendingDecision && !s.combatWindow,
      (decision) => {
        expect(decision.sourceCardId).toBe("BT13-088");
        expect(decision.kind).toBe("selectCards");
        expect(decision.options.min).toBe(0);
        expect(decision.options.max).toBe(2);
        expect(decision.options.candidateInstanceIds).toEqual(expect.arrayContaining(COST_IDS));
        decisions++;
        return accept ? { instanceIds: COST_IDS } : { accept: false };
      },
    );
    const final = await scenario.snapshot();
    expect(decisions).toBe(1);
    expect(final.players[0]!.securityCount).toBe(before.players[0]!.securityCount - Number(!accept));
    expect(final.players[1]!.securityCount).toBe(before.players[1]!.securityCount);
    expect(final.players[1]!.battleArea.find((p) => p.permanentId === MEDUSAMON)!.topCard.instanceId).toBe(
      attacker.topCard.instanceId,
    );
    expect(final.players[1]!.battleArea.find((p) => p.permanentId === MEDUSAMON)!.isSuspended).toBe(true);
    expect(final.players[0]!.battleArea.find((p) => p.permanentId === SLEEP)!.topCard.cardId).toBe("BT13-088");
    for (const id of COST_IDS) {
      expect(final.players[0]!.trash.some((c) => c.instanceId === id)).toBe(accept);
      expect(final.players[0]!.hand.some((c) => c.instanceId === id)).toBe(!accept);
    }
    expect(final.memory).toBe(3);
    expect(final.turnCount).toBe(before.turnCount + 1);
    const events = (await scenario.presentation()).events;
    expect(events.filter((e) => e.kind === "attackDeclared")).toHaveLength(1);
    expect(events.filter((e) => e.kind === "attackEnded")).toHaveLength(1);
    expect(events.filter((e) => e.kind === "securityChecked")).toHaveLength(Number(!accept));
    await scenario.healthy();
  });
}

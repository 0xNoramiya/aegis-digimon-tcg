import fixtureGrowlmonDeletion from "../../api/src/engine/scenarios/growlmon-deletion.fixture";
import { fixturePermanentId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

for (const accept of [true, false]) {
  test(`Growlmon X recovery after security deletion (accept=${accept})`, async ({ scenario }) => {
    await scenario.openFixture(fixtureGrowlmonDeletion);
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    await scenario.evolve("Growlmon (X Antibody)", fixturePermanentId("own-growlmon"));
    await scenario.resolveUntil(
      (s) => s.players[0]!.battleArea[0]?.topCard.cardId === "EX8-012" && !s.pendingDecision,
      (d) => (d.kind === "selectCards" ? { cardId: "BT1-010" } : {}),
    );
    await scenario.attack(fixturePermanentId("own-growlmon"));
    await scenario.resolveUntil(
      (s) => !s.combatWindow && !s.pendingDecision && s.players[0]!.trash.some((c) => c.cardId === "EX8-012"),
      // This On Deletion question follows both the security reveal and deletion
      // burst. Its aggregate receipt-to-visible time is longer than either scene.
      (d) =>
        d.sourceCardId === "EX8-012" ? { accept, cardId: "EX8-009", decisionBudgetMs: 8_000 } : { accept: false },
    );
    const final = await scenario.snapshot();
    expect(final.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX8-009")).toBe(accept);
    expect(final.players[0]!.trash.some((c) => c.cardId === "EX8-009")).toBe(!accept);
    expect(final.players[1]!.securityCount).toBe(2);
    expect((await scenario.presentation()).events.filter((e) => e.kind === "attackEnded")).toHaveLength(1);
    await scenario.healthy();
  });
}

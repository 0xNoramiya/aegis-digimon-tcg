import fixtureJesmonGxCopiedText from "../../api/src/engine/scenarios/jesmon-gx-copied-text.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const BASE = fixturePermanentId("own-gx-base");
const WHITE_TARGET = fixturePermanentId("own-white");

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
]) {
  for (const accept of [true, false]) {
    test(`GX shows copied clauses when ${accept ? "playing" : "refusing"} the token at ${viewport.width}px`, async ({
      scenario,
    }) => {
      await scenario.page.setViewportSize(viewport);
      await scenario.openFixture(fixtureJesmonGxCopiedText);
      await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
      const before = await scenario.snapshot();
      const originalSource = before.players[0]!.battleArea.find((p) => p.permanentId === BASE)!.topCard.instanceId;
      const whiteTarget = before.players[0]!.battleArea.find((p) => p.permanentId === WHITE_TARGET)!.topCard.instanceId;
      const clause = scenario.page.locator(
        "[data-prompt-surface] .board-prompt__clause:visible, [data-prompt-surface] .decision-overlay__effect-text:visible",
      );
      await scenario.evolve("Jesmon GX", BASE);
      const route = scenario.page.locator(".evo-cost-prompt__option[data-recommended]");
      await expect
        .poll(
          async () =>
            (await route.isVisible()) ||
            (await scenario.snapshot()).players[0]!.battleArea.some(
              (p) => p.topCard.instanceId === fixtureInstanceId("gx-card"),
            ),
        )
        .toBe(true);
      if (await route.isVisible()) await route.click();
      let copiedPrompts = 0;
      await scenario.resolveUntil(
        (s) =>
          !s.pendingDecision &&
          !s.combatWindow &&
          copiedPrompts === 2 &&
          s.players[0]!.battleArea.some((p) => p.stack.some((c) => c.instanceId === fixtureInstanceId("donor-card"))),
        async (decision) => {
          if (decision.options.effectTextCardId === "EX13-061") {
            expect(decision.sourceCardId).toBe("BT10-112");
            expect(decision.sourceInstanceId).toBe(fixtureInstanceId("gx-card"));
            expect(decision.sourcePermanentId).toBe(BASE);
            await expect(clause).not.toContainText("You may place 1 card with [Royal Knight]");
            copiedPrompts++;
            if (decision.kind === "optional") {
              await expect(clause).toContainText("You may play 1 [Hinukamuy] Token");
              return { accept };
            }
            expect(decision.kind).toBe("chooseTargets");
            await expect(clause).toContainText("their Digimon effects don't affect 1 of your white Digimon");
            expect(decision.options.candidateInstanceIds).toContain(WHITE_TARGET);
            expect(decision.options.candidateInstanceIds).not.toContain(BASE);
            return { instanceId: WHITE_TARGET };
          }
          if (decision.options.candidateInstanceIds?.includes(fixtureInstanceId("donor-card"))) {
            await expect(clause).toContainText("You may place 1 card with [Royal Knight]");
            return { instanceId: fixtureInstanceId("donor-card") };
          }
          return { accept: !/attack/i.test(decision.promptText) };
        },
      );
      const final = await scenario.snapshot();
      const gx = final.players[0]!.battleArea.find((p) => p.permanentId === BASE)!;
      expect(copiedPrompts).toBe(2);
      expect(gx.topCard.instanceId).toBe(fixtureInstanceId("gx-card"));
      expect(gx.stack.map((c) => c.instanceId)).toEqual([fixtureInstanceId("donor-card"), originalSource]);
      expect(final.players[0]!.battleArea.find((p) => p.permanentId === WHITE_TARGET)!.topCard.instanceId).toBe(
        whiteTarget,
      );
      expect(final.players[0]!.battleArea.filter((p) => p.topCard.cardId === "TOKEN-Hinukamuy-Token")).toHaveLength(
        Number(accept),
      );
      expect(final.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 1);
      expect(final.players[0]!.hand).toHaveLength(before.players[0]!.hand.length - 1);
      expect(final.players[0]!.trash.map((c) => c.instanceId)).toEqual(
        before.players[0]!.trash.map((c) => c.instanceId),
      );
      expect(final.players[1]!.securityCount).toBe(before.players[1]!.securityCount);
      expect(final.memory).toBe(before.memory - 5);
      expect(final.turnSeat).toBe(0);
      await scenario.healthy();
    });
  }
}

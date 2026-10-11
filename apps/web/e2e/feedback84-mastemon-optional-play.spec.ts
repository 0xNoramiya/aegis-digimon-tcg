import { test, expect } from "./scenario-page";

const HOST = "dev-perm-0-feedback84-host";
const YELLOW = "dev-feedback84-yellow";
const PURPLE = "dev-feedback84-purple";
const PLAY_CLAUSE =
  "By trashing your top security card, you may play 1 purple or yellow Digimon card with 6000 DP or less from your hand or trash without paying the cost.";

for (const timing of ["digivolve", "attack"] as const) {
  for (const payload of ["decline", "no selection", "hand", "trash"] as const) {
    test(`Feedback #84: ${timing} pays security then chooses ${payload} in the real GameScreen`, async ({
      scenario,
    }) => {
      await scenario.open(`arena-feedback84-mastemon-${timing}`);
      await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
      const before = await scenario.snapshot();
      let costId: string | undefined;
      let costChoices = 0;
      let payloadChoices = 0;
      let cardChoices = 0;
      if (timing === "digivolve") await scenario.evolve("Mastemon", HOST);
      else await scenario.attack(HOST);
      await scenario.resolveUntil(
        (s) =>
          payloadChoices === 1 &&
          (payload === "decline" || cardChoices === 1) &&
          !s.pendingDecision &&
          !s.combatWindow &&
          s.phase === "Main" &&
          s.players[0]!.battleArea.find((p) => p.permanentId === HOST)?.topCard.cardId === "P-187",
        async (decision) => {
          if (decision.sourceCardId !== "P-187") return { accept: false };
          if (decision.kind === "optional") {
            expect(decision.options.effectTextPart).toBe(PLAY_CLAUSE);
            await expect(scenario.page.getByRole("dialog").getByText(PLAY_CLAUSE, { exact: true })).toBeVisible({
              timeout: 6_000,
            });
          }
          if (decision.kind === "optional" && /Pay cost/i.test(decision.promptText)) {
            costChoices += 1;
            const state = await scenario.snapshot();
            costId = state.players[0]!.security[0]!.instanceId;
            return { accept: true };
          }
          if (decision.kind === "optional") {
            payloadChoices += 1;
            const state = await scenario.snapshot();
            expect(state.players[0]!.trash.map((c) => c.instanceId)).toContain(costId);
            expect(decision.promptText).toMatch(/play/i);
            return { accept: payload !== "decline" };
          }
          if (decision.kind === "selectCards") {
            cardChoices += 1;
            expect(decision.options).toMatchObject({ min: 0, max: 1 });
            expect(decision.options.candidateInstanceIds).toEqual(expect.arrayContaining([YELLOW, PURPLE]));
            expect(decision.options.candidateInstanceIds).toHaveLength(2);
            return payload === "no selection"
              ? { accept: false }
              : { instanceId: payload === "hand" ? YELLOW : PURPLE };
          }
          return {};
        },
      );
      const after = await scenario.snapshot();
      expect(costChoices).toBe(1);
      expect(payloadChoices).toBe(1);
      expect(cardChoices).toBe(payload === "decline" ? 0 : 1);
      expect(after.memory).toBe(timing === "digivolve" ? 5 : 10);
      expect(after.players[0]!.security).toHaveLength(timing === "digivolve" ? 3 : 2);
      expect(after.players[0]!.trash.map((c) => c.instanceId)).toContain(costId);
      const played = payload === "hand" ? YELLOW : payload === "trash" ? PURPLE : undefined;
      expect(after.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual(
        played
          ? [after.players[0]!.battleArea[0]!.topCard.instanceId, played]
          : [after.players[0]!.battleArea[0]!.topCard.instanceId],
      );
      expect(after.players[0]!.hand.some((c) => c.instanceId === YELLOW)).toBe(payload !== "hand");
      expect(after.players[0]!.trash.some((c) => c.instanceId === PURPLE)).toBe(payload !== "trash");
      expect(after.players[1]!.securityCount).toBe(before.players[1]!.securityCount - (timing === "attack" ? 1 : 0));
      if (timing === "digivolve") {
        await scenario.attack(HOST);
        await scenario.resolveUntil(
          (s) =>
            !s.pendingDecision &&
            !s.combatWindow &&
            s.players[1]!.securityCount === before.players[1]!.securityCount - 1,
        );
        expect((await scenario.snapshot()).players[0]!.security).toHaveLength(3);
      }
      await scenario.healthy();
    });
  }
}

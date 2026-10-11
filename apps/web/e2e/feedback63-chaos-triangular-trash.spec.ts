import { test, expect } from "./scenario-page";

const BASE = "dev-perm-0-feedback63-base";
const GUNDRA = "dev-perm-1-feedback63-gundra";

for (const accept of [true, false]) {
  test.describe(`Feedback #63: Gundramon prevention accept=${accept}`, () => {
    test.use({ holdBotAfterTurn: 1, botOptionalScript: { sourceCardId: "EX7-048", answers: [accept] } });

    test("Chaos Triangular's exact source and DP follow the completed replacement", async ({ scenario }) => {
      await scenario.open("arena-feedback63-chaos-triangular-trash");
      await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
      const before = await scenario.snapshot();
      const initialGundra = before.players[1]!.battleArea.find((permanent) => permanent.permanentId === GUNDRA)!;
      expect(initialGundra.currentDP).toBe(12000);
      expect(initialGundra.stack.map((card) => card.instanceId)).toContain("feedback63-chaos");
      await scenario.evolve("Kentaurosmon", BASE);
      await scenario.resolveUntil(
        (state) =>
          !state.pendingDecision &&
          state.players[0]!.security.some((card) => card.instanceId === "feedback63-kentauros") &&
          (accept
            ? state.players[1]!.battleArea.some(
                (permanent) => permanent.permanentId === GUNDRA && permanent.currentDP === 8000,
              )
            : !state.players[1]!.battleArea.some((permanent) => permanent.permanentId === GUNDRA)),
        (decision) => {
          const candidates = decision.options.candidateInstanceIds ?? [];
          const instanceId = ["opponent", GUNDRA, BASE].find((id) => candidates.includes(id));
          return { accept: true, instanceId };
        },
      );
      const after = await scenario.snapshot();
      expect(after.memory).toBe(3);
      expect(after.phase).toBe("Main");
      expect(after.turnSeat).toBe(0);
      expect(after.players[0]!.deckCount).toBe(before.players[0]!.deckCount - 1);
      expect(after.players[0]!.hand.some((card) => card.instanceId === "feedback63-kentauros")).toBe(false);
      expect(after.players[0]!.security.map((card) => card.instanceId)).toEqual([
        "feedback63-kentauros",
        "feedback63-own-security",
      ]);
      const promoted = after.players[0]!.battleArea.find((permanent) => permanent.permanentId === BASE)!;
      expect(promoted.topCard.instanceId).toBe("dev-field-0-feedback63-base");
      expect(promoted.topCard.cardId).toBe("EX13-032");
      const events = (await scenario.presentation()).events;
      const chaosTriggers = events
        .filter((event) => event.kind === "effectTriggered")
        .filter((event) => event.sourceCardId === "EX7-066");
      expect(chaosTriggers).toHaveLength(Number(accept));
      if (accept) {
        const survivor = after.players[1]!.battleArea.find((permanent) => permanent.permanentId === GUNDRA)!;
        expect(survivor.topCard.instanceId).toBe(initialGundra.topCard.instanceId);
        expect(survivor.stack.map((card) => card.instanceId)).toEqual(
          initialGundra.stack.filter((card) => card.instanceId !== "feedback63-chaos").map((card) => card.instanceId),
        );
        expect(after.players[1]!.trash.map((card) => card.instanceId)).toEqual([
          "feedback63-opponent-security",
          "feedback63-chaos",
        ]);
        expect(after.players[1]!.securityCount).toBe(0);
        expect(chaosTriggers[0]!.sourceInstanceId).toBe("feedback63-chaos");
        const placementResolved = events.findIndex(
          (event) =>
            event.kind === "effectResolved" &&
            event.sourceCardId === "EX13-036" &&
            /place-one-each-as-security/.test(event.effectKey ?? ""),
        );
        const chaosTriggered = events.findIndex(
          (event) => event.kind === "effectTriggered" && event.sourceCardId === "EX7-066",
        );
        const chaosResolved = events.findIndex(
          (event) => event.kind === "effectResolved" && event.sourceCardId === "EX7-066",
        );
        expect(placementResolved).toBeGreaterThanOrEqual(0);
        expect(chaosTriggered).toBeGreaterThan(placementResolved);
        expect(chaosResolved).toBeGreaterThan(chaosTriggered);
      } else {
        expect(after.players[1]!.securityCount).toBe(1);
        expect(after.players[1]!.trash.map((card) => card.instanceId)).toEqual(
          expect.arrayContaining([
            "feedback63-opponent-security",
            ...initialGundra.stack.map((card) => card.instanceId),
          ]),
        );
        expect(after.players[1]!.trash.some((card) => card.instanceId === initialGundra.topCard.instanceId)).toBe(
          false,
        );
      }
      await scenario.healthy();
    });
  });
}

import fixture from "../../api/src/engine/scenarios/mystimon-security-trash-attack-stays-optional.fixture";
import { test, expect } from "./scenario-page";

const PLACE_CLAUSE =
  "[On Play] [When Digivolving] You may place 1 [Witchelny] text card from your hand as the bottom security card.";
const TRASH_COST = "by trashing your top security card";
const ATTACK_CLAUSE = "Then, by trashing your top security card, 1 of your Digimon may attack.";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test.describe(`Mistymon security-trash attack at ${viewport.width}px`, () => {
    test.use({ viewport });

    test("the player trashes the top security card and then declines the attack", async ({ scenario }) => {
      const refs = await scenario.openFixture(fixture, "normal", "none");
      const topSecurity = refs.instanceId("topSecurity");
      const opponentRookie = refs.permanentId("opponentRookie");
      await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
      await scenario.play("Mistymon", "Digimon");

      const answered: string[] = [];
      await scenario.resolveUntil(
        (state) =>
          !state.pendingDecision &&
          !state.combatWindow &&
          state.players[0]!.securityCount === 2 &&
          !state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentRookie),
        (decision) => {
          if (decision.kind !== "optional") return {};
          const emphasis = decision.options.effectTextEmphasis ?? "";
          answered.push(emphasis);
          return { accept: emphasis === TRASH_COST };
        },
      );

      expect(answered).toEqual([PLACE_CLAUSE, TRASH_COST, ATTACK_CLAUSE]);
      const final = await scenario.snapshot();
      expect(final.players[0]!.trash.map((card) => card.instanceId)).toContain(topSecurity);
      expect(final.players[1]!.securityCount).toBe(3);
      const { events } = await scenario.presentation();
      expect(events.some((event) => event.kind === "attackDeclared")).toBe(false);
      await scenario.healthy();
    });
  });
}

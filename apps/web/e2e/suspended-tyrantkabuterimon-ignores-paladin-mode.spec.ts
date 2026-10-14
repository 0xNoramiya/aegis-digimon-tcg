import fixture from "../../api/src/engine/scenarios/suspended-tyrantkabuterimon-ignores-paladin-mode.fixture";
import { test, expect } from "./scenario-page";

const SUSPEND_CLAUSE =
  "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may suspend 1 of your opponent's Digimon.";
const BATTLE_CLAUSE =
  "Then, you may return all digivolution cards of 1 of their Digimon to the bottom of the deck and have this Digimon battle it. Compare the number of digivolution cards instead of DP in this battle.";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test.describe(`Suspended TyrantKabuterimon against Paladin Mode at ${viewport.width}px`, () => {
    test.use({ viewport });

    test("the suspended TyrantKabuterimon keeps its sources and wins the battle", async ({ scenario }) => {
      const refs = await scenario.openFixture(fixture, "normal", "none");
      const paladinMode = refs.permanentId("paladinMode");
      const tyrant = refs.permanentId("tyrantKabuterimon");
      const tyrantSources = ["tyrantSourceBottom", "tyrantSourceMiddle", "tyrantSourceTop"].map((alias) =>
        refs.instanceId(alias),
      );
      await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
      await scenario.attack(paladinMode);

      const answered: string[] = [];
      await scenario.resolveUntil(
        (state) =>
          !state.pendingDecision &&
          !state.combatWindow &&
          !state.players[0]!.battleArea.some((permanent) => permanent.permanentId === paladinMode),
        (decision) => {
          const emphasis = decision.options.effectTextEmphasis ?? "";
          answered.push(`${decision.kind}: ${emphasis}`);
          if (decision.kind === "chooseTargets") return { instanceId: tyrant };
          return { accept: true };
        },
      );

      expect(answered).toEqual([
        `chooseTargets: ${SUSPEND_CLAUSE}`,
        `optional: ${BATTLE_CLAUSE}`,
        `chooseTargets: ${BATTLE_CLAUSE}`,
      ]);
      const final = await scenario.snapshot();
      const tyrantPermanent = final.players[1]!.battleArea.find((permanent) => permanent.permanentId === tyrant);
      expect(tyrantPermanent?.isSuspended).toBe(true);
      expect(tyrantPermanent?.stack.map((card) => card.instanceId)).toEqual(tyrantSources);
      await scenario.healthy();
    });
  });
}

import fixtureIgnitemonByCostOptional from "../../api/src/engine/scenarios/ignitemon-by-cost-optional.fixture";
import { fixturePermanentId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const SCENARIO = fixtureIgnitemonByCostOptional;
const IGNITEMON = fixturePermanentId("own-ignitemon");
const MONODRAMON = fixturePermanentId("own-ignitemon-monodramon");
const AGUMON = fixturePermanentId("opponent-ignitemon-agumon");

// Discord 1558408701633757194: Ignitemon (BT11-076) resolved "By deleting 1 of your other Digimon"
// as mandatory and deleted both level 3 Digimon on attack. The By cost is optional (CR 15-7-1).
test.describe("Ignitemon asks before paying its By cost", () => {
  test("declining the cost keeps your Monodramon and the opponent's Agumon", async ({ scenario }) => {
    await scenario.openFixture(SCENARIO);
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    await scenario.attack(IGNITEMON);

    const ignitemonPrompts: string[] = [];
    await scenario.resolveUntil(
      (s) => !s.pendingDecision && !s.combatWindow && s.players[1]!.securityCount === 2,
      (decision) => {
        if (decision.kind === "optional" && decision.sourceCardId === "BT11-076") {
          ignitemonPrompts.push(decision.promptText ?? "");
          return { accept: false };
        }
        return {};
      },
    );

    expect(ignitemonPrompts).toHaveLength(1);
    const final = await scenario.snapshot();
    expect(final.players[0]!.battleArea.some((permanent) => permanent.permanentId === MONODRAMON)).toBe(true);
    expect(final.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([AGUMON]);
    await scenario.healthy();
  });
});

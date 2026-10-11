import fixtureShellmonTargets from "../../api/src/engine/scenarios/shellmon-targets.fixture";
import { fixturePermanentId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const stripped = fixturePermanentId("opponent-stripped");
const restricted = fixturePermanentId("opponent-restricted");
const trashClause =
  "[On Play] [When Digivolving] Trash the bottom 2 digivolution cards of 1 of your opponent's Digimon.";
const restrictClause =
  "Then, 1 of their Digimon with 1 or fewer digivolution cards can't attack or block until their turn ends.";

test("Shellmon asks for the trash and restriction targets separately, each with its own clause", async ({
  scenario,
}) => {
  await scenario.openFixture(fixtureShellmonTargets);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.play("Shellmon", "Digimon");

  const clause = scenario.page.getByTestId("board-prompt").locator(".board-prompt__clause");
  const shownClauses: string[] = [];
  await scenario.resolveUntil(
    (s) => {
      const bot = s.players[1]!.battleArea;
      return (
        !s.pendingDecision &&
        bot.find((p) => p.permanentId === stripped)?.stack.length === 1 &&
        shownClauses.length === 2
      );
    },
    async (decision) => {
      expect(decision.kind).toBe("chooseTargets");
      expect(decision.options.candidateInstanceIds).toEqual([stripped, restricted]);
      const expected = shownClauses.length === 0 ? trashClause : restrictClause;
      await expect(clause).toHaveText(expected);
      shownClauses.push(expected);
      return { instanceId: shownClauses.length === 1 ? stripped : restricted };
    },
  );

  expect(shownClauses).toEqual([trashClause, restrictClause]);
  const state = await scenario.snapshot();
  const bot = state.players[1]!;
  expect(bot.battleArea.find((p) => p.permanentId === stripped)!.stack.map((card) => card.cardId)).toEqual(["BT1-011"]);
  expect(bot.trash.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  await scenario.healthy();
});

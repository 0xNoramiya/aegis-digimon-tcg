import { expect, it } from "vitest";
import { MAX_TOKENS_PER_BATTLE_AREA } from "../effects/verbs/delayed.js";
import { advance } from "../testkit/advance.js";
import { setupEngine } from "../testkit/harness.js";

const tokensOf = (s: ReturnType<typeof setupEngine>, seat: 0 | 1) =>
  s.state.players[seat]!.battleArea.filter((permanent) => permanent.topCard.cardId.includes("TOKEN"));

it("stops playing tokens once a battle area holds the safety cap", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "digimon" }] }, 1: {} });

  for (let played = 0; played < MAX_TOKENS_PER_BATTLE_AREA + 4; played += 2) {
    await advance(s.engine).verb.playTwoTokensInOneWindow(0, "Diaboromon");
  }

  expect(tokensOf(s, 0)).toHaveLength(MAX_TOKENS_PER_BATTLE_AREA);
  expect(s.state.players[0]!.battleArea).toHaveLength(MAX_TOKENS_PER_BATTLE_AREA + 1);
});

it("counts the cap per battle area, so one player's tokens do not block the other's", async () => {
  const s = setupEngine({ 0: {}, 1: {} });

  for (let played = 0; played < MAX_TOKENS_PER_BATTLE_AREA; played += 2) {
    await advance(s.engine).verb.playTwoTokensInOneWindow(0, "Diaboromon");
  }
  await advance(s.engine).verb.playTwoTokensInOneWindow(1, "Diaboromon");

  expect(tokensOf(s, 0)).toHaveLength(MAX_TOKENS_PER_BATTLE_AREA);
  expect(tokensOf(s, 1)).toHaveLength(2);
});

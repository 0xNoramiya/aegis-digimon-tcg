import { describe, expect, it } from "vitest";
import "../../cards/BT20/BT20-085.js";
import "../../cards/BT20/BT20-047.js";
import "../../cards/ST18/ST18-10.js";
import type { PermanentSpec } from "../testkit/harness.js";
import { advance } from "../testkit/advance.js";
import { setupEngine } from "../testkit/harness.js";

const returnPrompt = "returning this Tamer to the bottom of the deck";

async function endOwnTurn(opponentBattleArea: PermanentSpec[]) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT20-085", as: "shoto" },
          { card: "ST18-10", dp: 7000, as: "vortex" },
        ],
        deck: ["BT20-010", "BT20-010"],
      },
      1: { battleArea: opponentBattleArea, deck: ["BT20-010", "BT20-010"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: [returnPrompt] },
  );
  await s.ready();
  const ownTurn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  advance(s.engine).endMainPhaseIfOpen(0);
  await ownTurn;
  return s;
}

describe("Shoto Kazama end-of-turn suspend cost", () => {
  it("gives the Vortex Warriors Digimon +2000 DP when the opponent has no Digimon to suspend", async () => {
    const s = await endOwnTurn([]);
    expect(s.perm("shoto").isSuspended).toBe(true);
    expect(s.perm("vortex").currentDP).toBe(9000);
  });

  it("gives the Vortex Warriors Digimon +2000 DP when the only opposing Digimon is already suspended", async () => {
    const s = await endOwnTurn([{ card: "BT20-047", as: "opponent", suspended: true }]);
    expect(s.perm("shoto").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("vortex").currentDP).toBe(9000);
  });
});

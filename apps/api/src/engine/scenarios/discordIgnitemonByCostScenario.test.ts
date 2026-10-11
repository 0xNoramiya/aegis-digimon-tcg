import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settleAcrossTimers, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const SCENARIO = "arena-discord-ignitemon-by-cost-optional";
const IGNITEMON_ID = "dev-perm-0-discord-ignitemon";
const MONODRAMON_ID = "dev-perm-0-discord-ignitemon-monodramon";
const AGUMON_ID = "dev-perm-1-discord-ignitemon-agumon";

async function attackWithIgnitemon(accept: boolean) {
  const s = setupEngine({ 0: {}, 1: {} });
  layDevScenario(SCENARIO, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: IGNITEMON_ID,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settleAcrossTimers(() => s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.seat === 0);
  const prompt = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
  expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(MONODRAMON_ID);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: prompt.decisionId,
      response: { kind: "optional", accept },
    }),
  ).toEqual({ ok: true });
  await settleAcrossTimers(() => {
    const pending = s.state.pendingDecision;
    if (pending !== undefined && pending.seat === 0 && pending.kind === "chooseTargets") {
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [MONODRAMON_ID] },
      });
    }
    return !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined;
  });

  const result = {
    prompt,
    ownIds: s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId),
    opponentIds: s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId),
  };
  s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
  await loop;
  return result;
}

// Discord 1558408701633757194: Ignitemon's "By deleting 1 of your other Digimon" cost is optional
// (CR 15-7-1). The attack resolved it as mandatory, deleting your other level 3 Digimon and the
// opponent's level 3 Digimon without a prompt.
describe("Discord 1558408701633757194: Ignitemon asks before paying its By cost", () => {
  it("keeps both level 3 Digimon when the player declines", async () => {
    const { prompt, ownIds, opponentIds } = await attackWithIgnitemon(false);

    expect(prompt.seat).toBe(0);
    expect(ownIds).toContain(MONODRAMON_ID);
    expect(opponentIds).toEqual([AGUMON_ID]);
  });

  it("deletes Monodramon and then Agumon when the player accepts", async () => {
    const { ownIds, opponentIds } = await attackWithIgnitemon(true);

    expect(ownIds).not.toContain(MONODRAMON_ID);
    expect(opponentIds).toEqual([]);
  });
});

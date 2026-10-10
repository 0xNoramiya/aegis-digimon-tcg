import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const stripped = "dev-perm-1-feedback4-stripped";
const restricted = "dev-perm-1-feedback4-restricted";

describe("Feedback report 4 playable Shellmon scenario", () => {
  it("asks for the trash target and the restriction target separately, each with its own clause", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-feedback4-shellmon-targets", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const bot = s.state.players[1]!;
    const permanent = (id: string) => bot.battleArea.find((entry) => entry.permanentId === id)!;
    const answer = (instanceId: string) => {
      const pending = s.state.pendingDecision!;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "chooseTargets", instanceIds: [instanceId] },
        }),
      ).toEqual({ ok: true });
    };
    const ownTargetRequests = () => s.decisions.filter(({ seat, req }) => seat === 0 && req.kind === "chooseTargets");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-feedback4-shellmon" })).toEqual({ ok: true });
    await settle(() => ownTargetRequests().length === 1 && s.state.pendingDecision !== undefined);
    expect(ownTargetRequests()[0]!.req.options).toMatchObject({
      candidateInstanceIds: [stripped, restricted],
      effectTextPart:
        "[On Play] [When Digivolving] Trash the bottom 2 digivolution cards of 1 of your opponent's Digimon.",
    });
    answer(stripped);

    await settle(() => ownTargetRequests().length === 2 && s.state.pendingDecision !== undefined);
    expect(ownTargetRequests()[1]!.req.options).toMatchObject({
      candidateInstanceIds: [stripped, restricted],
      effectTextPart:
        "Then, 1 of their Digimon with 1 or fewer digivolution cards can't attack or block until their turn ends.",
    });
    answer(restricted);
    await settle(
      () => s.state.pendingDecision === undefined && observe(s.engine).isRestricted(permanent(restricted), "block"),
    );

    expect(s.state.memory).toBe(0);
    expect(permanent(stripped).stack.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(bot.trash.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(observe(s.engine).isRestricted(permanent(stripped), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(permanent(stripped), "block")).toBe(false);
    expect(observe(s.engine).isRestricted(permanent(restricted), "attack")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

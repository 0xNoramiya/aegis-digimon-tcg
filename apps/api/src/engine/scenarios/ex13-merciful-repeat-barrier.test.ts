import fixtureEx13MercifulRepeatBarrier from "./ex13-merciful-repeat-barrier.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const OMNIMON = fixturePermanentId("own-merciful-barrier-omnimon");
const DEFENDER = fixturePermanentId("opponent-merciful-barrier-defender");

describe("Merciful Mode repeated Barrier arena", () => {
  it("replays normal combat followed by two immediate battles ()", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        declinePrompts: ["Attack"],
        autoChooseOption: true,
        autoSelectCards: true,
        preferOptionIndex: 0,
      },
    );
    layScenarioFixture(s.state, fixtureEx13MercifulRepeatBarrier, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const turnCount = s.state.turnCount;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: OMNIMON,
        target: { kind: "permanent", permanentId: DEFENDER },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter(({ kind }) => kind === "barrierPrompt").length === 1);
    expect(s.engine.applyIntent(1, { type: "respondBarrier", permanentId: DEFENDER, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: OMNIMON,
        instanceId: fixtureInstanceId("merciful-barrier-hand-card"),
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    for (let count = 2; count <= 3; count++) {
      await settle(() => s.events.filter(({ kind }) => kind === "barrierPrompt").length === count);
      expect(s.engine.applyIntent(1, { type: "respondBarrier", permanentId: DEFENDER, accept: true })).toEqual({
        ok: true,
      });
    }
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX13-077"));
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.turnCount).toBe(turnCount);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(
      s.state.players[1]!.battleArea.find(({ permanentId }) => permanentId === DEFENDER)?.stack.map(
        ({ cardId }) => cardId,
      ),
    ).toEqual(["EX13-030", "BT1-057"]);
    expect(s.events.filter(({ kind }) => kind === "barrierPrompt")).toHaveLength(3);
    expect(s.events.filter(({ kind }) => kind === "effectOptionChosen")).toHaveLength(2);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

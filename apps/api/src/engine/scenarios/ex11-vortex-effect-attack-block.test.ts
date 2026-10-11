import fixtureEx11VortexEffectAttackBlock from "./ex11-vortex-effect-attack-block.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

describe("EX11 Vortexdramon effect-attack block arena scenario", () => {
  it("retriggers on block after declining the forced attack's battle", async () => {
    const declinedPrompts = ["Battle"];
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: declinedPrompts },
    );
    layScenarioFixture(s.state, fixtureEx11VortexEffectAttackBlock, [BLUE_DECK, RED_DECK], true);
    const vortexId = fixturePermanentId("own-vortex");
    const attackerId = fixturePermanentId("opponent-vortex-attacker");
    const vortexTriggers = () =>
      s.events.filter(
        (e) => e.kind === "effectTriggered" && e.sourceCardId === "EX11-074" && e.timing === "whenSuspended",
      );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("vortex-forced-attack-card") }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(
          ({ instanceId }) => instanceId === fixtureInstanceId("vortex-forced-attack-card"),
        ) && s.state.pendingDecision === undefined,
    );
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);

    expect(s.decisions.filter((d) => d.seat === 0 && d.req.promptText === "Battle")).toHaveLength(1);
    expect(vortexTriggers()).toHaveLength(0);
    declinedPrompts.length = 0;
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: vortexId })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const triggersAfterBlock = vortexTriggers().length;
    const attackerDeleted = !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === attackerId);
    const vortexUnsuspended = s.state.players[0]!.battleArea.find((perm) => perm.permanentId === vortexId)?.isSuspended;
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    expect(triggersAfterBlock).toBe(1);
    expect(attackerDeleted).toBe(true);
    expect(vortexUnsuspended).toBe(false);
    assertNoLoudGap(s);
  });
});

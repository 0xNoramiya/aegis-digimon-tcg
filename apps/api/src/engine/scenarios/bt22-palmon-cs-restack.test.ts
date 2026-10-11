import fixtureBt22PalmonCsRestack from "./bt22-palmon-cs-restack.fixture.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("BT22 Palmon [CS] restack arena scenario", () => {
  it("offers the inherited restack only under the [CS] host", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureBt22PalmonCsRestack, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const [nonCsHost, csHost] = s.state.players[0]!.battleArea;
    const nonCsPalmon = nonCsHost!.stack[0]!;
    const csPalmon = csHost!.stack[0]!;
    const view = observe(s.engine);
    expect(view.activatableEffects(nonCsHost!).some((effect) => effect.instanceId === nonCsPalmon.instanceId)).toBe(
      false,
    );
    const effectKey = view
      .activatableEffects(csHost!)
      .find((effect) => effect.instanceId === csPalmon.instanceId)?.effectKey;
    expect(effectKey).toBeDefined();

    const handBefore = s.state.players[0]!.hand.length;
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: csPalmon.instanceId, effectKey: effectKey! }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === memoryBefore + 1 && s.state.pendingDecision === undefined);

    expect(csHost!.topCard?.cardId).toBe("BT22-044");
    expect(csHost!.stack.map((card) => card.cardId)).toEqual(["BT22-031"]);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);
    expect(nonCsHost!.topCard?.cardId).toBe("EX13-077");
    expect(nonCsHost!.stack.map((card) => card.cardId)).toEqual(["BT22-044"]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

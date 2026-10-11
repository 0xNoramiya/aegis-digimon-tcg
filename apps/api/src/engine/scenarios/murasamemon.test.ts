import fixtureBt25MurasamemonSecurityOption from "./bt25-murasamemon-security-option.fixture.js";
import fixtureMurasamemonEPulse from "./murasamemon-e-pulse.fixture.js";
import fixtureMurasamemonSpentCost from "./murasamemon-spent-cost.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../testkit/harness.js";

describe("playable Murasamemon/e-Pulse arenas", () => {
  it("separately reproduces BT25-041 using the Option supplied by its own security payment in a real turn", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
      },
    );
    layScenarioFixture(s.state, fixtureBt25MurasamemonSecurityOption, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: fixturePermanentId("own-bt25-base"),
          instanceId: fixtureInstanceId("bt25-murasamemon-card"),
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT25-041"),
      );
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      const player = s.state.players[0]!;
      expect(player.security).toHaveLength(0);
      expect(player.battleArea.map((p) => p.topCard.instanceId)).toEqual(
        expect.arrayContaining([fixtureInstanceId("bt25-e-pulse-card"), fixtureInstanceId("bt25-liollmon-card")]),
      );
      expect(s.state.memory).toBe(7);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it.each([
    [fixtureMurasamemonEPulse, true],
    [fixtureMurasamemonSpentCost, false],
  ] as const)("%s follows the real turn loop and preserves both printed costs", async (scenario, canUse) => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
      },
    );
    layScenarioFixture(s.state, scenario, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      const player = s.state.players[0]!;
      const tamer = player.battleArea.find((p) => p.permanentId === fixturePermanentId("own-tamer"))!;
      expect(tamer.stack).toHaveLength(canUse ? 2 : 1);
      expect(tamer.stack.every((card) => !card.faceUp)).toBe(true);
      expect(s.state.memory).toBe(10);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: fixturePermanentId("own-base"),
          instanceId: fixtureInstanceId("cougarmon-card"),
        }),
      ).toEqual({ ok: true });
      await settle(() => player.hand.some((card) => card.instanceId === fixtureInstanceId("e-pulse-card")));
      await drainMicrotasks();
      expect(player.security).toHaveLength(1);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: fixturePermanentId("own-base"),
          instanceId: fixtureInstanceId("murasamemon-card"),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "ST23-04"));
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      expect(tamer.stack).toHaveLength(0);
      expect(s.state.memory).toBe(8);
      expect(player.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("e-pulse-card"))).toBe(canUse);
      expect(player.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("liollmon-card"))).toBe(canUse);
      expect(player.hand.some((card) => card.instanceId === fixtureInstanceId("e-pulse-card"))).toBe(!canUse);
      expect(player.trash.some((card) => card.instanceId === fixtureInstanceId("liollmon-card"))).toBe(!canUse);
      expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(2000);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});

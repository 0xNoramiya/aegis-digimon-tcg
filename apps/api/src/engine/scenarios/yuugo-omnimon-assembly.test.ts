import fixtureYuugoOmnimonAssembly from "./yuugo-omnimon-assembly.fixture.js";
import { fixtureVariant, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("playable Yuugo/Omnimon Assembly scenario", () => {
  it("pays four, finishes On Play, then evolves for two and clears the opposing field", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureYuugoOmnimonAssembly, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.memory).toBe(4);
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: fixtureInstanceId("omnimon-card"),
          assembly: {
            materialInstanceIds: [0, 1, 2, 3].map((i) =>
              fixtureVariant(
                {
                  "0": fixtureInstanceId("material-0-card"),
                  "1": fixtureInstanceId("material-1-card"),
                  "2": fixtureInstanceId("material-2-card"),
                  "3": fixtureInstanceId("material-3-card"),
                },
                i,
              ),
            ),
          },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "EX13-016") &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.memory).toBe(0);
      expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-094")).toHaveLength(
        2,
      );
      expect(s.state.players[0]!.deck.slice(-2).map((c) => c.cardId)).toEqual(["BT22-094", "BT22-094"]);
      const omni = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX13-016")!;
      expect(omni.stack).toHaveLength(4);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: omni.permanentId,
          instanceId: fixtureInstanceId("omnimon-x-card"),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
      expect(omni.topCard.cardId).toBe("BT20-102");
      expect(s.events.some((e) => e.kind === "memoryChanged" && e.from === 0 && e.to === -2)).toBe(true);
    } finally {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});

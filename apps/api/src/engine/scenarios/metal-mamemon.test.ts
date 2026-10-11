import fixtureMetalmamemonNoCost from "./metalmamemon-no-cost.fixture.js";
import fixtureMetalmamemonPaid from "./metalmamemon-paid.fixture.js";
import fixtureMetalmamemonStripZero from "./metalmamemon-strip-zero.fixture.js";

import { fixtureVariant, fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("MetalMamemon By/Then clauses resolve in the real turn loop", () => {
  for (const trigger of ["play", "digivolve"] as const) {
    it.each(["no-cost", "paid", "decline", "strip-zero"] as const)(`${trigger}: %s`, async (route) => {
      const s = setupEngine(
        { 0: {}, 1: {} },
        {
          autoSelectCards: true,
          autoAcceptOptional: route !== "decline",
          autoDeclineOptional: route === "decline",
        },
      );
      const scenario = route === "decline" ? "paid" : route;
      layScenarioFixture(
        s.state,
        fixtureVariant(
          {
            "no-cost": fixtureMetalmamemonNoCost,
            paid: fixtureMetalmamemonPaid,
            "strip-zero": fixtureMetalmamemonStripZero,
          },
          scenario,
        ),
        [BLUE_DECK, RED_DECK],
        true,
      );
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        const [human, opponent] = [s.state.players[0]!, s.state.players[1]!];
        const beforeMemory = s.state.memory;
        const beforeDeck = opponent.deck.map(({ instanceId }) => instanceId);
        const stackedId = fixturePermanentId("opponent-stacked");
        const sourceLessId = fixturePermanentId("opponent-source-less");
        const returned = opponent.battleArea.find(
          ({ permanentId }) => permanentId === (scenario === "strip-zero" ? sourceLessId : stackedId),
        )!.topCard.instanceId;
        expect(
          s.engine.applyIntent(
            0,
            trigger === "play"
              ? { type: "playCard", instanceId: fixtureInstanceId("metalmamemon-card") }
              : {
                  type: "digivolve",
                  permanentId: fixturePermanentId("own-base"),
                  instanceId: fixtureInstanceId("metalmamemon-card"),
                },
          ),
        ).toEqual({ ok: true });
        await settle();

        const paid = route === "paid" || route === "strip-zero";
        const metal = human.battleArea.find(({ topCard }) => topCard.cardId === "EX9-018")!;
        expect(metal.stack.map(({ cardId, faceUp }) => ({ cardId, faceUp }))).toEqual([
          ...(paid ? [{ cardId: "BT1-048", faceUp: false }] : []),
          ...(trigger === "digivolve" ? [{ cardId: "BT1-037", faceUp: true }] : []),
        ]);
        expect(human.trash.map(({ cardId }) => cardId)).toEqual(
          route === "no-cost" ? ["ST2-16"] : paid ? [] : ["BT1-048"],
        );
        expect(opponent.trash.map(({ cardId }) => cardId)).toEqual(route === "paid" ? ["BT1-010"] : []);
        expect(opponent.deck.map(({ instanceId }) => instanceId)).toEqual([...beforeDeck, ...(paid ? [returned] : [])]);
        expect(opponent.battleArea.some(({ permanentId }) => permanentId === stackedId)).toBe(
          route === "no-cost" || route === "decline",
        );
        expect(opponent.battleArea.some(({ permanentId }) => permanentId === sourceLessId)).toBe(
          route !== "strip-zero",
        );
        expect(opponent.battleArea.some(({ topCard }) => topCard.cardId === "BT3-093")).toBe(true);
        expect(
          opponent.battleArea.find(({ permanentId }) => permanentId === stackedId)?.stack.map(({ cardId }) => cardId),
        ).toEqual(route === "no-cost" || route === "decline" ? ["BT1-010"] : undefined);
        expect(s.state.memory).toBe(beforeMemory - (trigger === "play" ? 7 : 4));
        expect(s.state.pendingDecision).toBeUndefined();
        expect(s.state.phase).toBe(Phase.Main);
        expect(s.state.turnSeat).toBe(0);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    });
  }
});

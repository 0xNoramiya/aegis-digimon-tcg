import fixtureBt22VademonReturnTamer from "./bt22-vademon-return-tamer.fixture.js";
import fixtureBt22VademonReturnAce from "./bt22-vademon-return-ace.fixture.js";
import fixtureBt22ShinmonzaemonOwnSecurity from "./bt22-shinmonzaemon-own-security.fixture.js";
import fixtureBt22ShinmonzaemonOpponentSecurity from "./bt22-shinmonzaemon-opponent-security.fixture.js";

import { fixtureVariant, fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("BT22 DM arena turn loop", () => {
  for (const target of ["tamer", "ace"] as const) {
    it(`Vademon returns the opponent's ${target} with the correct Overflow owner`, async () => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
      layScenarioFixture(
        s.state,
        fixtureVariant({ tamer: fixtureBt22VademonReturnTamer, ace: fixtureBt22VademonReturnAce }, target),
        [BLUE_DECK, RED_DECK],
        true,
      );
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.memory).toBe(3);
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: fixturePermanentId("own-dm-vademon"),
            target:
              target === "tamer"
                ? { kind: "player" }
                : { kind: "permanent", permanentId: fixturePermanentId("opponent-dm-target") },
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[1]!.hand.some(
              (card) => card.instanceId === fixtureInstanceId("opponent-card-dm-target-card"),
            ) &&
            s.state.pendingDecision === undefined &&
            !observe(s.engine).isAttacking(),
        );
        expect(s.state.players[0]!.trash.some((card) => card.instanceId === fixtureInstanceId("dm-payment-card"))).toBe(
          true,
        );
        expect(
          s.state.players[0]!.hand.some(
            (card) => card.instanceId === fixtureInstanceId("opponent-card-dm-target-card"),
          ),
        ).toBe(false);
        expect(s.state.memory).toBe(target === "ace" ? 6 : 3);
        expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "overflow")).toHaveLength(
          target === "ace" ? 1 : 0,
        );
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    });
  }

  for (const target of ["own", "opponent"] as const) {
    it(`ShinMonzaemon places the ${target} Digimon in its owner's security`, async () => {
      const preferInstanceIds: string[] = [];
      const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds });
      layScenarioFixture(
        s.state,
        fixtureVariant(
          { own: fixtureBt22ShinmonzaemonOwnSecurity, opponent: fixtureBt22ShinmonzaemonOpponentSecurity },
          target,
        ),
        [BLUE_DECK, RED_DECK],
        true,
      );
      const owner = target === "own" ? 0 : 1;
      const other = owner === 0 ? 1 : 0;
      const targetId = fixtureVariant(
        { "1": fixtureInstanceId("opponent-card-dm-target-card"), "0": fixtureInstanceId("own-card-dm-target-card") },
        owner,
      );
      preferInstanceIds.push(targetId);
      const otherSecurity = s.state.players[other]!.security.map((card) => card.instanceId);
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: fixturePermanentId("own-dm-monzaemon"),
            instanceId: fixtureInstanceId("dm-shin-card"),
          }),
        ).toEqual({ ok: true });
        await settle(
          () => s.state.players[owner]!.security[0]?.instanceId === targetId && s.state.pendingDecision === undefined,
        );
        expect(s.state.players[owner]!.security[0]?.faceUp).toBe(false);
        expect(s.state.players[owner]!.security).toHaveLength(6);
        expect(s.state.players[other]!.security.map((card) => card.instanceId)).toEqual(otherSecurity);
        expect(
          s.state.players[owner]!.trash.some(
            (card) =>
              card.instanceId ===
              fixtureVariant(
                {
                  "0": fixtureInstanceId("own-source-dm-target-0-card"),
                  "1": fixtureInstanceId("opponent-source-dm-target-0-card"),
                },
                owner,
              ),
          ),
        ).toBe(true);
        expect(s.state.players[0]!.trash.some((card) => card.instanceId === fixtureInstanceId("dm-payment-card"))).toBe(
          true,
        );
        expect(s.state.memory).toBe(5);
        expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "overflow")).toHaveLength(
          0,
        );
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    });
  }
});

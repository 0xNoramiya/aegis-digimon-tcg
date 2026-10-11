import fixtureBt26MonimonOptionalCost from "./bt26-monimon-optional-cost.fixture.js";
import { fixtureVariant, fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const ATTACKER = fixturePermanentId("own-monimon-attacker");
const MONIMON = fixtureInstanceId("own-source-monimon-attacker-0-card");
const COST = [
  fixtureInstanceId("own-source-monimon-attacker-1-card"),
  fixtureInstanceId("own-source-monimon-attacker-2-card"),
];

// Production match 8f4d16bd-7a72-4f07-8b6b-618424eba319 at 18:52 UTC:
// DarkKnightmon attacks, dec-53 requires two sources, then dec-54 permits no play.
describe("BT26 Monimon optional cost arena", () => {
  it.each(["decline-cost", "decline-play", "play-tamer"] as const)(
    "%s preserves the correct sources, memory, and once-per-turn use",
    async (path) => {
      const s = setupEngine({ 0: {}, 1: {} });
      layScenarioFixture(s.state, fixtureBt26MonimonOptionalCost, [RED_DECK, BLUE_DECK], true);
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        const attacker = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === ATTACKER)!;
        const initialSources = attacker.stack.map(({ instanceId }) => instanceId);
        const initialHand = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
        const initialMemory = s.state.memory;
        const initialTrash = s.state.players[0]!.trash.length;
        const attack = (slot: string) =>
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: ATTACKER,
            target: {
              kind: "permanent",
              permanentId: fixtureVariant(
                {
                  first: fixturePermanentId("opponent-monimon-target-first"),
                  second: fixturePermanentId("opponent-monimon-target-second"),
                  third: fixturePermanentId("opponent-monimon-target-third"),
                },
                slot,
              ),
            },
          });
        const answerCost = async (accept: boolean) => {
          await settle(
            () => s.decisions.at(-1)?.req.kind === "optional" && s.decisions.at(-1)?.req.sourceCardId === "BT26-006",
          );
          const offer = s.decisions.at(-1)!.req;
          expect(attacker.stack.map(({ instanceId }) => instanceId)).toEqual(initialSources);
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: offer.decisionId,
              response: { kind: "optional", accept },
            }),
          ).toEqual({ ok: true });
        };
        const payAndChoose = async (play: boolean) => {
          await settle(() => s.decisions.at(-1)?.req.kind === "selectCards");
          const costPick = s.decisions.at(-1)!.req;
          expect(costPick.options).toMatchObject({ min: 2, max: 2, purpose: "cost" });
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: costPick.decisionId,
              response: { kind: "selectCards", instanceIds: [COST[0]!] },
            }).ok,
          ).toBe(false);
          expect(attacker.stack.map(({ instanceId }) => instanceId)).toEqual(initialSources);
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: costPick.decisionId,
              response: { kind: "selectCards", instanceIds: COST },
            }),
          ).toEqual({ ok: true });
          await settle(() => s.decisions.at(-1)?.req.decisionId !== costPick.decisionId);
          const playPick = s.decisions.at(-1)!.req;
          expect(playPick.kind).toBe("selectCards");
          expect(playPick.options).toMatchObject({ min: 0, max: 1 });
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: playPick.decisionId,
              response: { kind: "selectCards", instanceIds: play ? [fixtureInstanceId("monimon-yuu-card")] : [] },
            }),
          ).toEqual({ ok: true });
        };
        const attackFinished = (slot: string) =>
          settle(
            () =>
              !s.state.players[1]!.battleArea.some(
                ({ permanentId }) =>
                  permanentId ===
                  fixtureVariant(
                    {
                      first: fixturePermanentId("opponent-monimon-target-first"),
                      second: fixturePermanentId("opponent-monimon-target-second"),
                      third: fixturePermanentId("opponent-monimon-target-third"),
                    },
                    slot,
                  ),
              ) && s.state.pendingDecision === undefined,
          );

        expect(attack("first")).toEqual({ ok: true });
        await answerCost(path !== "decline-cost");
        if (path !== "decline-cost") await payAndChoose(path === "play-tamer");
        await attackFinished("first");
        expect(attacker.stack.map(({ instanceId }) => instanceId)).toEqual(
          path === "decline-cost" ? initialSources : [MONIMON],
        );
        expect(s.state.players[0]!.trash).toHaveLength(initialTrash + (path === "decline-cost" ? 0 : 2));
        expect(s.state.memory).toBe(initialMemory - (path === "play-tamer" ? 1 : 0));
        expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
          path === "play-tamer"
            ? initialHand.filter((id) => id !== fixtureInstanceId("monimon-yuu-card"))
            : initialHand,
        );
        expect(
          s.state.players[0]!.battleArea.some(
            ({ topCard }) => topCard.instanceId === fixtureInstanceId("monimon-yuu-card"),
          ),
        ).toBe(path === "play-tamer");

        // Arrange another legal attack to isolate the inherited once-per-turn receipt.
        attacker.isSuspended = false;
        if (path !== "decline-cost") {
          // Keep two payable sources elsewhere so a missing receipt would offer the cost again.
          s.putOnBoard(0, { card: "BT10-073", as: "spare-host", under: ["BT1-009", "BT1-010"] });
          await s.ready();
        }
        const decisionsBefore = s.decisions.length;
        expect(attack("second")).toEqual({ ok: true });
        if (path === "decline-cost") {
          await settle(() => s.decisions.length > decisionsBefore);
          await answerCost(true);
          await payAndChoose(false);
        }
        await attackFinished("second");
        expect(attacker.stack.map(({ instanceId }) => instanceId)).toEqual([MONIMON]);
        expect(s.state.players[0]!.trash).toHaveLength(initialTrash + 2);
        const spareHost = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT10-073");
        expect(spareHost?.stack.length).toBe(path === "decline-cost" ? undefined : 2);
        expect(s.decisions.slice(decisionsBefore).some(({ req }) => req.sourceCardId === "BT26-006")).toBe(
          path === "decline-cost",
        );
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );
});

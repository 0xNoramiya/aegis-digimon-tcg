import fixtureBt26RavemonRecycledTrigger from "./bt26-ravemon-recycled-trigger.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { CardInstance, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("recycled Ravemon arena scenario", () => {
  it.each([1, 2])("offers each of %i inherited Pinamon cards only once for one deletion", async (count) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoOrderTriggers: false });
    layScenarioFixture(s.state, fixtureBt26RavemonRecycledTrigger, [BLUE_DECK, RED_DECK], true);
    if (count === 2) {
      const secondPinamon = new CardInstance();
      secondPinamon.cardId = "BT26-005";
      secondPinamon.instanceId = "dev-second-pinamon";
      secondPinamon.ownerSeat = 0;
      s.state.players[0]!.battleArea.find(
        (permanent) => permanent.permanentId === fixturePermanentId("own-recycled-first-base"),
      )!.stack.push(secondPinamon);
    }
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: fixturePermanentId("own-recycled-first-base"),
          instanceId: fixtureInstanceId("recycled-ravemon-card"),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const request = s.decisions.at(-1)!.req;
      expect(request.options?.triggerCardIds?.toSorted()).toEqual([
        ...Array<string>(count).fill("BT26-005"),
        "BT26-082",
      ]);
      expect(new Set(request.options?.triggerKeys).size).toBe(count + 1);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
  for (const acceptSecurity of [false, true]) {
    it(`offers both digivolution activations and allows ${acceptSecurity ? "accepting" : "declining"} the new deletion's security placement`, async () => {
      const s = setupEngine(
        { 0: {}, 1: {} },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoChooseOption: false,
          preferTriggerKeys: ["BT26-005", "BT26-076"],
          preferInstanceIds: [fixtureInstanceId("recycled-ravemon-card"), fixtureInstanceId("recycled-falcomon-card")],
          declinePrompts: acceptSecurity ? [] : ["Place 1 card(s) as your security"],
        },
      );
      layScenarioFixture(s.state, fixtureBt26RavemonRecycledTrigger, [BLUE_DECK, RED_DECK], true);
      const human = s.state.players[0]!;
      const securityBefore = human.security.length;
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: fixturePermanentId("own-recycled-first-base"),
            instanceId: fixtureInstanceId("recycled-ravemon-card"),
          }),
        ).toEqual({ ok: true });
        await settle(() => s.state.pendingDecision?.kind === "chooseOption");
        const request = s.decisions.at(-1)!.req;
        expect(request.sourceCardId).toBe("BT26-076");
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: request.decisionId,
            response: { kind: "chooseOption", optionIndex: 1 },
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.events.filter(
              (event) =>
                event.kind === "effectResolved" &&
                event.sourceCardId === "BT26-082" &&
                event.timing === "WhenDigivolving",
            ).length === 2 && s.state.pendingDecision === undefined,
        );
        const evolutions = s.events.filter((event) => event.kind === "digivolved" && event.cardId === "BT26-082");
        expect(evolutions).toHaveLength(2);
        expect(
          s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "BT26-005"),
        ).toHaveLength(1);
        expect(
          s.events.filter(
            (event) =>
              event.kind === "effectTriggered" &&
              event.sourceCardId === "BT26-082" &&
              event.printedTiming === "WhenDigivolving",
          ),
        ).toHaveLength(2);
        // The first deletion's source became a new card when it evolved again. Only the
        // second deletion can activate; the old pending deletion cannot return afterwards.
        expect(
          s.events.filter(
            (event) =>
              event.kind === "effectTriggered" &&
              event.sourceCardId === "BT26-082" &&
              event.printedTiming === "OnDeletion",
          ),
        ).toHaveLength(1);
        expect(
          s.decisions.filter(
            ({ req }) =>
              req.sourceCardId === "BT26-082" && req.kind === "optional" && req.options?.timing === "OnDeletion",
          ),
        ).toHaveLength(1);
        expect(human.battleArea.some(({ topCard }) => topCard.cardId === "BT26-082")).toBe(false);
        expect(human.security).toHaveLength(securityBefore + Number(acceptSecurity));
        expect(human.security.at(-1)?.instanceId === fixtureInstanceId("recycled-ravemon-card")).toBe(acceptSecurity);
        expect(
          human.security.some((card) => card.instanceId === fixtureInstanceId("recycled-ravemon-card") && card.faceUp),
        ).toBe(acceptSecurity);
        expect(human.trash.some(({ instanceId }) => instanceId === fixtureInstanceId("recycled-ravemon-card"))).toBe(
          !acceptSecurity,
        );
        expect(s.state.memory).toBe(2);
        expect(s.state.turnSeat).toBe(0);
        expect(s.state.phase).toBe(Phase.Main);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    });
  }
});

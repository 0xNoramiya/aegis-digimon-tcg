import fixtureJesmonChoice from "./jesmon-choice.fixture.js";
import fixtureJesmonNameRestriction from "./jesmon-name-restriction.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { layScenarioFixture } from "../scenario/fixture.js";
import { RED_DECK, BLUE_DECK } from "../testDecks.js";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const CHOICES = ["Play an Atho, René & Por Token", "Play a Sistermon from hand or trash", "Don't use"];

describe("Jesmon's visible token or Sistermon choice", () => {
  it.each(["digivolve", "attack"] as const)("names the Sistermon alternative when resolving %s", async (timing) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: timing === "attack" ? "BT23-013" : "BT6-015", as: "base" }],
        hand: [
          { card: "BT23-013", as: "jesmon" },
          { card: "BT23-076", as: "sistermon" },
        ],
      },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();
    const intent =
      timing === "attack"
        ? {
            type: "attack" as const,
            attackerPermanentId: s.perm("base").permanentId,
            target: { kind: "player" as const },
          }
        : {
            type: "digivolve" as const,
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("jesmon").instanceId,
            useAlternateCost: true,
          };
    expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options?.choices).toEqual(CHOICES);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseOption", optionIndex: 2 },
      }),
    ).toEqual({ ok: true });
    if (timing === "attack") await advance(s.engine).finishAttack();
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("sistermon").instanceId);
  });
});

describe("playable arena sequences", () => {
  it.each([fixtureJesmonChoice, fixtureJesmonNameRestriction] as const)(
    "plays the legal hand/trash Sistermon in %s with public choices and a real turn loop",
    async (scenarioId) => {
      const restricted = scenarioId.name?.endsWith("restriction");
      const preferred = [
        restricted ? fixtureInstanceId("trash-sistermon-card") : fixtureInstanceId("hand-sistermon-card"),
      ];
      const config = { autoDeclineOptional: false, autoSelectCards: true, preferInstanceIds: preferred };
      const s = setupEngine(config);
      layScenarioFixture(s.state, scenarioId, [RED_DECK, BLUE_DECK], true);
      const loop = s.engine.startTurnLoop();
      const human = s.state.players[0]!;
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        const base = human.battleArea.find((p) => p.topCard.cardId === (restricted ? "BT23-013" : "BT6-015"))!;
        const initialDeck = human.deck.length;
        if (!restricted) {
          expect(
            s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: base.permanentId,
              instanceId: fixtureInstanceId("jesmon-card"),
              useAlternateCost: true,
            }),
          ).toEqual({ ok: true });
          await settle(() => s.state.pendingDecision?.kind === "chooseOption");
          const modal = s.state.pendingDecision!;
          config.autoDeclineOptional = true;
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: modal.decisionId,
              response: { kind: "chooseOption", optionIndex: 1 },
            }),
          ).toEqual({ ok: true });
          await settle(
            () =>
              human.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("hand-sistermon-card")) &&
              !s.state.pendingDecision,
          );
          expect(base.stack.map((c) => c.cardId)).toEqual(["BT6-015"]);
          expect(s.state.memory).toBe(7);
          expect(human.deck.length).toBe(initialDeck - 2); // evolution draw + Blanc's On Play draw
          preferred[0] = fixtureInstanceId("trash-sistermon-card");
        }
        config.autoDeclineOptional = false;
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: base.permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        if (!restricted) {
          await settle(() => s.state.pendingDecision?.kind === "chooseOption");
          const modal = s.state.pendingDecision!;
          config.autoDeclineOptional = true;
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: modal.decisionId,
              response: { kind: "chooseOption", optionIndex: 1 },
            }),
          ).toEqual({ ok: true });
        }
        if (restricted) {
          await settle(() => s.state.pendingDecision?.kind === "optional");
          const decision = s.state.pendingDecision!;
          config.autoDeclineOptional = true;
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: decision.decisionId,
              response: { kind: "optional", accept: true },
            }),
          ).toEqual({ ok: true });
        }
        await settle(() =>
          human.battleArea.some((p) => p.topCard.instanceId === fixtureInstanceId("trash-sistermon-card")),
        );
        await advance(s.engine).finishAttack();
        await settle(() => !s.state.pendingDecision);
        expect(s.state.memory).toBe(restricted ? 10 : 8);
        expect(s.state.turnSeat).toBe(0);
        expect(human.trash).toHaveLength(0);
        expect(human.battleArea.filter((p) => p.topCard.cardId === "TOKEN-AthoRenePor-Token")).toHaveLength(
          restricted ? 1 : 0,
        );
        expect(human.hand.some((c) => c.instanceId === fixtureInstanceId("blocked-ciel-card"))).toBe(restricted);
        const selections = s.decisions.filter(
          ({ req }) => req.sourceCardId === "BT23-013" && req.kind === "selectCards",
        );
        expect(selections.flatMap(({ req }) => req.options?.candidateInstanceIds ?? [])).not.toContain(
          fixtureInstanceId("blocked-ciel-card"),
        );
        expect(s.events.filter((event) => event.kind === "actionRejected")).toHaveLength(0);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );
});

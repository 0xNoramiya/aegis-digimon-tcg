import fixtureBt11RinaUlforceEffectChoice from "./bt11-rina-ulforce-effect-choice.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase, getCardDefinition, printedClausesForTrigger } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const ULFORCE = fixtureInstanceId("own-card-rina-choice-ulforce-card");
const FEWEST = fixtureInstanceId("opponent-card-rina-choice-fewest-card");
const STACKED = fixtureInstanceId("opponent-card-rina-choice-stacked-card");

describe("BT11 Rina / EX13 Ulforce effect choice arena", () => {
  it("displays both printed effects and returns only the fewest-source target", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferTriggerKeys: ["BT11-112"],
        preferOptionIndex: 1,
      },
    );
    layScenarioFixture(s.state, fixtureBt11RinaUlforceEffectChoice, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const ulforce = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === ULFORCE)!;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: ulforce.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.deck.some(({ instanceId }) => instanceId === FEWEST) &&
        s.state.pendingDecision === undefined &&
        s.events.some((event) => event.kind === "securityChecked"),
    );
    const request = s.decisions.find(({ req }) => req.kind === "chooseOption" && req.sourceCardId === "BT11-112")?.req;
    expect(request?.options?.choices).toEqual(
      printedClausesForTrigger({
        definition: getCardDefinition("EX13-023")!,
        trigger: "WhenDigivolving",
        inherited: false,
      }),
    );
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(FEWEST);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([STACKED]);
    expect(s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT11-112")?.isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

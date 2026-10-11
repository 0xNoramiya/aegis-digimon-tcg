import fixtureSagasolEffectAssembly from "./sagasol-effect-assembly.fixture.js";
import fixtureSagasolGuardSource from "./sagasol-guard-source.fixture.js";
import fixtureSagasolEtemonProtectedDp from "./sagasol-etemon-protected-dp.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { describe, expect, it } from "vitest";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { setupEngine } from "../testkit/harness.js";

describe("SagaSol bug arena scenarios", () => {
  it("stages HiAndromon, revealed Megadramon, and its trash Assembly material", () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(s.state, fixtureSagasolEffectAssembly, [BLUE_DECK, RED_DECK], true);

    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX12-058")).toBe(true);
    expect(s.state.players[0]!.deck.slice(0, 2).map(({ cardId }) => cardId)).toEqual(["BT1-012", "EX12-064"]);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX12-054")).toBe(true);
    expect(s.state.memory).toBe(11);
  });

  it("stages Metal Empire's Guard recipients against the bot's Gaia Force", () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(s.state, fixtureSagasolGuardSource, [BLUE_DECK, RED_DECK], true);

    expect(s.state.turnSeat).toBe(1);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX12-064", "EX12-008"]);
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "EX12-072", faceUp: true });
    expect(s.state.players[1]!.hand.some(({ cardId }) => cardId === "ST1-16")).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-085")).toBe(true);
  });

  it("stages EX5 Etemon against a suspended Digimon protected from opposing Digimon effects", () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(s.state, fixtureSagasolEtemonProtectedDp, [BLUE_DECK, RED_DECK], true);

    expect(s.state.turnSeat).toBe(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX5-048")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]).toMatchObject({
      permanentId: fixturePermanentId("opponent-sagasol-protected-dp-target"),
      isSuspended: true,
      currentDP: 5000,
      topCard: { cardId: "BT15-047" },
    });
  });
});

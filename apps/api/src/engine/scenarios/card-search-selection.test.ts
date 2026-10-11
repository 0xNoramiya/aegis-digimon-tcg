import fixtureBt10087Search from "./bt10-087-search.fixture.js";
import fixtureBt12021Search from "./bt12-021-search.fixture.js";
import fixtureBt13048Search from "./bt13-048-search.fixture.js";
import fixtureBt24043Search from "./bt24-043-search.fixture.js";
import fixtureBt24044Search from "./bt24-044-search.fixture.js";
import fixtureBt24058Search from "./bt24-058-search.fixture.js";
import fixtureBt25022Search from "./bt25-022-search.fixture.js";
import fixtureBt3093Search from "./bt3-093-search.fixture.js";
import fixtureEx12073Search from "./ex12-073-search.fixture.js";
import fixtureEx13027Search from "./ex13-027-search.fixture.js";
import fixtureEx2008Search from "./ex2-008-search.fixture.js";
import fixtureEx4038Search from "./ex4-038-search.fixture.js";
import fixtureSt1411Search from "./st14-11-search.fixture.js";
import fixtureSt1804Search from "./st18-04-search.fixture.js";
import fixtureSt2002Search from "./st20-02-search.fixture.js";
import fixtureLm051Search from "./lm-051-search.fixture.js";
import fixtureLm055Search from "./lm-055-search.fixture.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const cases = [
  { id: fixtureBt10087Search, cardId: "BT10-087", expectedHand: ["AD1-006"], revealCount: 4 },
  { id: fixtureBt12021Search, cardId: "BT12-021", expectedHand: ["AD1-011", "BT12-090"], revealCount: 3 },
  { id: fixtureBt13048Search, cardId: "BT13-048", expectedHand: ["AD1-010", "AD1-008"], revealCount: 3 },
  { id: fixtureBt24043Search, cardId: "BT24-043", expectedHand: ["AD1-010", "BT24-009"], revealCount: 3 },
  { id: fixtureBt24044Search, cardId: "BT24-044", expectedHand: ["BT20-085", "BT1-012"], revealCount: 3 },
  { id: fixtureBt24058Search, cardId: "BT24-058", expectedHand: ["AD1-003"], revealCount: 3 },
  {
    id: fixtureBt25022Search,
    cardId: "BT25-022",
    expectedHand: ["BT24-011", "BT24-009"],
    revealCount: 3,
  },
  { id: fixtureBt3093Search, cardId: "BT3-093", expectedHand: ["AD1-006", "AD1-011"], revealCount: 3 },
  { id: fixtureEx12073Search, cardId: "EX12-073", expectedHand: ["BT18-041"], revealCount: 3 },
  { id: fixtureEx13027Search, cardId: "EX13-027", expectedHand: ["BT11-040"], revealCount: 3 },
  { id: fixtureEx2008Search, cardId: "EX2-008", expectedHand: ["AD1-003", "BT12-089"], revealCount: 4 },
  { id: fixtureEx4038Search, cardId: "EX4-038", expectedHand: ["AD1-001", "AD1-010"], revealCount: 3 },
  { id: fixtureSt1411Search, cardId: "ST14-11", expectedHand: ["AD1-002"], revealCount: 4 },
  { id: fixtureSt1804Search, cardId: "ST18-04", expectedHand: ["BT1-012", "BT18-060"], revealCount: 3 },
  { id: fixtureSt2002Search, cardId: "ST20-02", expectedHand: ["AD1-001", "AD1-019"], revealCount: 3 },
  { id: fixtureLm051Search, cardId: "LM-051", expectedHand: ["AD1-001"], revealCount: 3 },
  { id: fixtureLm055Search, cardId: "LM-055", expectedHand: ["AD1-001"], revealCount: 2 },
] as const;

it.each(cases)("$id exposes printed reveal choices and completes in the public turn loop", async (fixture) => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
  layScenarioFixture(s.state, fixture.id, [BLUE_DECK, RED_DECK], true);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const card = s.state.players[0]!.hand.find((c) => c.cardId === fixture.cardId)!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === fixture.cardId) &&
        !s.state.pendingDecision,
    );
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(expect.arrayContaining([...fixture.expectedHand]));
    const selections = s.decisions.filter(
      ({ req }) => req.kind === "selectCards" && req.sourceCardId === fixture.cardId,
    );
    expect(selections.length).toBeGreaterThan(0);
    for (const { req } of selections) {
      expect(req.options?.visibleCards).toHaveLength(fixture.revealCount);
      expect(req.options?.candidateInstanceIds?.length).toBeGreaterThan(0);
    }
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

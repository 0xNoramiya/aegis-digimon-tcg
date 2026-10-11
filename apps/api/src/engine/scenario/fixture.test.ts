import { observe } from "../testkit/observe.js";
import { layLocalScenario } from "./local.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Phase, Zone } from "@aegis/shared";
import { installVisibilityPort, type VisibilityPort } from "../state/access.js";
import { setupEngine } from "../testkit/harness.js";
import { setupScenario } from "../testkit/scenario.js";
import { bindScenarioDecks, layScenarioFixture, scenarioReferences, type ScenarioFixture } from "./fixture.js";
import { clearLocalScenario, configureLocalScenario, hasLocalScenario, isLocalScenarioEntry } from "./local.js";

function fixture(): ScenarioFixture {
  return {
    memory: 4,
    turnSeat: 1,
    turnCount: 3,
    isFirstPlayersFirstTurn: false,
    board: {
      0: {
        hand: [{ card: "BT1-009", as: "fodder" }],
        deck: [{ card: "BT1-010", as: "draw" }],
        security: 2,
        battleArea: [{ card: "BT1-019", as: "established", under: [{ card: "BT1-009", as: "source" }] }],
      },
      1: {
        battleArea: [{ card: "BT1-019", as: "fresh", enteredThisTurn: true }],
        breeding: { card: "BT1-001", as: "egg" },
        deck: ["BT1-010"],
      },
    },
  };
}

afterEach(() => {
  clearLocalScenario();
  vi.unstubAllEnvs();
});

describe("scenario fixtures", () => {
  it.each([4, 0])("uses a staged deck with %i eggs without adding fallback cards", (count) => {
    const value = fixture();
    value.board[0]!.eggDeck = [
      ...Array.from({ length: 5 }, (_, index) => ({
        card: "BT1-001",
        as: `dealt-egg-${index}`,
        fromDeck: { seat: 0 as const, index, egg: true },
      })),
      { card: "BT1-003", as: "explicit-egg" },
    ];
    const decks = [
      { mainDeck: ["BT1-010"], eggDeck: Array<string>(count).fill("BT26-001") },
      { mainDeck: [], eggDeck: [] },
    ] satisfies [import("../setup.js").Decklist, import("../setup.js").Decklist];
    const s = setupScenario(bindScenarioDecks(value, decks));
    expect([...s.state.players[0]!.eggDeck].map((card) => card.cardId)).toEqual([...decks[0].eggDeck, "BT1-003"]);
    expect(value.board[0]!.eggDeck).toHaveLength(6);
    expect(bindScenarioDecks(value)).toBe(value);
  });

  it("rejects a missing dealt permanent before changing the receiving board", () => {
    const s = setupScenario(fixture());
    const before = s.state.toJSON();
    const value = fixture();
    value.board[0]!.battleArea = [
      { card: "BT1-019", as: "missing", top: { card: "BT1-019", fromDeck: { seat: 0, index: 2 } } },
    ];
    expect(() =>
      layScenarioFixture(s.state, value, [
        { mainDeck: [], eggDeck: [] },
        { mainDeck: [], eggDeck: [] },
      ]),
    ).toThrow("Missing staged deck card");
    expect(s.state.toJSON()).toEqual(before);
  });

  it("reuses the board builder with explicit turn-start state and aliases in the testkit", () => {
    const s = setupScenario(fixture());
    expect(s.state.phase).toBe(Phase.None);
    expect(s.state.memory).toBe(4);
    expect(s.state.turnSeat).toBe(1);
    expect(s.state.turnCount).toBe(3);
    expect(s.inst("source").cardId).toBe("BT1-009");
    expect(s.perm("fresh").enterFieldTurnCount).toBe(4);
    expect(s.perm("established").enterFieldTurnCount).not.toBe(4);
  });

  it("restarts with fresh objects and stable references while preserving seated players and visibility", () => {
    const s = setupEngine({ 0: { hand: ["BT1-010"], trash: ["BT1-009"], battleArea: ["BT1-019"] } });
    const player = s.state.players[0]!;
    const notify = vi.fn<VisibilityPort>();
    installVisibilityPort(player, notify);
    const refs = layScenarioFixture(s.state, fixture());
    const firstCard = player.hand[0]!;
    expect(player.trash).toHaveLength(0);
    expect(player.battleArea).toHaveLength(1);
    expect(notify).toHaveBeenCalledWith(0, Zone.Hand, firstCard);
    expect(refs.instanceId("source")).toBe(player.battleArea[0]!.stack[0]!.instanceId);
    expect(refs.instanceId("established")).toBe(player.battleArea[0]!.topCard.instanceId);
    expect(refs.permanentId("established")).toBe(player.battleArea[0]!.permanentId);
    expect(s.state.players[1]!.battleArea[0]!.enterFieldTurnCount).toBe(4);
    const restarted = layScenarioFixture(s.state, fixture());
    expect(s.state.players[0]).toBe(player);
    expect(player.hand[0]).not.toBe(firstCard);
    expect(restarted.instanceId("fodder")).toBe(refs.instanceId("fodder"));
    expect(scenarioReferences(fixture()).instanceId("fodder")).toBe(refs.instanceId("fodder"));
  });

  it("rejects ambiguous aliases across zones and nested stacks before altering a board", () => {
    const bad = fixture();
    bad.board[1]!.battleArea = [{ card: "BT1-019", under: [{ card: "BT1-009", as: "fodder" }] }];
    const s = setupEngine({ 0: { hand: ["BT1-010"] } });
    const before = s.state.toJSON();
    expect(() => layScenarioFixture(s.state, bad)).toThrow(/alias: fodder/);
    expect(s.state.toJSON()).toEqual(before);
  });

  it("rejects unknown cards and invalid globals before registering a local fixture", () => {
    const bad = fixture();
    bad.board[0]!.hand = ["UNKNOWN-CARD"];
    expect(() => configureLocalScenario(bad)).toThrow(/Unknown scenario card/);
    expect(hasLocalScenario()).toBe(false);
    expect(() => scenarioReferences({ ...fixture(), memory: 11 })).toThrow(/memory/);
    expect(() => scenarioReferences({ ...fixture(), turnCount: 4294967295 })).toThrow(/uint32/);
  });

  it("fails loudly when an alias is missing or refers to a loose card instead of a permanent", () => {
    const refs = scenarioReferences(fixture());
    expect(() => refs.instanceId("missing")).toThrow(/Unknown scenario alias/);
    expect(() => refs.permanentId("fodder")).toThrow(/not a permanent/);
  });

  it("loads a server-configured fixture through the generic dev entry without sharing mutable author data", () => {
    expect(isLocalScenarioEntry("local-fixture")).toBe(false);
    const authored = fixture();
    const refs = configureLocalScenario(authored);
    authored.board[0]!.hand = [];
    expect(isLocalScenarioEntry("local-fixture")).toBe(true);
    const s = setupEngine();
    layLocalScenario(s.state);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(refs.instanceId("fodder"));
    clearLocalScenario();
    expect(isLocalScenarioEntry("local-fixture")).toBe(false);
    expect(() => layLocalScenario(s.state)).toThrow(/No local scenario/);
  });

  it("keeps local fixture registration and loading unavailable in production", () => {
    configureLocalScenario(fixture());
    vi.stubEnv("NODE_ENV", "production");
    expect(() => configureLocalScenario(fixture())).toThrow(/production/);
    expect(hasLocalScenario()).toBe(false);
    expect(isLocalScenarioEntry("local-fixture")).toBe(false);
  });
});

it("keeps explicit linked DP and initial effects identical in API and room preparation", () => {
  const board = fixture();
  board.board[0]!.battleArea = [{ card: "BT25-052", as: "host", dp: 6000, currentDP: 6000, linked: ["BT25-036"] }];
  board.effects = [{ permanent: "host", kind: "suspendLock" }];
  const api = setupScenario(board);
  const room = setupEngine();
  layScenarioFixture(room.state, board);
  expect(api.perm("host").currentDP).toBe(room.state.players[0]!.battleArea[0]!.currentDP);
  expect(observe(api.engine).isRestricted(api.perm("host"), "suspend")).toBe(true);
});

it.each([
  { effects: [{ permanent: "absent", kind: "suspendLock" }] },
  { board: { 0: { hand: [{ card: "BT1-009", ownerSeat: 2 }] } } },
  { board: { 0: { battleArea: [{ card: "BT1-019", currentDP: NaN }] } } },
  { board: { 0: { hand: [{ card: "BT1-009", fromDeck: { seat: 0, index: -1 } }] } } },
  { board: { 0: { battleArea: [{ card: "BT1-019", top: "BT1-009" }] } } },
])("rejects malformed preparation before changing a seated board: %j", (invalid) => {
  const s = setupEngine({ 0: { hand: ["BT1-010"] } });
  const before = s.state.toJSON();
  expect(() => layScenarioFixture(s.state, { ...fixture(), ...invalid } as ScenarioFixture)).toThrow();
  expect(s.state.toJSON()).toEqual(before);
});

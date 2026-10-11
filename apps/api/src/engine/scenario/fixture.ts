import { GameState, PlayerState, Phase, Zone, getCardDefinition } from "@aegis/shared";
import { clearBattleArea, clearZone, setBreeding } from "../state/access.js";
import { createBoardIds, layBoard, type AliasTable, type CardSpec, type PermanentSpec } from "./board.js";

export type { ScenarioFixture, ScenarioReferences } from "./types.js";
import type { ScenarioFixture, ScenarioReferences } from "./types.js";

/** Check local authoring errors before clearing the receiving board. */
export function validateScenarioFixture(fixture: ScenarioFixture): void {
  if (!Number.isInteger(fixture.memory) || Math.abs(fixture.memory) > 10)
    throw new Error("Scenario memory must be an integer from -10 to 10");
  if (fixture.turnSeat !== 0 && fixture.turnSeat !== 1) throw new Error("Scenario turnSeat must be 0 or 1");
  if (!Number.isInteger(fixture.turnCount) || fixture.turnCount < 0 || fixture.turnCount >= 4294967295)
    throw new Error("Scenario turnCount must leave room for the next uint32 turn");
  if (typeof fixture.isFirstPlayersFirstTurn !== "boolean")
    throw new Error("Scenario isFirstPlayersFirstTurn must be explicit");
  if (!fixture.board || Object.keys(fixture.board).some((seat) => seat !== "0" && seat !== "1"))
    throw new Error("Scenario board must contain only seats 0 and 1");
  const aliases = new Set<string>();
  const checkCard = (spec: CardSpec | PermanentSpec) => {
    const card = typeof spec === "string" ? spec : spec.card;
    if (!getCardDefinition(card)) throw new Error(`Unknown scenario card: ${card}`);
    const alias = typeof spec === "string" ? undefined : spec.as;
    if (alias !== undefined) {
      if (!alias || aliases.has(alias)) throw new Error(`Duplicate or empty scenario alias: ${alias}`);
      aliases.add(alias);
    }
  };
  for (const seat of [0, 1] as const) {
    const player = fixture.board[seat];
    if (!player) continue;
    for (const zone of ["hand", "deck", "eggDeck", "trash", "delayZone"] as const)
      for (const card of player[zone] ?? []) checkCard(card);
    if (typeof player.security === "number") {
      if (!Number.isInteger(player.security) || player.security < 0)
        throw new Error("Scenario security count must be a non-negative integer");
    } else for (const card of player.security ?? []) checkCard(card);
    for (const permanent of [...(player.battleArea ?? []), ...(player.breeding ? [player.breeding] : [])]) {
      checkCard(permanent);
      if (typeof permanent !== "string") {
        for (const card of [...(permanent.under ?? []), ...(permanent.linked ?? [])]) checkCard(card);
      }
    }
  }
}

export function arrangeScenarioTurn(state: GameState, fixture: ScenarioFixture): void {
  state.phase = Phase.None;
  state.memory = fixture.memory;
  state.turnSeat = fixture.turnSeat;
  state.turnCount = fixture.turnCount;
  state.isFirstPlayersFirstTurn = fixture.isFirstPlayersFirstTurn;
  // Fixtures start before Active increments turnCount; fresh cards belong to that upcoming turn.
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    const spec = fixture.board[seat];
    if (!player || !spec) continue;
    for (const [index, permanent] of (spec.battleArea ?? []).entries()) {
      if (typeof permanent !== "string" && permanent.enteredThisTurn)
        player.battleArea[index]!.enterFieldTurnCount = fixture.turnCount + 1;
    }
    if (spec.breeding && typeof spec.breeding !== "string" && spec.breeding.enteredThisTurn && player.breeding)
      player.breeding.enterFieldTurnCount = fixture.turnCount + 1;
  }
}

/** Materialize fresh identities on each board, preserving the seated players and visibility ports. */
export function layScenarioFixture(state: GameState, fixture: ScenarioFixture): ScenarioReferences {
  validateScenarioFixture(fixture);
  for (const seat of [0, 1] as const) if (!state.players[seat]) throw new Error(`Scenario seat ${seat} is not seated`);
  for (const seat of [0, 1] as const) {
    const player = state.players[seat]!;
    for (const zone of [Zone.Hand, Zone.Deck, Zone.EggDeck, Zone.Trash, Zone.Security, Zone.Delay] as const)
      clearZone(player, zone);
    clearBattleArea(player);
    setBreeding(player, undefined);
  }
  const aliases: AliasTable = new Map();
  layBoard(state, fixture.board, aliases, createBoardIds("scenario-"));
  arrangeScenarioTurn(state, fixture);
  const lookup = (alias: string) => {
    const entry = aliases.get(alias);
    if (!entry) throw new Error(`Unknown scenario alias: ${alias}`);
    return entry;
  };
  return {
    instanceId(alias) {
      const entry = lookup(alias);
      return entry.kind === "instance" ? entry.id : entry.instanceId!;
    },
    permanentId(alias) {
      const entry = lookup(alias);
      if (entry.kind !== "permanent") throw new Error(`Scenario alias ${alias} is not a permanent`);
      return entry.id;
    },
  };
}

/** References are deterministic and can be obtained before a browser room starts. */
export function scenarioReferences(fixture: ScenarioFixture): ScenarioReferences {
  const state = new GameState();
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  return layScenarioFixture(state, fixture);
}

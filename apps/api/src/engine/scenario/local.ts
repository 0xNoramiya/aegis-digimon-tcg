import { serializeScenarioFixture } from "./serialize.js";
import type { GameState } from "@aegis/shared";
import { layScenarioFixture, scenarioReferences, type ScenarioFixture } from "./fixture.js";

// Supplied by local tooling in the server process, never by a client's join payload.
let fixture: ScenarioFixture | undefined;

export type LocalScenarioEntry = "local-fixture";

/** A development room accepts only the fixture configured in its server process. */
export function isLocalScenarioEntry(value: unknown): value is LocalScenarioEntry {
  return value === "local-fixture" && hasLocalScenario();
}

export function configureLocalScenario(value: ScenarioFixture) {
  if (process.env.NODE_ENV === "production") throw new Error("Local scenarios are unavailable in production");
  const references = scenarioReferences(value);
  fixture = serializeScenarioFixture(value);
  return references;
}

export function clearLocalScenario(): void {
  fixture = undefined;
}

export function hasLocalScenario(): boolean {
  return fixture !== undefined && process.env.NODE_ENV !== "production";
}

export function layLocalScenario(state: GameState): void {
  if (!hasLocalScenario() || !fixture) throw new Error("No local scenario fixture configured");
  layScenarioFixture(state, fixture);
}

/** Freeze per-room data independently of subsequent local runs. */
export function getLocalScenario(): ScenarioFixture {
  if (!hasLocalScenario() || !fixture) throw new Error("No local scenario fixture configured");
  return structuredClone(fixture);
}

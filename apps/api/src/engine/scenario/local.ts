import type { GameState } from "@aegis/shared";
import { layScenarioFixture, scenarioReferences, type ScenarioFixture } from "./fixture.js";

// Supplied by local tooling in the server process, never by a client's join payload.
let fixture: ScenarioFixture | undefined;

export function configureLocalScenario(value: ScenarioFixture) {
  if (process.env.NODE_ENV === "production") throw new Error("Local scenarios are unavailable in production");
  const references = scenarioReferences(value);
  fixture = structuredClone(value);
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

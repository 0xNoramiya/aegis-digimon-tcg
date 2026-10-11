import {
  arrangeScenarioTurn,
  bindScenarioDecks,
  validateScenarioFixture,
  scenarioReferences,
  type ScenarioFixture,
} from "../scenario/fixture.js";
import { applyScenarioEffects } from "../scenario/effects.js";
import type { Decklist } from "../setup.js";
import { setupEngine, type SetupEngineOptions } from "./harness.js";

/** Arrange the same turn-start fixture that browser and local room runners materialize. */
export function setupScenario(
  value: ScenarioFixture,
  options?: SetupEngineOptions & { decks?: readonly [Decklist, Decklist] },
) {
  validateScenarioFixture(value);
  const fixture = bindScenarioDecks(value, options?.decks);
  validateScenarioFixture(fixture);
  const setup = setupEngine({ 0: {}, 1: {}, ...fixture.board }, { ...options, fixtureIds: true });
  arrangeScenarioTurn(setup.state, fixture);
  applyScenarioEffects(setup.engine, fixture, scenarioReferences(fixture));
  return setup;
}

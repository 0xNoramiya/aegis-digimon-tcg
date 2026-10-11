import { arrangeScenarioTurn, validateScenarioFixture, type ScenarioFixture } from "../scenario/fixture.js";
import { setupEngine, type SetupEngineOptions } from "./harness.js";

/** Arrange the same turn-start fixture that browser and local room runners materialize. */
export function setupScenario(fixture: ScenarioFixture, options?: SetupEngineOptions) {
  validateScenarioFixture(fixture);
  // Both keys disambiguate setupEngine's board/options overload even for an empty fixture.
  const setup = setupEngine({ 0: {}, 1: {}, ...fixture.board }, options);
  arrangeScenarioTurn(setup.state, fixture);
  return setup;
}

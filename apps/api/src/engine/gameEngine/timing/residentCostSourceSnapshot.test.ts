import { expect, it } from "vitest";
import { GameState } from "@aegis/shared/schema/GameState";
import { GameEngine } from "#api/engine/GameEngine";
import type { EffectContext } from "#api/engine/effects/context/effectContext";
import { buildEffectContext } from "#api/engine/gameEngine/effectContext";
import { breedingPlayCostEffects } from "#api/engine/gameEngine/timing/payCost";
import { createResidentCostSourceActive } from "#api/engine/gameEngine/timing/createResidentCostSourceActive";
import { RuntimeGraphDecoder } from "#api/engine/snapshot/RuntimeGraphDecoder";
import { RuntimeObjectRegistry } from "#api/engine/snapshot/RuntimeObjectRegistry";
import { registerEngineSchemaFactories } from "#api/engine/snapshot/schema/registerEngineSchemaFactories";
import { encodeRuntimeGraph } from "#api/engine/snapshot/encodeRuntimeGraph";
import { kingDrasilBreedingSnapshot } from "#api/engine/scenarios/king-drasil-breeding-snapshot.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import "#api/cards/index";

it("restores a resident play-cost watcher reached before the context it gates", () => {
  const original = setupScenario(kingDrasilBreedingSnapshot());
  const [resident] = breedingPlayCostEffects(original.engine, 0);
  expect(resident).toBeDefined();
  const played = original.inst("royalKnight");
  const context: EffectContext = {
    ...buildEffectContext(original.engine, resident!.source, {
      wouldBePlayedInstanceId: played.instanceId,
      wouldBePlayedCardId: played.cardId,
    }),
    residentCostRegistration: true,
  };
  context.isResidentCostSourceActive = createResidentCostSourceActive({
    engine: original.engine,
    effect: resident!.effect,
    ctx: context,
  });
  const snapshot = encodeRuntimeGraph({
    value: { state: original.state, watcher: context.isResidentCostSourceActive, context },
    describeObject: original.engine.runtimeObjects.describe.bind(original.engine.runtimeObjects),
    describeCallback: original.engine.runtimeCallbacks.describe.bind(original.engine.runtimeCallbacks),
    references: original.engine.runtimeReferences,
  });
  const objects = new RuntimeObjectRegistry();
  registerEngineSchemaFactories({ objects });
  const decoder = new RuntimeGraphDecoder({ snapshot: JSON.parse(JSON.stringify(snapshot)), objects });
  const state = decoder.decodeRootField({ key: "state" }) as GameState;
  expect(state).toBeInstanceOf(GameState);
  const destination = new GameEngine(state, {
    seed: 1,
    emit: () => {},
    requestDecision: () => {
      throw new Error("Unexpected decision");
    },
  });
  decoder.bindRuntimePorts({
    objects: destination.runtimeObjects,
    createCallback: destination.runtimeCallbacks.create.bind(destination.runtimeCallbacks),
    references: destination.runtimeReferences,
  });
  const restored = decoder.decodeRoot() as {
    watcher: () => boolean;
    context: EffectContext;
  };
  expect(restored.context.isResidentCostSourceActive).toBe(restored.watcher);
  expect(restored.context.game.state).toBe(state);
  expect(restored.watcher()).toBe(context.isResidentCostSourceActive!());
});

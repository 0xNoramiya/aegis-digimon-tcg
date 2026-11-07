import type { GameEngine } from "#api/engine/GameEngine";
import type { ResidentCostSourcePayload } from "#api/engine/gameEngine/timing/ResidentCostSourcePayload";
import { EngineRuntimeCallbackKind } from "#api/engine/snapshot/context/EngineRuntimeCallbackKind";
import { EngineRuntimeObjectKind } from "#api/engine/snapshot/context/EngineRuntimeObjectKind";

type Params = { engine: GameEngine } & ResidentCostSourcePayload;

export function createResidentCostSourceActive({ engine, effect, ctx }: Params): () => boolean {
  const { isResidentCostSourceActive: _watcher, ...gateContext } = ctx;
  for (const value of [ctx, gateContext]) {
    engine.runtimeObjects.track({ value, key: EngineRuntimeObjectKind.EFFECT_CONTEXT.value });
  }
  const payload: ResidentCostSourcePayload = { effect, ctx: gateContext };
  return engine.runtimeCallbacks.create({ key: EngineRuntimeCallbackKind.RESIDENT_COST_SOURCE_ACTIVE.value, payload });
}

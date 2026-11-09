import type { EffectContext } from "#api/engine/effects/context/effectContext";
import type { Primitives } from "#api/engine/effects/EffectContext";
import type { ScopedPrimitiveParams } from "#api/engine/effects/scopes/ScopedPrimitiveParams";
import { ScopedPrimitiveKind } from "#api/engine/effects/scopes/ScopedPrimitiveKind";
import { scopedPrimitiveDescriptors } from "#api/engine/effects/scopes/scopedPrimitiveDescriptors";
import { EngineRuntimeObjectKind } from "#api/engine/snapshot/context/EngineRuntimeObjectKind";

const scopedPrimitivesByBase = new WeakMap<Primitives, Map<string, Primitives>>();

export function createScopedEffectPrimitives(params: ScopedPrimitiveParams): Primitives {
  const base = params.ctx.fx;
  const cacheKey = `${params.kind}|${params.autoKey ?? ""}|${params.maxPerTurn ?? ""}`;
  let scopedByKey = scopedPrimitivesByBase.get(base);
  const cached = scopedByKey?.get(cacheKey);
  if (cached !== undefined) return cached;
  const fx = buildScopedEffectPrimitives(params);
  if (scopedByKey === undefined) {
    scopedByKey = new Map();
    scopedPrimitivesByBase.set(base, scopedByKey);
  }
  scopedByKey.set(cacheKey, fx);
  return fx;
}

function buildScopedEffectPrimitives(params: ScopedPrimitiveParams): Primitives {
  const { ctx, kind, autoKey, maxPerTurn } = params;
  const base = ctx.fx;
  let fx: Primitives;
  if (kind === ScopedPrimitiveKind.STATIC.value) {
    fx = {
      ...base,
      // Static keyword grants belong to the continuously re-derived tier by construction.
      // Mark them explicitly so an overlapping triggered resolution cannot toggle the engine's
      // ambient continuous-mode flag and accidentally make the grant permanent or erase it.
      grantKeyword: (...args: Parameters<EffectContext["fx"]["grantKeyword"]>) => {
        const [permanentId, keyword, duration, amount, grantOpts] = args;
        return base.grantKeyword(permanentId, keyword, duration, amount, {
          ...grantOpts,
          continuous: true,
        });
      },
      subscribeSubTrigger: (sub: Parameters<EffectContext["fx"]["subscribeSubTrigger"]>[0]) =>
        base.subscribeSubTrigger({
          ...sub,
          continuous: sub.continuous ?? true,
          ...(maxPerTurn !== undefined && maxPerTurn >= 1 ? { oncePerTurnKey: sub.oncePerTurnKey ?? autoKey } : {}),
        }),
      changeEvoCost: (
        filter: Parameters<EffectContext["fx"]["changeEvoCost"]>[0],
        delta: number,
        changeOpts: Parameters<EffectContext["fx"]["changeEvoCost"]>[2],
      ) =>
        base.changeEvoCost(filter, delta, {
          ...changeOpts,
          continuous: true,
        }),
      modifyDP: (
        permanentId: Parameters<EffectContext["fx"]["modifyDP"]>[0],
        delta: Parameters<EffectContext["fx"]["modifyDP"]>[1],
        duration: Parameters<EffectContext["fx"]["modifyDP"]>[2],
        modifyOpts: Parameters<EffectContext["fx"]["modifyDP"]>[3],
      ) =>
        base.modifyDP(permanentId, delta, duration, {
          ...modifyOpts,
          continuous: true,
        }),
      subscribeReplacement: (replacement: Parameters<EffectContext["fx"]["subscribeReplacement"]>[0]) =>
        base.subscribeReplacement({
          ...replacement,
          ...(maxPerTurn !== undefined && maxPerTurn >= 1
            ? { oncePerTurnKey: replacement.oncePerTurnKey ?? autoKey }
            : {}),
        }),
      restrict: (
        permanentId: Parameters<EffectContext["fx"]["restrict"]>[0],
        restriction: Parameters<EffectContext["fx"]["restrict"]>[1],
        duration: Parameters<EffectContext["fx"]["restrict"]>[2],
        restrictOpts: Parameters<EffectContext["fx"]["restrict"]>[3],
      ) =>
        base.restrict(permanentId, restriction, duration, {
          ...restrictOpts,
          continuous: true,
        }),
    };
  } else if (kind === ScopedPrimitiveKind.EVOLUTION_COST.value) {
    fx = {
      ...base,
      changeEvoCost: (filter, delta, options) => base.changeEvoCost(filter, delta, { ...options, continuous: true }),
    };
  } else if (kind === ScopedPrimitiveKind.SECURITY.value) {
    fx = {
      ...base,
      modifyDP: (permanentId, delta, duration, options) =>
        base.modifyDP(permanentId, delta, duration, { ...options, continuous: true }),
    };
  } else {
    throw new Error("Unknown scoped primitive kind");
  }
  const objects = ctx.game?.runtimeObjects;
  if (objects !== undefined && !objects.snapshotsEnabled) {
    return fx;
  }
  scopedPrimitiveDescriptors.set(fx, { params, fields: new Map(Object.entries(fx)) });
  objects?.track({ value: ctx, key: EngineRuntimeObjectKind.EFFECT_CONTEXT.value });
  objects?.track({ value: fx, key: EngineRuntimeObjectKind.SCOPED_PRIMITIVES.value });
  return fx;
}

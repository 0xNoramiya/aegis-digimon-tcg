import { EffectDuration } from "@aegis/shared";
import type { GameEngine } from "../GameEngine.js";
import type { ScenarioFixture, ScenarioReferences } from "./types.js";

/** Restore explicit initial effects through the engine's continuous-effect seam. */
export function applyScenarioEffects(engine: GameEngine, fixture: ScenarioFixture, refs: ScenarioReferences): void {
  for (const effect of fixture.effects ?? []) {
    const id = refs.permanentId(effect.permanent);
    if (effect.kind === "suspendLock") {
      engine.continuous.addRestriction(id, "suspend", EffectDuration.Permanent);
    } else {
      const permanent = [...engine.state.players]
        .flatMap((player) => [...player.battleArea, ...(player.breeding ? [player.breeding] : [])])
        .find((p) => p.permanentId === id)!;
      const opponentOnly = { byOpponentEffectsOnly: true, originSeat: permanent.controllerSeat };
      engine.continuous.addRestriction(id, "dpImmune", EffectDuration.UntilOpponentTurnEnd, opponentOnly);
      engine.continuous.addRestriction(id, "stackReturn", EffectDuration.UntilOpponentTurnEnd, opponentOnly);
      engine.continuous.addStackTrashLock(id, EffectDuration.UntilOpponentTurnEnd);
    }
  }
  engine.projection.syncRestrictions();
}

import type { Seat } from "@aegis/shared";
import type { GameEngine } from "../../engine/GameEngine.js";
import type { Decklist } from "../../engine/testDecks.js";
import { runBotMatch, type MatchResult } from "../matchHarness.js";
import { mainActionReady } from "../training/actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "../training/policy.js";
import { determinize } from "./determinize.js";
import {
  actionCardId,
  actionFeatures,
  chooseHeuristic,
  rankHeuristic,
  SEED_HEURISTIC,
  type HeuristicProgram,
} from "./heuristic.js";
import { actionKey, informationKey, searchMcts, type SearchReport } from "./mcts.js";

interface RecordedChoice {
  seat: Seat;
  information: string;
  action: string;
}
export interface EvolutionMatchOptions {
  seed: number;
  decks: readonly [Decklist, Decklist];
  learnerSeat: Seat;
  program: HeuristicProgram;
  opponentProgram?: HeuristicProgram;
  mcts?: { simulations: number; seed: number };
  turnLimit?: number;
  captureTraces?: boolean;
  onSearch?: (report: SearchReport) => void;
}
export function validEvolutionGame(result: MatchResult): boolean {
  return (
    !result.timedOut &&
    result.reason !== "stalled" &&
    result.reason !== "cancelled" &&
    result.errors.length === 0 &&
    result.rejections.length === 0 &&
    !result.events?.some((event) => event.kind === "actionRejected") &&
    result.seats.every((seat) => seat.inferenceFallbacks.error === 0 && seat.inferenceFallbacks.timeout === 0)
  );
}

/** Reconstruct a live engine (including private ledgers/queued effects) by exact replay.
 * The prefix is restoration machinery, never supplied as an observation to search.
 * After restoration all rollout choices see filtered training observations only.
 */
export async function runEvolutionMatch(options: EvolutionMatchOptions) {
  const transcript: RecordedChoice[] = [];
  const traces: unknown[] = [];
  const searches: SearchReport[] = [];
  const opponentSeat: Seat = options.learnerSeat === 0 ? 1 : 0;
  const pilots = [SEED_HEURISTIC, SEED_HEURISTIC];
  pilots[options.learnerSeat] = options.program;
  pilots[opponentSeat] = options.opponentProgram ?? SEED_HEURISTIC;
  const rollout = (seat: Seat, window: TrainingWindow): number =>
    chooseHeuristic(pilots[seat]!, window, options.seed + seat * 7919);
  const replay = async (
    prefix: readonly RecordedChoice[],
    root: TrainingWindow,
    choose: (window: TrainingWindow) => number,
    sampleSeed: number,
    signal: AbortSignal,
  ): Promise<{ reward: number; valid: boolean }> => {
    let cursor = 0;
    let reachedRoot = false;
    let mismatch = false;
    const control = new AbortController();
    const seats = options.decks.map((deck, index) => ({
      deck,
      policyTimeoutMs: 60000,
      canChooseMainAction: mainActionReady,
      maxMainPhaseActions: Number.POSITIVE_INFINITY,
      policyFactory: (engine: GameEngine, seat: Seat) =>
        createAsyncTrainingPolicy(engine, seat, async (window) => {
          if (cursor > 10000) {
            mismatch = true;
            control.abort();
            return rollout(seat, window);
          }
          const entry = prefix[cursor++];
          if (entry !== undefined) {
            const action = window.actions.findIndex(
              (_, actionIndex) => actionKey(window, actionIndex) === entry.action,
            );
            if (entry.seat !== seat || entry.information !== informationKey(window) || action < 0) {
              mismatch = true;
              control.abort();
              return rollout(seat, window);
            }
            return action;
          }
          if (!reachedRoot) {
            if (seat !== opponentSeat || informationKey(window) !== informationKey(root)) {
              mismatch = true;
              control.abort();
              return rollout(seat, window);
            }
            reachedRoot = true;
            await determinize(engine, opponentSeat, sampleSeed);
          }
          return index === opponentSeat ? choose(window) : rollout(seat, window);
        }),
    }));
    const result = await runBotMatch({
      seed: options.seed,
      seats: [seats[0]!, seats[1]!],
      turnLimit: options.turnLimit ?? 60,
      captureEvents: true,
      signal: AbortSignal.any([control.signal, signal]),
    });
    const valid = reachedRoot && !mismatch && validEvolutionGame(result);
    return { reward: result.winnerSeat === opponentSeat ? 1 : result.winnerSeat === undefined ? 0.5 : 0, valid };
  };
  const seats = options.decks.map((deck) => ({
    deck,
    policyTimeoutMs: 3600000,
    canChooseMainAction: mainActionReady,
    maxMainPhaseActions: Number.POSITIVE_INFINITY,
    policyFactory: (engine: GameEngine, seat: Seat) =>
      createAsyncTrainingPolicy(engine, seat, async (window, signal) => {
        if (transcript.length > 10000) throw new Error("Evolution match decision budget exceeded");
        let action: number;
        if (
          seat === opponentSeat &&
          options.mcts !== undefined &&
          window.kind === "main" &&
          window.actions.length > 1 &&
          engine.state.pendingDecision === undefined &&
          engine.state.combatWindow === undefined
        ) {
          const prefix = [...transcript];
          const search = await searchMcts({
            root: window,
            seat,
            simulations: options.mcts.simulations,
            signal,
            rolloutChoose: (next) => rollout(seat, next),
            simulate: (choose, simulation) =>
              replay(
                prefix,
                window,
                choose,
                (options.mcts!.seed + prefix.length * 7919 + simulation * 104729) >>> 0,
                signal,
              ),
          });
          action = search.action;
          searches.push(search.report);
          options.onSearch?.(search.report);
        } else action = rollout(seat, window);
        transcript.push({ seat, information: informationKey(window), action: actionKey(window, action) });
        if (options.captureTraces && seat === options.learnerSeat && traces.length < 200) {
          const ranked = rankHeuristic(options.program, window);
          const choice = ranked.find((entry) => entry.index === action)!;
          traces.push({
            turn: window.observation.turn,
            kind: window.kind,
            action: window.actions[action],
            sourceCardId: actionCardId(window, action),
            features: actionFeatures(window, action),
            score: choice.score,
            legalActions: ranked.length,
            topScoreTies: ranked.filter((entry) => entry.score === ranked[0]!.score).length,
            scoreTies: ranked.filter((entry) => entry.score === choice.score).length,
            reasons: choice.contributions.filter((rule) => rule.value !== 0),
            alternatives: ranked
              .filter((entry) => entry.index !== action)
              .slice(0, 3)
              .map((entry) => ({
                action: window.actions[entry.index],
                sourceCardId: actionCardId(window, entry.index),
                features: actionFeatures(window, entry.index),
                score: entry.score,
              })),
          });
        }
        return action;
      }),
  }));
  const result = await runBotMatch({
    seed: options.seed,
    seats: [seats[0]!, seats[1]!],
    turnLimit: options.turnLimit ?? 60,
    captureEvents: true,
    verifyProjections: true,
  });
  return {
    result,
    valid: validEvolutionGame(result) && searches.every((search) => search.completed === search.requested),
    traces,
    searches,
    decisions: transcript.length,
  };
}

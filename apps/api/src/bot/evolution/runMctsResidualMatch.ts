import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { Intent } from "@aegis/shared/protocol/intents";
import type { Seat } from "@aegis/shared/schema/enums";
import { shuffleInPlace, makeRng } from "#api/engine/setup";
import { runBotMatch } from "#api/bot/matchHarness";
import { buildBotView } from "#api/bot/view";
import { mainActionReady, mainActions } from "#api/bot/training/actions";
import { trainingObservation } from "#api/bot/training/observation";
import type { TrainingWindow } from "#api/bot/training/policy";
import { createRecordedResidualPolicy } from "#api/bot/evolution/createRecordedResidualPolicy";
import { determinize } from "#api/bot/evolution/determinize";
import { validEvolutionGame } from "#api/bot/evolution/evolutionMatch";
import { informationKey, searchMcts, type SearchReport } from "#api/bot/evolution/mcts";
import type { MctsResidualMatchOptions } from "#api/bot/evolution/MctsResidualMatchOptions";
import type { RecordedResidualChoice } from "#api/bot/evolution/RecordedResidualChoice";
import { SEED_RESIDUAL } from "#api/bot/evolution/residualPolicy";
import { evaluateSearchPosition } from "#api/bot/evolution/evaluateSearchPosition";
import { orderMctsActions } from "#api/bot/evolution/orderMctsActions";
import type { HeuristicProgram } from "#api/bot/evolution/heuristic";

type RecordedIntent = {
  seat: Seat;
  method: RecordedResidualChoice["method"];
  information: string;
  intent: Intent;
};

function observedChoice(choice: RecordedResidualChoice): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        observation: trainingObservation(choice.engine.state, choice.seat),
        method: choice.method,
        context: choice.context,
        request: choice.request === undefined ? undefined : { ...choice.request, decisionId: undefined },
      }),
    )
    .digest("hex");
}

function searchWindow(choice: RecordedResidualChoice, seed: number, program?: HeuristicProgram): TrainingWindow {
  const view = buildBotView(choice.engine.state, choice.seat);
  if (view === undefined) throw new Error("Residual search requires a seated observation");
  const actions = mainActions(choice.engine, choice.seat, {
    includeSpecialActions: false,
    digiXrosValidationBudget: 256,
  }).filter((action) => action.intent.type !== "activateEffect" && (action.projectedCost ?? 0) <= view.maxAffordable);
  const key = JSON.stringify(choice.baseline);
  const alternatives = actions.filter((action) => JSON.stringify(action.intent) !== key);
  shuffleInPlace(alternatives, makeRng(seed));
  const window: TrainingWindow = {
    observation: trainingObservation(choice.engine.state, choice.seat),
    kind: "main",
    selected: [],
    actions: [{ intent: choice.baseline, label: "Current residual policy" }, ...alternatives],
  };
  return program === undefined ? window : orderMctsActions({ window, program });
}

function searchable(choice: RecordedResidualChoice): boolean {
  return (
    choice.method === "chooseMainAction" &&
    choice.baseline.type !== "activateEffect" &&
    choice.engine.state.pendingDecision === undefined &&
    choice.engine.state.combatWindow === undefined
  );
}

export async function runMctsResidualMatch(options: MctsResidualMatchOptions) {
  if (options.moveOrderingProgram?.basePolicy !== undefined) {
    throw new Error("MCTS ordering requires a standalone heuristic program");
  }
  if (
    !Number.isSafeInteger(options.simulations) ||
    options.simulations < 0 ||
    options.simulations > 10000 ||
    (options.rolloutTurns !== undefined &&
      (!Number.isSafeInteger(options.rolloutTurns) || options.rolloutTurns < 1 || options.rolloutTurns > 200)) ||
    (options.maxRolloutDecisions !== undefined &&
      (!Number.isSafeInteger(options.maxRolloutDecisions) ||
        options.maxRolloutDecisions < 1 ||
        options.maxRolloutDecisions > 10000)) ||
    (options.exploration !== undefined && (!Number.isFinite(options.exploration) || options.exploration < 0)) ||
    (options.maxSearchTimeMs !== undefined &&
      (!Number.isFinite(options.maxSearchTimeMs) || options.maxSearchTimeMs <= 0)) ||
    [options.maxSearches, options.startAfterDecisions].some(
      (limit) => limit !== undefined && (!Number.isSafeInteger(limit) || limit < 0),
    )
  ) {
    throw new Error("Invalid residual MCTS search budget");
  }
  const maxRolloutDecisions = options.maxRolloutDecisions ?? (options.rolloutTurns === undefined ? undefined : 64);
  const searchSeat = options.searchSeat ?? options.learnerSeat;
  if (searchSeat !== 0 && searchSeat !== 1) throw new Error("Residual search needs a valid seat");
  const programs = [SEED_RESIDUAL, SEED_RESIDUAL];
  programs[options.learnerSeat] = options.program;
  programs[options.learnerSeat === 0 ? 1 : 0] = options.opponentProgram ?? SEED_RESIDUAL;
  const transcript: RecordedIntent[] = [];
  const searches: (SearchReport & { seat: Seat; elapsedMs: number })[] = [];
  const traces: unknown[] = [];
  let replayedChoices = 0;
  const seatsFor = (choose: (choice: RecordedResidualChoice) => Promise<Intent>, live: boolean) =>
    options.decks.map((deck) => ({
      deck,
      canChooseMainAction: mainActionReady,
      policyTimeoutMs: live ? 600000 : 60000,
      policyFactory: (engine: RecordedResidualChoice["engine"], seat: Seat) =>
        createRecordedResidualPolicy({
          engine,
          seat,
          seed: options.seed + seat * 7919,
          program: programs[seat]!,
          choose,
          onDecision:
            live && options.captureTraces && seat === options.learnerSeat
              ? (trace) => {
                  traces.push({ baseline: trace });
                  if (traces.length > 200) traces.shift();
                }
              : undefined,
        }),
    }));
  const simulate = async (
    prefix: readonly RecordedIntent[],
    root: TrainingWindow,
    choose: (window: TrainingWindow) => number,
    sampleSeed: number,
    signal: AbortSignal,
  ) => {
    let cursor = 0;
    let reachedRoot = false;
    let mismatch = false;
    let leafValue: number | undefined;
    const control = new AbortController();
    const seats = seatsFor(async (choice) => {
      const entry = prefix[cursor++];
      if (entry !== undefined) {
        if (
          entry.seat !== choice.seat ||
          entry.method !== choice.method ||
          entry.information !== observedChoice(choice)
        ) {
          mismatch = true;
          control.abort();
          return choice.baseline;
        }
        replayedChoices++;
        const intent = structuredClone(entry.intent);
        return intent.type === "respondDecision" && choice.request !== undefined
          ? { ...intent, decisionId: choice.request.decisionId }
          : intent;
      }
      if (!reachedRoot) {
        if (choice.seat !== searchSeat || !searchable(choice)) {
          mismatch = true;
          control.abort();
          return choice.baseline;
        }
        const restored = searchWindow(choice, options.searchSeed + prefix.length, options.moveOrderingProgram);
        if (
          informationKey(restored) !== informationKey(root) ||
          JSON.stringify(restored.actions.map((action) => action.intent)) !==
            JSON.stringify(root.actions.map((action) => action.intent))
        ) {
          mismatch = true;
          control.abort();
          return choice.baseline;
        }
        reachedRoot = true;
        await determinize(choice.engine, searchSeat, sampleSeed);
        return structuredClone(root.actions[choose(root)]!.intent);
      }
      if (
        ((options.rolloutTurns !== undefined &&
          choice.engine.state.turnCount >= root.observation.turn + options.rolloutTurns) ||
          (maxRolloutDecisions !== undefined && cursor - prefix.length >= maxRolloutDecisions)) &&
        choice.method === "chooseMainAction" &&
        choice.engine.state.pendingDecision === undefined &&
        choice.engine.state.combatWindow === undefined
      ) {
        leafValue = evaluateSearchPosition(trainingObservation(choice.engine.state, searchSeat));
        control.abort();
        return choice.baseline;
      }
      if (choice.seat !== searchSeat || !searchable(choice)) return choice.baseline;
      const window = searchWindow(choice, sampleSeed + cursor, options.moveOrderingProgram);
      return structuredClone(window.actions[choose(window)]!.intent);
    }, false);
    const result = await runBotMatch({
      seed: options.seed,
      seats: [seats[0]!, seats[1]!],
      turnLimit: options.turnLimit ?? 60,
      captureEvents: true,
      captureEventFilter: (event) => event.kind === "actionRejected",
      measureDecisionLatencies: false,
      signal: AbortSignal.any([control.signal, signal]),
    });
    const healthyCutoff =
      leafValue !== undefined &&
      result.reason === "cancelled" &&
      !signal.aborted &&
      !result.timedOut &&
      result.errors.length === 0 &&
      result.rejections.length === 0 &&
      !result.events?.some((event) => event.kind === "actionRejected") &&
      result.seats.every((seat) => seat.inferenceFallbacks.error === 0 && seat.inferenceFallbacks.timeout === 0);
    function getReward(): number {
      if (healthyCutoff) {
        return leafValue!;
      }
      if (result.winnerSeat === searchSeat) {
        return 1;
      }
      if (result.winnerSeat === undefined) {
        return 0.5;
      }
      return 0;
    }
    return {
      valid: reachedRoot && !mismatch && (validEvolutionGame(result) || healthyCutoff),
      reward: getReward(),
      evaluatedLeaf: healthyCutoff,
    };
  };
  const seats = seatsFor(async (choice) => {
    const information = observedChoice(choice);
    let intent = choice.baseline;
    if (
      options.simulations > 0 &&
      choice.seat === searchSeat &&
      searchable(choice) &&
      transcript.length >= (options.startAfterDecisions ?? 0) &&
      searches.length < (options.maxSearches ?? Number.POSITIVE_INFINITY)
    ) {
      const root = searchWindow(choice, options.searchSeed + transcript.length, options.moveOrderingProgram);
      if (root.actions.length > 1) {
        const prefix = [...transcript];
        const start = performance.now();
        const signal = choice.signal ?? new AbortController().signal;
        let leafEvaluations = 0;
        const search = await searchMcts({
          root,
          seat: searchSeat,
          simulations: options.simulations,
          exploration: options.exploration,
          maxDurationMs: options.maxSearchTimeMs,
          signal,
          rolloutChoose: () => 0,
          simulate: async (choose, simulation) => {
            const result = await simulate(
              prefix,
              root,
              choose,
              (options.searchSeed + prefix.length * 7919 + simulation * 104729) >>> 0,
              signal,
            );
            if (result.valid && result.evaluatedLeaf) {
              leafEvaluations++;
            }
            return result;
          },
        });
        intent = structuredClone(root.actions[search.action]!.intent);
        const report = {
          ...search.report,
          seat: searchSeat,
          elapsedMs: performance.now() - start,
          ...(maxRolloutDecisions === undefined ? {} : { leafEvaluations }),
        };
        searches.push(report);
        options.onSearch?.(report);
      }
    }
    transcript.push({
      seat: choice.seat,
      method: choice.method,
      information,
      intent: structuredClone(intent),
    });
    if (transcript.length > 10000) throw new Error("Residual MCTS match exceeded its decision budget");
    return intent;
  }, true);
  const result = await runBotMatch({
    seed: options.seed,
    seats: [seats[0]!, seats[1]!],
    turnLimit: options.turnLimit ?? 60,
    captureEvents: true,
    verifyProjections: true,
    signal: options.signal,
  });
  return {
    result,
    valid:
      validEvolutionGame(result) &&
      searches.every(
        (search) =>
          search.invalid === 0 &&
          (search.completed === search.requested || (search.completed > 0 && search.timeBudget?.exhausted === true)),
      ),
    decisions: transcript.length,
    traces,
    searches,
    replayedChoices,
  };
}

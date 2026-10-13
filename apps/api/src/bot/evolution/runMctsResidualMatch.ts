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

function searchWindow(choice: RecordedResidualChoice, seed: number): TrainingWindow {
  const view = buildBotView(choice.engine.state, choice.seat);
  if (view === undefined) throw new Error("Residual search requires a seated observation");
  const actions = mainActions(choice.engine, choice.seat, {
    includeSpecialActions: false,
    digiXrosValidationBudget: 256,
  }).filter((action) => action.intent.type !== "activateEffect" && (action.projectedCost ?? 0) <= view.maxAffordable);
  const key = JSON.stringify(choice.baseline);
  const alternatives = actions.filter((action) => JSON.stringify(action.intent) !== key);
  shuffleInPlace(alternatives, makeRng(seed));
  return {
    observation: trainingObservation(choice.engine.state, choice.seat),
    kind: "main",
    selected: [],
    actions: [{ intent: choice.baseline, label: "Current residual policy" }, ...alternatives],
  };
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
  if (
    !Number.isSafeInteger(options.simulations) ||
    options.simulations < 0 ||
    options.simulations > 10000 ||
    [options.maxSearches, options.startAfterDecisions].some(
      (limit) => limit !== undefined && (!Number.isSafeInteger(limit) || limit < 0),
    )
  )
    throw new Error("Invalid residual MCTS search budget");
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
        const restored = searchWindow(choice, options.searchSeed + prefix.length);
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
      if (choice.seat !== searchSeat || !searchable(choice)) return choice.baseline;
      const window = searchWindow(choice, sampleSeed + cursor);
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
    return {
      valid: reachedRoot && !mismatch && validEvolutionGame(result),
      reward: result.winnerSeat === searchSeat ? 1 : result.winnerSeat === undefined ? 0.5 : 0,
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
      const root = searchWindow(choice, options.searchSeed + transcript.length);
      if (root.actions.length > 1) {
        const prefix = [...transcript];
        const start = performance.now();
        const signal = choice.signal ?? new AbortController().signal;
        const search = await searchMcts({
          root,
          seat: searchSeat,
          simulations: options.simulations,
          signal,
          rolloutChoose: () => 0,
          simulate: (choose, simulation) =>
            simulate(
              prefix,
              root,
              choose,
              (options.searchSeed + prefix.length * 7919 + simulation * 104729) >>> 0,
              signal,
            ),
        });
        intent = structuredClone(root.actions[search.action]!.intent);
        const report = { ...search.report, seat: searchSeat, elapsedMs: performance.now() - start };
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
    valid: validEvolutionGame(result) && searches.every((search) => search.completed === search.requested),
    decisions: transcript.length,
    traces,
    searches,
    replayedChoices,
  };
}

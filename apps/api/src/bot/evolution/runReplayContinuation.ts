import { hasUnsupportedReplayKnowledge } from "#api/bot/evolution/hasUnsupportedReplayKnowledge";
import { createLibraryKnowledgeTracker } from "#api/bot/evolution/createLibraryKnowledgeTracker";
import { determinizeBotRoot } from "#api/bot/evolution/determinizeBotRoot";
import type { GameEngine } from "#api/engine/GameEngine";
import type { BotPolicy } from "#api/bot/policy";
import { performance } from "node:perf_hooks";
import type { Intent } from "@aegis/shared/protocol/intents";
import type { Seat } from "@aegis/shared/schema/enums";
import { BotPlayer } from "#api/bot/BotPlayer";
import { runReplay } from "#api/replays/inputs/run";
import type { ReplayRecord } from "#api/replays/inputs/types";
import { determinize } from "#api/bot/evolution/determinize";
import { getReplaySearchWindow } from "#api/bot/evolution/getReplaySearchWindow";
import { informationKey } from "#api/bot/evolution/mcts";
import { chooseHeuristic, type HeuristicProgram } from "#api/bot/evolution/heuristic";
import { mainActionReady } from "#api/bot/training/actions";
import { createAsyncTrainingPolicy, type TrainingWindow } from "#api/bot/training/policy";

type ContinuationOpponent = {
  policyFactory: (engine: GameEngine, seat: Seat) => BotPolicy<Intent | Promise<Intent>>;
  canChooseMainAction?: (engine: GameEngine) => boolean;
  maxMainPhaseActions?: number;
};

type Params = {
  record: ReplayRecord;
  inputIndex: number;
  seat: Seat;
  expectedInformation: string;
  sampleSeed: number;
  program: HeuristicProgram;
  choose: (window: TrainingWindow) => number;
  chooseAfterRoot?: (window: TrainingWindow) => number;
  opponent?: ContinuationOpponent;
  maxMainPhaseActions?: number;
  signal?: AbortSignal;
  maxDurationMs?: number;
  turnLimit?: number;
};

function optionalSeatLimits(canChooseMainAction: (() => boolean) | undefined, maxMainPhaseActions: number | undefined) {
  return {
    ...(canChooseMainAction === undefined ? {} : { canChooseMainAction }),
    ...(maxMainPhaseActions === undefined ? {} : { maxMainPhaseActions }),
  };
}

export async function runReplayContinuation(input: Params) {
  if (
    !Number.isSafeInteger(input.inputIndex) ||
    input.inputIndex < 0 ||
    input.inputIndex >= input.record.inputs.length
  ) {
    throw new Error("Invalid replay root index");
  }
  const started = performance.now();
  const botRoot = input.record.seats.every((seat) => seat.bot === true);
  const library = createLibraryKnowledgeTracker();
  let unsupportedKnowledge = false;
  let knowledgeReason = "";
  const run = await runReplay(input.record, {
    untilInput: input.inputIndex,
    stopOnDivergence: true,
    onBatch: (state, events) => {
      if (botRoot) {
        library.observeBatch(state, events);
        return;
      }
      if (events.some((event) => event.kind === "matchStarted")) {
        unsupportedKnowledge = false;
      }
      if (events.some((event) => hasUnsupportedReplayKnowledge(event))) {
        unsupportedKnowledge = true;
        knowledgeReason = JSON.stringify(events.filter(hasUnsupportedReplayKnowledge));
      }
    },
    onDecision: (request) => {
      if (botRoot) {
        library.observeDecision(request);
        return;
      }
      if (request.seat === input.seat && (request.options?.visibleCards?.length ?? 0) > 0) {
        unsupportedKnowledge = true;
        knowledgeReason = "private visible cards";
      }
    },
  });
  if (run.divergences.length || run.applied !== input.inputIndex) {
    throw new Error("Replay prefix diverged");
  }
  if (unsupportedKnowledge) {
    throw new Error(`Replay prefix has unsupported revealed or ordered hidden knowledge: ${knowledgeReason}`);
  }
  const libraryKnowledge = library.getKnowledge(run.state);
  if (libraryKnowledge !== undefined) {
    throw new Error(`Replay prefix has publicly known library order: ${libraryKnowledge}`);
  }
  const root = getReplaySearchWindow({ engine: run.engine, seat: input.seat });
  if (informationKey(root) !== input.expectedInformation) {
    throw new Error("Replay root observation or offered actions changed");
  }
  if (botRoot) {
    await determinizeBotRoot(run.engine, input.sampleSeed);
  } else {
    await determinize(run.engine, input.seat, input.sampleSeed);
  }
  if (informationKey(getReplaySearchWindow({ engine: run.engine, seat: input.seat })) !== input.expectedInformation) {
    throw new Error("Hidden sampling changed the visible root");
  }
  const bots: BotPlayer[] = [];
  const failures: string[] = [];
  let rootChosen = false;
  let closed = false;
  let progress = 0;
  let terminalReward: number | undefined;
  let reason = "unfinished";
  function getRootActions() {
    if (rootChosen) {
      return undefined;
    }
    return [...root.actions];
  }
  function chooseControlled(window: TrainingWindow): number {
    if (window.kind === "main" && !rootChosen) {
      rootChosen = true;
      return input.choose(root);
    }
    if (input.chooseAfterRoot !== undefined) {
      return input.chooseAfterRoot(window);
    }
    if (window.kind === "main") {
      return input.choose(window);
    }
    return chooseHeuristic(input.program, window, input.sampleSeed + input.seat * 7919);
  }
  function createPolicy(seat: Seat): BotPolicy<Intent | Promise<Intent>> {
    if (seat !== input.seat && input.opponent !== undefined) {
      return input.opponent.policyFactory(run.engine, seat);
    }
    return createAsyncTrainingPolicy(
      run.engine,
      seat,
      async (window) => {
        input.signal?.throwIfAborted();
        if (seat === input.seat) {
          return chooseControlled(window);
        }
        return chooseHeuristic(input.program, window, input.sampleSeed + seat * 7919);
      },
      undefined,
      seat === input.seat ? getRootActions : undefined,
    );
  }
  function getMainActionGate(seat: Seat): (() => boolean) | undefined {
    if (seat === input.seat || input.opponent === undefined) {
      return () => mainActionReady(run.engine);
    }
    const gate = input.opponent.canChooseMainAction;
    return gate === undefined ? undefined : () => gate(run.engine);
  }
  function getMainPhaseActionLimit(seat: Seat): number | undefined {
    if (seat === input.seat) {
      return input.maxMainPhaseActions;
    }
    return input.opponent?.maxMainPhaseActions;
  }
  const policies = ([0, 1] as const).map(createPolicy);
  for (const seat of [0, 1] as const) {
    bots.push(
      new BotPlayer(
        seat,
        run.state,
        (intent: Intent) => {
          if (closed || input.signal?.aborted) {
            return;
          }
          try {
            const result = run.engine.applyIntent(seat, intent);
            progress++;
            if (!result.ok) {
              failures.push(result.reason);
            }
            return result;
          } catch (error) {
            failures.push(String(error));
            return { ok: false, reason: "not-implemented" };
          }
        },
        {
          policy: policies[seat],
          seed: input.sampleSeed + seat * 7919,
          policyTimeoutMs: 60000,
          thinkDelay: () => new Promise<void>((resolve) => setImmediate(resolve)),
          ...optionalSeatLimits(getMainActionGate(seat), getMainPhaseActionLimit(seat)),
        },
      ),
    );
  }
  run.activate({
    seed: input.sampleSeed,
    requestDecision: (seat, request) => bots[seat]!.onDecisionRequested(request),
    onActionSettled: (seat, type) => bots[seat]!.onActionSettled(type),
    emit: (event) => {
      progress++;
      if (event.kind === "gameOver") {
        reason = event.reason;
        terminalReward = event.result.outcome === "draw" ? 0.5 : Number(event.result.winnerSeat === input.seat);
      }
      if (event.kind === "actionRejected") {
        failures.push("actionRejected");
      }
      for (const bot of bots) {
        bot.onEvent(event);
      }
    },
  });
  const rootTurn = run.state.turnCount;
  let idle = 0;
  let previous = progress;
  try {
    bots[input.seat]!.resumeAfterRollback();
    while (!run.state.gameOver && failures.length === 0) {
      input.signal?.throwIfAborted();
      if (
        performance.now() - started > (input.maxDurationMs ?? 60000) ||
        run.state.turnCount > rootTurn + (input.turnLimit ?? 60)
      ) {
        reason = "continuationLimit";
        break;
      }
      await new Promise<void>((resolve) => setImmediate(resolve));
      idle = progress === previous ? idle + 1 : 0;
      previous = progress;
      if (idle > 5000 && bots.every((bot) => bot.diagnosticState.pendingPolicyDecisions === 0)) {
        reason = "stalled";
        break;
      }
    }
  } finally {
    closed = true;
    for (const bot of bots) {
      bot.dispose();
    }
  }
  const valid =
    rootChosen &&
    terminalReward !== undefined &&
    failures.length === 0 &&
    bots.every((bot) => bot.inferenceFallbacks.error === 0 && bot.inferenceFallbacks.timeout === 0);
  return {
    valid,
    reward: terminalReward ?? 0,
    reason,
    turn: run.state.turnCount,
    failures,
    ms: performance.now() - started,
  };
}

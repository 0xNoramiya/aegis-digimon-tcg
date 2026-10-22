import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GameState } from "@aegis/shared/schema/GameState";
import type { Intent } from "@aegis/shared/protocol/intents";
import type { ServerEvent } from "@aegis/shared/protocol/events";
import type { Seat } from "@aegis/shared/schema/enums";
import "#api/cards/index";
import { GameEngine } from "#api/engine/GameEngine";
import { snapshotGameEngine } from "#api/engine/snapshot/snapshotGameEngine";
import { restoreGameEngine } from "#api/engine/snapshot/restoreGameEngine";
import { waitForEngineIdle } from "#api/engine/snapshot/waitForEngineIdle";
import type { GameEngineSnapshot } from "#api/engine/snapshot/GameEngineSnapshot";
import { SeededRandom } from "#api/engine/random/SeededRandom";
import { BotPlayer } from "#api/bot/BotPlayer";
import { createEvaluationPolicy, type BotPolicy } from "#api/bot/policy";
import { evolutionPilotDecks } from "#api/bot/evolution/evolutionPilotDecks";

type PositionKind = "main" | "block" | "counter" | "decision";
type RecordedInput = { seat: Seat; intent: Intent; events: number };
type Position = { kind: PositionKind; snapshot: GameEngineSnapshot; events: number; inputs: number };
type RecordedMatch = {
  events: ServerEvent[];
  inputs: RecordedInput[];
  positions: Position[];
  failures: Record<PositionKind, number>;
  state: GameState;
};
type PlayParams = { seed: number; sampleRate: number };
type VerifyParams = { seed: number; match: RecordedMatch; position: Position };

const TURN_LIMIT = 24;
const POSITION_KINDS: readonly PositionKind[] = ["main", "block", "counter", "decision"];

function readDecks(): readonly { deck: { mainDeck: string[]; eggDeck: string[] } }[] {
  const path = process.env.SNAPSHOT_CONFORMANCE_DECKS;
  if (path === undefined) {
    return evolutionPilotDecks().available;
  }
  const pool = JSON.parse(readFileSync(path, "utf8")) as { decks: { mainDeck: string[]; eggDeck: string[] }[] };
  return [
    ...pool.decks.map(({ mainDeck, eggDeck }) => ({ deck: { mainDeck, eggDeck } })),
    ...evolutionPilotDecks().available,
  ];
}

function waitForMacrotask(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

async function playRecordedMatch({ seed, sampleRate }: PlayParams): Promise<RecordedMatch> {
  const decks = readDecks();
  const state = new GameState();
  const events: ServerEvent[] = [];
  const inputs: RecordedInput[] = [];
  const positions: Position[] = [];
  const failures: Record<PositionKind, number> = { main: 0, block: 0, counter: 0, decision: 0 };
  const bots: BotPlayer[] = [];
  const sampler = new SeededRandom({ seed: seed ^ 0x5bd1e995 });
  let progress = 0;
  const engine = new GameEngine(state, {
    seed,
    emit: (event) => {
      progress++;
      events.push(structuredClone(event));
      for (const bot of bots) {
        bot.onEvent(event);
      }
    },
    requestDecision: (seat, request) => {
      progress++;
      bots[seat]?.onDecisionRequested(request);
    },
    onActionSettled: (seat, type) => {
      progress++;
      bots[seat]?.onActionSettled(type);
    },
  });
  engine.snapshotContinuation.enable();
  const capture = (kind: PositionKind) => {
    if (kind !== "block" && kind !== "counter" && sampler.next() >= sampleRate) {
      return;
    }
    try {
      const snapshot = JSON.parse(JSON.stringify(snapshotGameEngine({ engine, allowContinuation: true })));
      positions.push({ kind, snapshot, events: events.length, inputs: inputs.length });
    } catch {
      failures[kind]++;
    }
  };
  const apply = (seat: Seat, intent: Intent) => {
    inputs.push({ seat, intent: structuredClone(intent), events: events.length });
    progress++;
    return engine.applyIntent(seat, intent);
  };
  for (const seat of [0, 1] as const) {
    const base = createEvaluationPolicy({ seed: seed + seat });
    const policy: BotPolicy = {
      ...base,
      chooseMainAction: (view, signal) => {
        capture("main");
        return base.chooseMainAction(view, signal);
      },
      chooseBlockResponse: (view, context, signal) => {
        capture("block");
        return base.chooseBlockResponse(view, context, signal);
      },
      chooseCounterResponse: (view, context, signal) => {
        capture("counter");
        return base.chooseCounterResponse(view, context, signal);
      },
      answerDecision: (view, request, signal) => {
        if (request.kind !== "mulligan") {
          capture("decision");
        }
        return base.answerDecision(view, request, signal);
      },
    };
    bots.push(
      new BotPlayer(seat, state, (intent) => apply(seat, intent), {
        policy,
        seed: seed + seat * 7919,
        thinkDelay: waitForMacrotask,
      }),
    );
  }
  for (const seat of [0, 1] as const) {
    const deck = decks[(seed * 3 + seat * 5) % decks.length]!.deck;
    engine.seatPlayer(seat, `conformance-${seat}`, { displayName: `Seat ${seat}`, deck });
  }
  engine.startMatch();
  let idleTurns = 0;
  let previous = progress;
  while (!state.gameOver) {
    await waitForMacrotask();
    if (state.turnCount > TURN_LIMIT) {
      await waitForEngineIdle({ progress: () => progress });
      if (!state.gameOver) {
        apply(0, { type: "surrender" });
      }
    }
    idleTurns = progress === previous ? idleTurns + 1 : 0;
    previous = progress;
    if (idleTurns > 5000) {
      throw new Error(`Conformance match ${seed} stalled`);
    }
  }
  await waitForEngineIdle({ progress: () => progress });
  for (const bot of bots) {
    bot.dispose();
  }
  return { events, inputs, positions, failures, state };
}

async function verifyPosition({ seed, match, position }: VerifyParams): Promise<void> {
  const events: ServerEvent[] = [];
  let progress = 0;
  const restored = restoreGameEngine({
    snapshot: position.snapshot,
    hooks: {
      seed,
      emit: (event) => {
        progress++;
        events.push(structuredClone(event));
      },
      requestDecision: () => {
        progress++;
      },
      onActionSettled: () => {
        progress++;
      },
    },
  });
  void restored.completion.catch(() => undefined);
  await restored.ready;
  for (const input of match.inputs.slice(position.inputs)) {
    await waitForEngineIdle({ progress: () => progress });
    expect(events.length).toBe(input.events - position.events);
    progress++;
    restored.engine.applyIntent(input.seat, structuredClone(input.intent));
  }
  await waitForEngineIdle({ progress: () => progress });
  expect(events).toEqual(match.events.slice(position.events));
  expect(restored.engine.state.toJSON()).toEqual(match.state.toJSON());
}

function readCount({ name, fallback }: { name: string; fallback: number }): number {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }
  const count = Number(raw);
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error(`${name} must be a positive integer: ${raw}`);
  }
  return count;
}

describe("continuation snapshot conformance", () => {
  it(
    "restores combat-window and mid-effect positions and matches every later event and the final state",
    async () => {
      const matches = readCount({ name: "SNAPSHOT_CONFORMANCE_MATCHES", fallback: 6 });
      const baseSeed = readCount({ name: "SNAPSHOT_CONFORMANCE_SEED", fallback: 20261032 });
      const sampleRate = Number(process.env.SNAPSHOT_CONFORMANCE_SAMPLE_RATE ?? 0.25);
      const verified: Record<PositionKind, number> = { main: 0, block: 0, counter: 0, decision: 0 };
      const continued: Record<PositionKind, number> = { main: 0, block: 0, counter: 0, decision: 0 };
      const failures: Record<PositionKind, number> = { main: 0, block: 0, counter: 0, decision: 0 };
      const perMatch: { seed: number; kinds: PositionKind[] }[] = [];
      for (let index = 0; index < matches; index++) {
        const seed = baseSeed + index;
        const match = await playRecordedMatch({ seed, sampleRate });
        for (const kind of POSITION_KINDS) {
          failures[kind] += match.failures[kind];
        }
        perMatch.push({
          seed,
          kinds: match.positions.map((position) => position.kind).filter((kind) => kind !== "main"),
        });
        for (const position of match.positions) {
          await verifyPosition({ seed, match, position });
          verified[position.kind]++;
          if (position.snapshot.continuation !== undefined) {
            continued[position.kind]++;
          }
        }
      }
      const reportPath = process.env.SNAPSHOT_CONFORMANCE_REPORT;
      if (reportPath !== undefined) {
        writeFileSync(
          reportPath,
          JSON.stringify({ matches, baseSeed, sampleRate, verified, continued, failures, perMatch }),
        );
      }
      expect(verified.block + verified.counter).toBeGreaterThan(0);
      expect(continued.decision).toBeGreaterThan(0);
    },
    readCount({ name: "SNAPSHOT_CONFORMANCE_TIMEOUT_MS", fallback: 600_000 }),
  );
});

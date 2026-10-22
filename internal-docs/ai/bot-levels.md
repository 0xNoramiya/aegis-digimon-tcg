# Practice bot difficulty and style

Practice bot joins accept optional `botDifficulty` and `botStyle` fields on
`POST /bot/join`. The owning room validates both fields, including requests routed
through the matchmaker. Missing difficulty uses Standard. Missing style is inferred
from recognizable archetype cards in the selected deck, with Balanced as the fallback.
Existing clients can continue sending only a deck and a reconnection token.

The lobby offers five difficulties and three styles, remembers validated selections
in local storage, and shows both selections beside the opponent preview. A reconnect
acknowledges the bot already seated and does not replace its policy or deck.

## Current policies

| Difficulty | Main policy                                                                    | Sampling                                     | Risk weights                                      |
| ---------- | ------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------- |
| Beginner   | Legacy evaluation                                                              | Temperature 5, top 5                         | Memory handover and both cross-zero costs halved  |
| Casual     | Legacy evaluation                                                              | Temperature 2.5, top 4                       | Style defaults                                    |
| Standard   | Legacy evaluation, or the configured experiment                                | Best score                                   | Removal and loss at 0.75                          |
| Expert     | Live paired root search with the Standard evaluator as root prior and fallback | 3 simulations, 3 candidates, up to 900 ms    | Style weights in root scoring and leaf evaluation |
| Master     | Live paired root search with the Standard evaluator as root prior and fallback | 20 simulations, 8 candidates, up to 1,450 ms | Style weights in root scoring and leaf evaluation |

The [holdout evaluation](#holdout-evaluation) shows Master above 0.65 against
legacy-balanced in every style, but most adjacent levels are closer than the 60–70%
target: Master is not clearly stronger than Expert, and Standard is not clearly
stronger than Casual. Expert and Master use a worker-thread search from
a settled Main snapshot. Search covers eligible Main actions; the selected action is validated
by the ordinary engine. Expert and Master also search their own block and Counter
windows (see [Snapshot coverage and combat search](#snapshot-coverage-and-combat-search)). A timeout, worker
failure, unsupported snapshot, or non-searchable position returns the Standard policy
answer. The worker pool is
bounded to at most two workers per API process and queues at most two additional
searches per worker.

Each search has one absolute deadline: the configured search budget after the
snapshot, but never later than 1,450 ms after the decision started
(`LIVE_SEARCH_DECISION_DEADLINE_MS`). All simulations share it. A simulation still
running at the deadline is aborted and discarded, and the search returns the best
result among complete paired samples. When the deadline cuts the first sample, the
search compares the candidates that sample already evaluated; the baseline is always
evaluated first. The simulation counts are upper bounds. If the pool has no answer
150 ms after the deadline, the policy returns the Standard answer and cancels the
worker search. The pool replaces a worker only if it still has not answered 2 s
later. Expert and Master policy decisions keep the 1,950 ms `BotPlayer` fallback
ceiling as a last resort.

Workers are prewarmed when the bot policy is created and when the bot turn starts.
A worker loads cards and computes the engine code fingerprint before it reports
ready, so the first simulation does not pay for them. A search that finds no warm
worker returns the Standard answer immediately. The headless level panel waits for
warm workers before it starts a match.

The live search policy counts its Standard-answer fallbacks as `deadline`,
`capacity` and `error` in `searchFallbacks`. These counts are separate from the
`BotPlayer` inference fallbacks. They appear in the level panel result and in
`bot.level.result`. A position where no paired sample reaches a valid cutoff counts
as `error`. Most `error` fallbacks came from engine snapshots that could not describe
a runtime callback: the snapshot failed before the search started. Leave-prevention
and "instead" replacements, digivolve and play cost modifiers, scoped static
primitives, player-wide filter matchers and Option grant activity now restore from
callback factories. On a 40-game Standard sweep over the development and DigiLab
decks, unsnapshottable Main decisions fell from 402 of 1,066 (38%) to 23 (2.2%),
with no restore failures. The current coverage is in
[Snapshot coverage and combat search](#snapshot-coverage-and-combat-search).

On the Oracle production host (one CPU, idle priority, host load below 8), 12 games
per level against legacy-balanced with the final shipped build measured:

| Level  | Decisions | p50      | p95      | p99      | Maximum  | Search fallbacks     |
| ------ | --------- | -------- | -------- | -------- | -------- | -------------------- |
| Expert | 166       | 933 ms   | 1,406 ms | 1,506 ms | 1,510 ms | deadline 2, error 5  |
| Master | 166       | 1,477 ms | 1,600 ms | 1,644 ms | 1,657 ms | deadline 12, error 0 |

Both are within the 2 s p95 target. Before round 2 and the block and Counter search,
the same check had Expert p95 1,055 ms (deadline 3, error 8) and Master p95 1,583 ms
(deadline 7, error 15). Master's `error` fallbacks are gone. Expert's 5 remaining
`error` fallbacks fell back to the Standard answer, and their cause is not isolated.
Expert p95 rose, possibly because block and Counter decisions now search too; this
is not confirmed.

Each simulation samples hidden opponent cards from public archetype catalogs using
publicly seen cards as evidence. It does not read the opponent's actual decklist.
Root action priors and leaf evaluation use the selected style. Both seats use the
Standard evaluator for rollout decisions. A 10-repetition Node 26.12 snapshot-restoration benchmark over
eight roots measured 10.95× aggregate speedup. This covers restoration, not complete
search simulation or production decision latency. A newer eight-root check measured
10.4× restoration speed and 2.0× for a two-turn simulation on the default-deck replay;
an independent 65-input replay measured 11.1× restoration and 1.9× simulation speed.
Both simulations matched their replay-based outcomes exactly. The 10× per-simulation
target remains unmet. A one-block Master/Expert screen with the previous 28/1,750
budget had 10 valid games and only one complete block, so it is not calibration evidence.

### Search tuning

Search runs only on Main decisions, about 14 per game; about 94% of them reach the
worker. It is a flat root search: after the root action, both seats follow the
Standard evaluator until the bot's next Main phase, and `evaluateSearchPosition`
scores the leaf.

`searchPairedRoot` replaced the earlier PUCT search for live play. It keeps the
baseline answer and up to `PAIRED_ROOT_CANDIDATE_LIMIT` (8) actions by prior. Each
paired sample evaluates every remaining candidate with the same determinization
seed. Sequential halving then keeps the better half. The simulation count caps
single rollouts. At 6 rollouts and 8 candidates, the search compares 6 actions on
one shared sample. At tiny budgets, PUCT mostly followed the priors: its visit counts
and its choice barely depended on rewards.

Offline regret, from 119 captured Master roots with 64 shared seeds per action
(32 seeds to choose, 32 held out to score), in leaf-value units:

| Rollouts | Baseline only | PUCT  | Paired, 8 candidates |
| -------- | ------------- | ----- | -------------------- |
| 4        | 0.043         | 0.042 | 0.021                |
| 6        | 0.043         | 0.031 | 0.018                |
| 12       | 0.043         | 0.030 | 0.013                |
| 20       | 0.043         | 0.025 | 0.011                |

Rollout cost (47 Master roots, 8 rollouts each, a loaded local machine): before,
134 to 153 ms per rollout: snapshot clone 10 to 12 ms, restore 10 to 11 ms, belief
sampling 3 to 4 ms and continuation 111 to 125 ms. After, 74 to 90 ms: no clone,
restore 7 to 9 ms, belief sampling 2 to 2.5 ms and continuation 64 to 78 ms. The leaf
score takes 0.15 ms. The rollouts share one immutable snapshot, and continuation
engines skip hand affordances and snapshot tracking of re-materialized effects. With
the same search algorithm, every root kept the same action and rewards. Expect about
2.5× this cost on the production host.

Strength screens use simulation-bound budgets, so machine load cannot change their
results. Each row has 24 paired four-game blocks from the development pool, blocks
4000 to 4023, against legacy-balanced:

| Row                                     | Points | 95% interval |
| --------------------------------------- | ------ | ------------ |
| Expert, residual only, no search        | 0.46   | 0.37–0.55    |
| Expert, PUCT, 6 rollouts                | 0.52   | 0.41–0.64    |
| Expert, paired, 6 rollouts              | 0.58   | 0.50–0.67    |
| Expert, paired, 12 rollouts             | 0.59   | 0.51–0.68    |
| Master, residual and planner, no search | 0.47   | 0.37–0.56    |
| Master, paired, 20 rollouts             | 0.60   | 0.52–0.69    |
| Expert Aggressive, paired, 6 rollouts   | 0.55   | 0.44–0.66    |
| Master Aggressive, paired, 20 rollouts  | 0.65   | 0.54–0.75    |

Paired block differences: paired 6 minus PUCT 6 is +0.06 (−0.07 to +0.20); paired 6
minus no search is +0.13 (+0.01 to +0.24); 12 minus 6 rollouts is +0.01 (−0.08 to
+0.10). These rejected changes showed no gain: leaf weights refit on 6,076
Standard self-play positions (−0.02), the Standard policy as Expert baseline (−0.04),
two rollout turns at twice the cost (−0.05 after 10 blocks) and development decks in
the belief catalog (−0.08 after 12 blocks). Adjacent screens with the final build:
Expert 6 against Standard scored 0.57 (0.48–0.66), and Master 20 against Expert 6
scored 0.56 (0.46–0.66). Root captures and snapshot sweeps used development seed
blocks 3800 to 3910, and the leaf refit used blocks 5000 to 5599. Raw evidence is in
the ignored `.local/bot-search-tuning.json`.

The shipped rows keep Expert at 6 rollouts and 900 ms and Master at 20 rollouts and
1,450 ms. At about 60 to 100 ms per production rollout, Expert should now complete
its 6 rollouts before its deadline, and Master completes about 12 to 18. These
rollout counts are estimates; only decision latency was measured in production. On
the development pool, Master reached 0.65 against legacy only in Aggressive, without
a lower bound above 0.60, and it was not clearly stronger than Expert. More rollouts in this root-only search have not shown a measurable gain. A stronger Master needs a better
evaluator or search beyond Main decisions.

Difficulty is resolved in `apps/api/src/bot/levels/createLevelBotOptions.ts` and the
configuration table lives in `BOT_LEVEL_CONFIGS.ts`. Style preserves the existing
serialized `balanced`, `aggressive` and `defensive` values. Residual scoring starts
from the selected style's evaluator. Planner and human-panel rules scale their
attack, removal, loss, development and memory terms relative to Balanced.

Temperature sampling is deterministic for the bot seed. It considers only the top-k
eligible scores, retains recognized lethal attacks, and excludes moves at or below
the action threshold. Zero temperature preserves greedy selection. The level
temperature is multiplied by a style scale in `STYLE_TEMPERATURE_SCALES.ts`:
Balanced 1, Aggressive 5 and Defensive 0.5. Aggressive scores have wide margins,
so the same temperature barely changes its choices. Defensive loses strength fastest
under sampling. Level weight scales live in `weightScales` in `BOT_LEVEL_CONFIGS.ts`.
They apply on top of the style weights and do not mutate the profile objects.

### Simulation speed

The 10× per-simulation target is not met. Snapshot restoration alone is 11–12× faster
than replaying the prefix. A full simulation is only 2.6–2.7× faster, and the rollout
continuation cannot close that gap on its own.

**Where a rollout spends its time.** A CPU profile of 47 captured Master roots, with 16
rollouts each, split the time as follows (startup excluded):

| Work                                        | Share  |
| ------------------------------------------- | ------ |
| Continuous-effect recompute (derive)        | 34%    |
| Continuous-state publish (projections)      | 19%    |
| Other engine work (timing windows, effects) | 26%    |
| Snapshot restore                            | 11%    |
| Garbage collection                          | 5.5%   |
| Bot policy, view and observation            | 3.5%   |
| Belief sampling                             | 1.1%   |
| Leaf evaluation                             | < 0.1% |

A rollout makes about 8 intents and 17 policy calls, but the engine runs about 98
continuous recomputes, mostly at the opening of each timing window. Bot scoring costs
about 0.2 ms per rollout. Rollouts have no presentation timers, narration, idle waiting
or logging. Engine work is about 90% of a rollout, and the speed work cannot change
`apps/api/src/engine`.

**Engine opportunities, measured but not applied.**

| Change                                                                           | Measured potential                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skip a continuous recompute when nothing it reads has changed since the last one | 77% of recomputes start from unchanged schema state, and they take about 60% of recompute time: at most about 32% of a rollout. Skipping on schema state alone changed 3 of 47 roots. The dirty signal must also cover engine ledgers that are not in the schema. |
| Index card instance to permanent instead of scanning in `findPermanent`          | 8.5% of a rollout, inclusive                                                                                                                                                                                                                                      |
| Create scoped effect primitives lazily per effect context                        | 5% self time                                                                                                                                                                                                                                                      |
| Faster runtime graph decode during restore                                       | 8.5% of a rollout                                                                                                                                                                                                                                                 |

All four together leave at least a third of today's cost, so they would give at most
about 3×. Reaching 10× needs a different rollout model, not engine tuning.

**Why the benchmark cannot reach 10×.** The replay-based and snapshot simulations run
the same continuation, so the full-simulation factor can never be larger than the
restore factor. In the 10-repetition benchmark below, the replay prefix took 59 ms per
root and the restore took 5.3 ms. A 10× simulation would need a continuation of at most
0.6 ms. Today it takes 35–47 ms.

The 10-repetition Node 26.12 benchmark ran on the default-deck replay, with 8 roots
(`snapshot-restoration` mode). Load averages were 5–18, so the absolute times are noisy.

| Runtime                  | Restore factor | Simulation factor | Replay / snapshot simulation |
| ------------------------ | -------------- | ----------------- | ---------------------------- |
| Before the speed changes | 11.1×          | 2.71×             | 110 ms / 40.5 ms             |
| After the speed changes  | 12.1×          | 2.63×             | 140 ms / 53.3 ms             |

**Live search rollouts.** The `captured-search-roots` benchmark mode reads captured
search tasks. These are v8-serialized `BotSearchTask` files, written by wrapping
`LiveSearchWorkerPool.prototype.run`. The mode replays each task through
`runBotSearchTask` with a JSON-transferred copy and reports the time per rollout and
per phase. It also records per-rollout digests: action, reward, reason and a hash of
the final state. It fails if any repetition differs from the first. With
`referenceFile`, it also compares the digests with an earlier report.

On the 47 roots, with 8 rollouts and 8 candidates per root:

- **Quiet machine, before the changes:** 21.6 ms per rollout. Restore took 2.5 ms,
  belief sampling 0.7 ms, continuation 18.3 ms and the leaf 0.15 ms.
- **10 repetitions after the changes, load 12–18:** a median of 80 ms per rollout.
  Restore took 7.6 ms, belief sampling 2.5 ms, continuation 70 ms and the leaf 0.13 ms.
  Single repetitions ranged from 59 to 332 ms.

All 47 roots kept the same action, search report, per-rollout rewards and final-state
hashes as before the changes.

**Worker transfer.** The worker pool now posts the task as one JSON string instead of
a structured clone. Each decision posts about 355 KB. A structured clone costs
7.1 ms: 2.8 ms on the game thread and 4.4 ms in the worker. JSON costs about 2.6 ms:
0.6 ms to stringify on the game thread and 1.9 ms to parse in the worker. Search tasks
must stay JSON-safe: finite numbers only, and no meaning in `undefined` fields. Today
the only fields JSON drops are undefined `level` values in the root observation, and
the root checks already compare the observation through JSON.

### Snapshot coverage and combat search

**Continuation snapshots.** A search snapshot no longer needs a settled Main
position. When the live search policy is created, it turns on the engine's
`snapshotContinuation` recorder. At each engine input (intent, combat-window expiry,
match-timer expiry, disconnect, reconnect) the recorder first tries a settled
snapshot. If that works, the snapshot becomes the new anchor. Then it records the
input and the number of events emitted since the anchor. `snapshotGameEngine` with
`allowContinuation` returns the settled snapshot when it can. Otherwise it returns the
last anchor plus the recorded inputs. The suffix is capped at 64 inputs; past that
the anchor is dropped until the next settled input.

`restoreGameEngine` returns `ready` and `redeliverOpenPrompts`. For a continuation
snapshot it restores the anchor, mutes the caller's hooks and applies each recorded
input once the engine is idle. Before each input, and at the end, it checks the event
count against the recording; a mismatch rejects `ready`. `redeliverOpenPrompts`
then re-emits the open attack and combat-window events and re-requests the pending
decision, so restored bots answer the same window. A settled snapshot resolves
`ready` at once, so Main search is unchanged. `runReplayContinuation` awaits `ready`
and calls `redeliverOpenPrompts` after the bots start. This design replays inputs
instead of serializing the suspended combat and effect code. Restoring a combat
position costs the anchor restore plus the replayed inputs.

**Other fixes.** The boundary check failed whenever the bot was called from an async
chain that had run a triggered effect: `continuousScope` read `false` there, which is
not a continuous pass. It now fails only when the store is `true`. This was 158 of 161
unsnapshottable Main decisions in a 40-game sweep. A borrowed-effect lender source
(BT11-112, BT24-102 and similar) now restores from a `lender-card-source` runtime
object. Settled positions that still hold a callback without a factory (later-entrant
watchers, some restriction filters, `() => true` timing gates) fall back to a
continuation from the last good anchor.

**Sweep.** `apps/api/.local/snapshot-agent/sweep.ts` plays Standard against Standard
on the development pool and DigiLab decks. At each decision it snapshots, restores,
awaits `ready` and compares the restored state with the live state. Without
continuations, 200 games (development blocks 8100 to 8149) left 25 of 5,219 Main
decisions (0.48%) unsnapshottable, all from callbacks without factories. With
continuations, 40 games (blocks 8030 to 8039) had no snapshot, restore or state
failures in 1,058 Main, 19 block and 1,792 mid-effect decision positions. Six of the
Main positions needed a continuation; their suffix median was 21 inputs. Decision
positions had a median suffix of 3 inputs and a maximum of 38. These seeds had no
Counter window.

**Conformance.** `continuationSnapshotConformance.test.ts` plays Standard bot matches
with continuation recording. At sampled Main and decision positions, and at every
block and Counter window, it takes a snapshot, restores it, applies the same later
inputs and requires every later event and the final state to match. The default run
covers six seeded matches. A 150-match run over the development pool (seeds from
1,900,032,800) verified 635 Main, 78 block, 7 Counter and 618 mid-effect decision
positions with no mismatch. Three positions (2 Main, 1 decision) could not be
captured, which happens when no anchor exists within the 64-input limit.

**Block and Counter search.** `createLiveSearchPolicy` now overrides
`chooseBlockResponse` and `chooseCounterResponse`. It asks the level policy for a
baseline and the Standard policy for the fallback. When the bot owns the open block
or Counter window, `createCombatRootWindow` builds the root from the same training
window the rollout bots produce. The search uses the paired-root search, the shared
deadline and the same fallback counts as Main. Root action order must match the
rollout window, so index 0 is "decline" rather than the baseline; ties therefore
favor declining. Archetype sampling (`determinize` and `determinizeFromArchetypes`)
now also accepts the observer's own block or Counter window, through
`isHiddenSamplingWindow`. A search that ends without a complete sample after the
shared deadline now counts as `deadline` instead of `error`
(`getSearchFailureFallback`). The root rollout still ends at the bot's Main two turns
after the root turn. For a block window that is the bot's second Main after the
attack, so combat rollouts are longer than Main rollouts.

**Strength screen.** Simulation-bound (deadlines raised to 60 s and the policy
ceiling to 120 s in a frozen dist copy), 32 paired four-game blocks per row on the
development pool against legacy-balanced, Balanced style. "Without" returns the level
policy's own block and Counter answer, as before this change.

| Row                        | Points | 95% interval |
| -------------------------- | ------ | ------------ |
| Expert, with combat search | 0.586  | 0.499–0.673  |
| Expert, without            | 0.578  | 0.492–0.665  |
| Master, with combat search | 0.703  | 0.632–0.774  |
| Master, without            | 0.695  | 0.623–0.767  |

Expert blocks were 8040 to 8071 and Master blocks 8100 to 8131. In each pair only one
block differed, and the paired difference was +0.008 (−0.007 to +0.023) for both
levels. Block windows are rare against legacy-balanced: Expert searched 24 block
windows in 128 games and changed the Standard answer 5 times; Master searched 16 and
changed it once. No game reached a Counter window. The screen shows no measurable
gain and no loss. Neither arm had a search fallback.

**Latency and fallback causes.** With the shipped budgets on a loaded local machine
(one panel worker, 32 games per level, blocks 8200 to 8207 and 8300 to 8307):

| Level  | Main p50 | Main p95 | Main max | Block searches | Block p50 | Block max | Fallbacks  |
| ------ | -------- | -------- | -------- | -------------- | --------- | --------- | ---------- |
| Expert | 247 ms   | 562 ms   | 938 ms   | 6              | 548 ms    | 772 ms    | none       |
| Master | 969 ms   | 1,463 ms | 1,600 ms | 5              | 1,455 ms  | 1,502 ms  | deadline 1 |

Block latency includes the baseline and fallback answers. The block sample is small.
Master's 128 simulation-bound games had no `error` fallback, and the time-bound games
had one `deadline`. Their invalid rollouts were the in-flight rollouts cut at the
deadline. On the slower production host, a deadline that cuts the baseline's first
rollout used to throw "No valid paired samples reached the root" and count as
`error`. That is the likely source of Master's production `error` fallbacks besides
snapshot failures, but it is not verified in production.

### Lower-level and style calibration

Beginner, Casual and the Defensive weights were tuned on the development pool only
(training usage), with seed blocks outside 3000–3700. The final rows used 128 fresh
four-game blocks each (512 games), from the shipped source configuration. Rates are
points rates with 95% block-mean intervals.

| Comparison         | Aggressive       | Balanced         | Defensive        |
| ------------------ | ---------------- | ---------------- | ---------------- |
| Standard vs legacy | 0.45 (0.40–0.49) | 0.50 (control)   | 0.49 (0.45–0.53) |
| Casual vs legacy   | 0.34 (0.30–0.38) | 0.34 (0.30–0.38) | 0.36 (0.32–0.41) |
| Beginner vs legacy | 0.19 (0.15–0.22) | 0.15 (0.12–0.19) | 0.14 (0.11–0.16) |
| Standard > Casual  | 0.66 (0.62–0.70) | 0.66 (0.62–0.70) | 0.64 (0.60–0.68) |
| Casual > Beginner  | 0.67 (0.62–0.71) | 0.71 (0.67–0.75) | 0.67 (0.63–0.72) |

At Standard, the style metrics are:

| Style      | Security attacks per turn | Memory passed per turn | Game length (turns) |
| ---------- | ------------------------- | ---------------------- | ------------------- |
| Aggressive | 0.61                      | 2.08                   | 16.2                |
| Balanced   | 0.50                      | 1.28                   | 18.9                |
| Defensive  | 0.43                      | 1.47                   | 20.8                |

Pooled over 416 blocks, Standard Aggressive scores 0.46 (0.44–0.48) against legacy.
Over 256 blocks, Standard Defensive scores 0.48 (0.45–0.51). Both are within about
5 points of Balanced. Defensive passes more memory than Balanced. It also attacks
Digimon more often, so its total attacks per turn can exceed Aggressive's; only
security attacks are lower. Blocks are too rare in this pool to separate the styles.
Beginner is weaker against legacy than the rough 0.20–0.25 goal, and Balanced
Casual > Beginner is slightly above 0.70. Expert and Master Defensive use the new
weights but were not re-measured. The evidence summary is in ignored
`.local/bot-tuning-lower-levels.json`.

### Round 2 calibration

Round 2 widened the ladder where the holdout found it too flat. Three settings
changed:

- **Expert** searches 3 candidates with 3 rollouts, instead of 8 candidates with 6.
  The candidate limit is now a per-level field, `searchCandidateLimit`.
- **Standard** discounts removal and loss to 0.75.
- **Beginner** halves memory handover instead of removing it.

Master, the style weights, the style temperature scales and the leaf evaluation are
unchanged. The 1,450 ms decision deadline and the 1,950 ms policy ceiling are
unchanged.

All rows use the development pool (training usage) and simulation-bound budgets. In
frozen copies, the decision deadline was raised to 60 s, the policy ceiling to 120 s
and the search budgets to 60 s, so machine load could not change results. Screens
used seed blocks 6000 to 6363. The final rows used 64 fresh four-game blocks each
(7000 to 7063), on a build that includes the engine digivolve legality change and
block and Counter search. Rates are points rates with 95% block-mean intervals.

Adjacent levels, same style on both sides (target 0.60–0.70):

| Step              | Aggressive       | Balanced         | Defensive        |
| ----------------- | ---------------- | ---------------- | ---------------- |
| Casual > Beginner | 0.65 (0.59–0.72) | 0.61 (0.56–0.67) | 0.56 (0.50–0.63) |
| Standard > Casual | 0.66 (0.60–0.72) | 0.61 (0.55–0.67) | 0.61 (0.55–0.68) |
| Expert > Standard | 0.66 (0.60–0.72) | 0.60 (0.54–0.66) | 0.49 (0.43–0.54) |
| Master > Expert   | 0.67 (0.61–0.72) | 0.63 (0.58–0.69) | 0.55 (0.49–0.62) |

Against legacy-balanced:

| Level    | Aggressive       | Balanced         | Defensive        |
| -------- | ---------------- | ---------------- | ---------------- |
| Beginner | 0.20 (0.14–0.25) | 0.29 (0.23–0.34) | 0.21 (0.16–0.27) |
| Casual   | 0.32 (0.26–0.37) | 0.36 (0.31–0.42) | 0.34 (0.28–0.39) |
| Standard | 0.44 (0.37–0.51) | 0.50 (0.43–0.57) | 0.48 (0.42–0.55) |
| Expert   | 0.63 (0.57–0.69) | 0.59 (0.53–0.65) | 0.44 (0.39–0.50) |
| Master   | 0.68 (0.62–0.75) | 0.66 (0.60–0.73) | 0.61 (0.55–0.67) |

Results against the targets:

- **Adjacent steps:** met for Aggressive and Balanced at every step. Balanced Expert >
  Standard sits on the lower edge (0.60). Missed for Defensive: Casual > Beginner by
  4 points, Expert > Standard by 11 and Master > Expert by 5.
- **Style cost** (style minus Balanced, both against legacy):

  | Level    | Aggressive | Defensive |
  | -------- | ---------- | --------- |
  | Beginner | −9.0       | −7.4      |
  | Casual   | −4.7       | −2.7      |
  | Standard | −5.9       | −1.6      |
  | Expert   | +3.5       | −15.2     |
  | Master   | +1.6       | −5.9      |

  Within 5 points: Casual, Expert and Master Aggressive, and Casual and Standard
  Defensive. Beginner in both styles, Standard Aggressive, and Expert and Master
  Defensive cost more. With intervals of about ±0.06 per row, costs between 5 and
  7 points are not resolved.

- **Security attacks per turn:** ordered Aggressive > Balanced > Defensive at every
  level (Standard 0.61, 0.50, 0.43; Expert 0.62, 0.52, 0.44; Master 0.63, 0.55, 0.50).
- **Master Balanced against legacy:** 0.66 with a lower bound of 0.603. That passes
  the 0.65 point target only narrowly, and the lower bound clears 0.60 by less than
  one point.
- **Production safety:** the deadlines are unchanged. Production latency was
  measured again on the final build (see [Holdout evaluation](#holdout-evaluation)).

What the screens showed (32 to 64 blocks per row; raw evidence in the ignored
`.local/bot-calibration-round2.json`):

- **Master did not get stronger.** Against legacy, Master Balanced stayed within
  3 points of 0.67 with each of these changes: the Standard policy as baseline, a
  leaf scaled by 2 or by 0.5, and 32 rollouts. Roots average 5.6 actions, so a larger
  candidate limit rarely changes anything.
- **Balanced Expert pulls against itself.** With 6 rollouts and 8 candidates, Expert >
  Standard was about 0.63 and Master > Expert about 0.56. With 4 and 4, both were
  about 0.58–0.62. On the final blocks, 4 and 4 gave 0.59 and 0.61. The shipped 3 and
  3 gave 0.60 and 0.63, keeping both steps at or above 0.60.
- **Sampling does not weaken Standard.** A temperature of 0.5 or 1 with top 2 changed
  nothing measurable. Removal and loss at 0.75 lowered Standard Balanced by about
  3 points against legacy. It raised Expert > Standard by about 2 points and lowered
  Standard > Casual by about 3.
- **Beginner needed to get stronger.** On the new build, Casual > Beginner was 0.70 to
  0.75. Halving memory handover, instead of removing it, brought it to 0.61–0.66 on
  the screen blocks.
- **Defensive leaf changes did not help.** A Defensive leaf that weights its own
  security less moved Expert and Master Defensive by −5 to +1 points.

Defensive search is the main open problem. Defensive Expert falls below Standard
Defensive, and the cause was not isolated. Fixing it would need a Defensive-specific search budget or leaf, or a
stronger leaf evaluator overall. The two pools still disagree by several points per
row, so treat any single-pool step within ±0.05 of a target edge as unresolved.

### Holdout evaluation

The final holdout check ran once, after all tuning, on the shipped build with live
decision deadlines. It used the frozen holdout pool
(`tools/bot-evolution/holdout-pool.json`, holdout usage) at seed block offset 2784,
so no seed overlaps the earlier holdout run (blocks 0 to 2783). Only 1,312 unused
blocks remained, which allows 15 paired four-game blocks per comparison. All 1,620
games were valid. The holdout decks were seen in the earlier run, so this check is
not fully independent. The machine was shared with other workloads (load average 12
to 28), which can shorten time-limited Expert and Master search.

This check is underpowered: each row has an interval of about ±12 points, so it
cannot confirm a 60–70% step or a 5-point style cost. It is a sanity check. The
primary evidence for spacing and style cost is the 64-block development confirmation
in [Round 2 calibration](#round-2-calibration). Both are recorded in
`apps/api/src/bot/levels/level-calibration.json`, and `levelCalibration.test.ts`
fails when the shipped levels, style temperature scales or style weights drift from
it.

Against legacy-balanced:

| Level    | Aggressive       | Balanced         | Defensive        |
| -------- | ---------------- | ---------------- | ---------------- |
| Beginner | 0.35 (0.26–0.44) | 0.40 (0.28–0.52) | 0.30 (0.19–0.41) |
| Casual   | 0.50 (0.42–0.58) | 0.45 (0.32–0.58) | 0.53 (0.38–0.69) |
| Standard | 0.40 (0.26–0.54) | 0.43 (0.33–0.53) | 0.47 (0.33–0.60) |
| Expert   | 0.58 (0.42–0.75) | 0.43 (0.29–0.58) | 0.52 (0.40–0.64) |
| Master   | 0.70 (0.58–0.82) | 0.67 (0.56–0.77) | 0.75 (0.61–0.89) |

Adjacent levels, same style on both sides:

| Step              | Aggressive       | Balanced         | Defensive        |
| ----------------- | ---------------- | ---------------- | ---------------- |
| Casual > Beginner | 0.55 (0.41–0.69) | 0.62 (0.51–0.72) | 0.53 (0.44–0.63) |
| Standard > Casual | 0.48 (0.34–0.62) | 0.53 (0.38–0.69) | 0.57 (0.48–0.66) |
| Expert > Standard | 0.68 (0.57–0.80) | 0.60 (0.47–0.73) | 0.55 (0.42–0.68) |
| Master > Expert   | 0.53 (0.39–0.68) | 0.62 (0.52–0.71) | 0.55 (0.41–0.69) |

What the holdout check shows:

- **Master Balanced** scores 0.67 against legacy, above the 0.65 target, but its lower
  bound is 0.56. It agrees with the development result (0.66, lower bound 0.603) and
  does not confirm the lower bound on its own.
- **Expert Balanced against legacy** is 0.43, against 0.59 on the development pool and
  no higher than Standard. The direct Expert > Standard Balanced step is still 0.60.
  The cause may be noise, the deck mix, or live deadlines under load. It is an open
  risk.
- **Adjacent steps:** only Casual > Beginner Balanced, Expert > Standard Aggressive
  and Master > Expert Balanced have intervals above 0.50. The holdout does not
  contradict the development spacing, and it cannot confirm it.

The earlier 32-block holdout run (offset 0) measured the configuration before round 2
and is superseded. It had Master Balanced at 0.75 (0.67–0.83) against legacy, and
only Casual > Beginner and Expert > Standard Balanced inside 0.60–0.70.

## Seating and experiments

Scenario policies take precedence, followed by the heuristic/checkpoint environment
overrides, followed by the Standard-only experiment, followed by the selected level.
Explicit difficulty outside Standard cannot receive an experiment arm. The selected
style also applies inside candidate experiment policies. See
[bot experiments](bot-ab-experiment.md) for configuration and result records.

Tournament seating resolves Standard with the persisted `bot_profile` style and
retains injected test driver options. The practice and tournament `bot.seated` events
include `botDifficulty` and `botStyle`.

Completed level-resolved practice and tournament matches emit `bot.level.result` with
the difficulty and style, win/draw/loss, opponent surrender, game length in turns,
policy name, per-decision p50/p95/maximum latency, inference fallback counts, and
live search fallback counts for Expert and Master.
Standard experiment results also include the experiment and arm identifiers. Scenario
fixtures and custom model policies are excluded from this level result event.
Production log aggregation and p95 measurement are still required.

No database schema changes are involved. This configuration is local source behavior;
production deployment and promotion have not been performed.

## Remaining verification

Counterfactual fixtures cover the legacy, projected, experiment and all level/style
policies in both seats across Main, breeding, block, counter, alliance, evade,
barrier and effect decisions. They also prove that an injected opponent-hand reader
changes the answer. This fixture coverage is not a universal proof for every card
position, and future search paths must join the same suite.

Configured level pacing counts legal actions. A forced own-phase move uses one fifth
of the level delay; branching turns keep the level minimum and approach the full
maximum at eight candidates. Narration and client presentation barriers still apply.
The injected delay receives the requested range for deterministic pacing tests.

[Measurement tooling](../../tools/bot-evolution/README.md#difficulty-and-style-measurement)
provides a frozen evaluation pool, training guards, block-based ratings, style
measurements and a generalized SPRT screen. The screen does not certify the current
strength ordering. Special Main action and decision purpose coverage have focused
regressions. The default fuzzer corpus has zero fixed-default decisions for every
level and style, and the exhaustive matrix has 0 in 37,727 (see
[Fixed-default measurement](#fixed-default-measurement)). A passing
Standard promotion SPRT remains unverified. Snapshot continuation matches all later
events and final state over 1,000 seeded randomized Main positions. Continuation
snapshots match them over 1,338 positions from 150 Standard games, including 78 block,
7 Counter and 618 mid-effect decision positions (see
[Snapshot coverage and combat search](#snapshot-coverage-and-combat-search)). Counter
coverage is thin, and full random-action-trace conformance remains unverified. The 10×
simulation-speed target is not met: restoration is 11–12× faster, but a full
simulation is only about 2.6× faster (see [Simulation speed](#simulation-speed)). During tuning, Beginner Aggressive offered a BT3-037
digivolution onto BT4-115, and the engine rejected it as `invalid-evolution`. The
engine was right: BT4-115 can only digivolve into a Digimon with [Lucemon] in its
name. The bot rebuilt digivolve legality from card data and missed that restriction.
The bot view now asks the engine's own `validateDigivolve` for each hand Digimon and
base during the bot's Main phase, and uses the cost the engine would charge. The
card-data rebuild remains only for hand-built views without an engine. The
regression `bot-skips-digivolution-forbidden-by-base` covers it. After the fix, the
exhaustive audit matrix (4,860 matches over every level and style) and the exhaustive
default fuzzer (324 matches) had no rejected intent.

Lobby layout was inspected with Orca Browser at 1440 by 1000 and 390 by 844 in light
and dark themes. Captures remain in ignored `.local/bot-captures/`.

## Fixed-default measurement

A fixed default is a decision answered by a hard-coded default, or by a tie that only
candidate, label or index order breaks. Every answer path reports a basis: `scored`,
`forced`, `rule`, `freeEffect` or `protection`, or one of the fixed-default bases
`unscoredOptional`, `unscoredSelection`, `unscoredChoice` and `tieByOrder`. The audit
answers each card selection, target, card order, trigger order and option choice a
second time with the offered entries reversed. A different answer counts as
`tieByOrder`. It does not count when both answers pick candidates with the same card
and state, or triggers with the same timing, text and summary.

Run the audit over the battle fuzzer corpus:

```sh
pnpm fuzz:battles --report-fixed-defaults [--levels standard,expert] [--styles balanced] [--exhaustive] [--output file.json]
```

To run from source without rebuilding `dist`, from `apps/api`:

```sh
npx tsx --tsconfig ../../packages/shared/tsconfig.json --conditions=development src/bot/battleFuzzerCli.ts --report-fixed-defaults
```

Both seats play the selected level and style over the fuzzer deck matrix. The report
lists counts by decision kind and basis, with card ids and examples for each fixed
default. The command exits with status 1 while any fixed default remains. Run one
level per process for `--exhaustive`; one process for all 15 combinations ran out of
memory. Expert and Master are measured with their non-search policy: Residual, and
Residual with the turn planner for Master. Live search only chooses Main actions;
every other decision uses the same answer path.

| Corpus (Node 26.12)                       | Matches | Non-trivial decisions | Fixed defaults |
| ----------------------------------------- | ------- | --------------------- | -------------- |
| Before: default CLI corpus (2026-10-21)   | 270     | about 1,100           | 327            |
| Before: 600-match spread (2026-10-21)     | 600     | about 4,600           | 1,334          |
| After: default CLI corpus (2026-10-21)    | 270     | 968                   | 0              |
| After: `--exhaustive` matrix (2026-10-21) | 4,860   | 31,743                | 27             |
| After: `--exhaustive` matrix (2026-10-22) | 4,860   | 37,727                | 0              |

The "before" rows come from an earlier one-off audit with the same definition. The
2026-10-22 row ran one process per level, with the CLI's exhaustive options and
`NODE_ENV=test` to silence engine logging. Each level played 972 matches with no
rejected intent, error or timeout. The non-trivial count is higher than on
2026-10-21 because other changes in the branch moved the corpus. Before the
2026-10-22 fixes, the same run found 32 fixed defaults for Beginner alone.

The residue was removed with these rules:

| Residue                                                                                | Rule                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger order: BT6-030's printed When Attacking effect against one BT6-096 granted     | With equal value, a printed effect of the source card resolves before an effect another card created. The trigger key tells them apart.                                                                    |
| BT9-095 "may attack your opponent" prompt with no memory figure                        | An optional prompt with the `attackSource` selection context is scored like Blitz: the best ready Digimon's player attack.                                                                                 |
| BT10-019 choice between returning MetalGreymon and revealing 4                         | Effect summaries count a card returned from the controller's trash to hand, and cards a reveal adds to hand or plays, as uncertain gains.                                                                  |
| BT6-068 "trash 1 card in your hand. If you do, return …"                               | A discard whose clause returns a card from the trash to hand is worth one card draw against the discarded card's value. The engine summary covers only the trash action, so the bot reads the clause text. |
| BT10-026 placement: a hand copy against a copy under a Tamer, or two different sources | A hand card now uses the same card value as other cards, minus the hand-use bonus. A card the clause names in brackets, such as [Deckerdramon], wins a tie.                                                |
| Equal opposing vanilla Digimon, such as ST1-02 and BT1-009                             | Opposing Digimon without card text and with the same printed stats are identical candidates, unless a visible card shares one of their traits. Identical candidates are ordered by id.                     |
| Three BT10-111 copies that differ only in Rush or DigiXros Substitute                  | Rush and DigiXros Substitute do not count outside their controller's turn. On that turn, a ready Rush Digimon wins a tie.                                                                                  |

These are static rules, not proofs of the best play. The vanilla rule ignores hidden
cards that name one of those Digimon, and the discard rule cannot see whether the
trash holds a card the clause can return.

## Scored decisions and special Main actions

The projected evaluator and residual policy enumerate DNA Digivolution, App Fusion
and Link declarations alongside ordinary Main actions. DNA scoring includes the
resulting body, draw and a ready attacker, with a deduction for consumed materials.
Link scoring includes granted DP and linked effects, with a deduction for field
materials. The approximate Master planner still omits these transitions; its bonus
can influence an ordinary action competing with a special action.

Follow-up choices use public card values, selection goals and effect summaries.
Removal, recovery and self-cost choices have real-engine regression scenarios.
Optional effects are scored from their summary, including an uncertain summary: a
positive known part accepts and a net known cost declines. A free effect whose known
parts score zero is accepted under the explicit free-effect rule. Counter choices
carry their source identity and effect summaries. Blast Digivolution and Blast DNA
are scored by the visible resulting body, not by a flat activation weight. Blitz is
scored as an attack on the opponent. Evade compares the Digimon's value with any
printed On Deletion payoff. This is static scoring, not an engine rollout or a proof
of optimal counter selection.

The engine marks deletion-prevention prompts with the `protect` selection goal:
Armor Purge, Fragment, Scapegoat, the Material Save prompt and printed "prevent
leaving the battle area" replacements. The bot pays when the protected Digimon is
worth more than the price. Before this, an unmarked Armor Purge prompt over the bot's
own Digimon was declined. Other engine metadata used for scoring:

- A placement into the player's own security counts as recovery.
- A security search that plays a card counts as one play and one lost security card.
- An optional cost reduction carries the reduction as memory gain.
- A top or bottom security choice names the placed Digimon in `affectedPermanentIds`.

Tied scores are broken by secondary values, never by offer order:

- Units: ready before suspended, then keywords, Security Attack, card text, rarity
  and colors, then shared traits with the same side's public board and, for the
  opponent, its trash. Tamers are valued by play cost instead of their zero DP.
- Cards: a hand card is worth more than the same card in trash, so costs are paid
  from trash first.
- Card order: the deck and the top of a digivolution stack get the strongest card
  first; the stack bottom gets the weakest card first.
- Options: an amount choice such as "2 cards" takes the full amount when the effect
  removes the opponent's cards. A security placement puts an opposing Digimon on top
  when our strongest Digimon beats it, and our own Digimon on top when it matches the
  opponent's strongest Digimon. Otherwise the card goes to the bottom.
- Triggers: printed before inherited effects, and certain before uncertain summaries.

Copies with the same card and state are ordered by instance id. Their order does not
change the outcome.

Assembly and DigiXros requests explicitly mark their selection goal as materials,
including requests nested inside a free-play effect. Material requests cannot be
mistaken for the free-play target itself. Selection legality remains authoritative
in the engine.

Trained policies preserve their primary score and use a secondary decision score
for tied card, option, trigger and counter choices. Traces report both raw primary
ties and ties remaining after this secondary score. Previously certified program
files are historical artifacts; changing their evaluator or tie handling requires
new strength evidence before promotion. No Standard promotion has been made.

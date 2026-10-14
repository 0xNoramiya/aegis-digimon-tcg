# Heuristic evolution engine

This directory implements bounded JSON heuristics, deterministic legal random
decks, exact engine replay, and information-set MCTS evaluation for the official
GEPA adapter. See [the runner documentation](../../../../../tools/bot-evolution/README.md)
for training, desktop execution, provenance, and current limitations.

Build shared and API packages before invoking `evaluateCli.js`. The worker
accepts one JSON game configuration on stdin and emits one result on stdout;
application logs and MCTS progress go to stderr. `--describe` returns the
compiled engine fingerprint, supported features, seed policy, and pinned decks.

Valid fitness requires a completed game, projection verification, no rejected
intents or policy fallbacks, and every fixed-budget search completing its requested rollout
budget. Time-budgeted residual searches may stop early after at least one valid
rollout, with no invalid rollouts and explicit budget-exhaustion evidence. Invalid games and timeouts have null fitness; incomplete batches stop training. Traces retain actual chosen actions,
source cards, public features, and rule contributions for GEPA reflection.

## Residual search tuning

The evaluation worker accepts `mctsExploration` (finite, nonnegative; default
`sqrt(2)`) and `mctsMaxSearchTimeMs` (finite and positive) for residual MCTS.
Other evaluation modes reject these options. Omitting them preserves fixed-count
search selection behavior. Residual match fitness now also requires zero invalid
simulations, including when retries eventually reach the requested count.
`learnerMctsSimulations` remains the maximum completed rollout
count when a time budget is present.

Time is checked between simulations. The first simulation is always attempted;
a running simulation may exceed the requested time. This is a soft search budget,
not a hard deadline. External cancellation still invalidates the search.
Reports include `timeBudget.requestedMs`, `elapsedMs`, and `exhausted`; consumers
must preserve these fields and distinguish time-budgeted evidence from fixed-count
experiments. A search with no valid samples fails instead of fabricating a score.

Compare settings on identical deck pairs, seeds, seats, and engine fingerprints.
Report actual time, completed simulations, invalid simulations, and match outcomes.
Use reserved seeds for confirmation after selecting settings. Concurrent work
confounds timing; speed comparisons require an isolated measurement window.
These controls do not enable production search or train a learned policy.

`mctsRolloutTurns` optionally cuts residual simulations at a later turn's first
main-phase choice without pending decisions or combat. It must be an integer from
1 to 200. The actual evaluated match still runs to completion. Terminal outcomes
use the exact game result; healthy cutoffs use `evaluateSearchPosition`. External
cancellation, engine errors, rejected actions, and policy fallbacks remain invalid.
`leafEvaluations` counts accepted heuristic cutoffs in each search report.

The initial position evaluator is hand-authored, not trained or calibrated as a
win probability. It applies a bounded logistic transform to the difference in
security count (0.65 each), hand count (0.08), permanent levels (0.12), DP (0.10 per
10000), attack readiness (0.15), and observer-relative memory (0.04). Breeding
permanents contribute material too. It reads only the filtered observation and
does not inspect hidden identities or deck order. Its weights require validation
across decks and reserved seeds; short-rollout results are a separate experiment
from full terminal rollouts. Omitting the option retains full-game simulations.

`mctsMoveOrderingProgram` accepts a standalone heuristic program validated by the
same parser as other evaluation programs. The baseline action remains first;
all other legal candidates are ranked by rule score, preserving seeded shuffle
order for ties. No actions are pruned. Features and card conditions use only the
search observer's filtered window. Residual programs with a `basePolicy` are
rejected because this ranking evaluates rule scores, not the base policy's
projected action scores. Supply an explicit program; there is no default learned
ordering and no claim that the seed heuristic improves strength. The complete
program must be included in experiment manifests alongside search parameters.

## Local experimental evidence

The October 2026 local screens are exploratory, with no production activation.
Their raw inputs, engine fingerprints, outputs and audits are retained under the
ignored `artifacts/bot-evolution/local-mcts-v1/` directory. These artifacts are
local evidence, not files distributed with this repository.

`regression-decks-budget-screen-v2` completed all 32 searched games across four
decks, two seed blocks and both seats. On the 16 paired cases the no-search
control scored 5 wins, 16 terminal simulations scored 8, and 32 scored 6. This
screen does not establish a monotonic relationship between budget and strength;
the six reserved blocks per deck have not been evaluated with these settings.

`learned-value-confirmation-v1` evaluated a frozen six-feature logistic model
through an experimental runtime hook. Across 24 fresh-seed paired comparisons,
the control won 10 and learned one-turn search won 12, with five gained games and
three lost games. The descriptive paired-seed-block sign-flip p-value was 0.765625.
Results varied by deck and do not establish superiority. The learned model is
not the hand-authored evaluator shipped here and is not enabled by a CLI option.
Its provenance includes the model and hook hashes as well as the engine hash.

`policy-target-dataset-v1` contains 24 valid full matches with 32-simulation
search targets. Both seats of each seed stay together: 12 games supply training
and 12 supply validation. `policy-ordering-model-v1` fits a linear softmax model
to visit frequencies among non-baseline alternatives, with game-equal weighting
and scales fitted on training data only. Validation cross entropy decreased from
2.25285034 for uniform probabilities to 2.25170267. This small imitation gain is
not evidence of stronger play. Exported heuristic scores were checked on 3471
alternatives. The resulting program is frozen before fresh-seed match testing;
it remains an experimental artifact, not a default policy.

`learned-ordering-confirmation-v1` completed 48 valid games: 24 paired
comparisons across six decks, two fresh seed blocks and both seats. Both arms
used 16 simulations and the same frozen learned value model; only ordering
differed. The control won 14/24 and learned ordering won 9/24, with one gained
game and six lost games. The descriptive paired-seed-block sign-flip p-value was
0.125. Observed regressions affected Plutomon, Alphamon, Mamemon and Chronomon;
Craniamon gained one game and Glowing Dawn retained its outcomes. Do not adopt
this ordering model on this evidence. The independent audit recalculates pairs
from raw results and rejects stale summaries; this rejection has a regression
check using deliberately changed raw outcomes.

`search-concurrency-full-v1` compares one, two and four independent match workers
over the same four deck/seed cases, with a reversed second pass. Mean batch times
were 85.04, 58.96 and 46.13 seconds respectively, including process startup.
Four workers achieved 1.84 times the one-worker throughput, with identical
non-timing outputs and a sampled peak of 1.50 GiB. The shared cgroup enforced
4 GiB RAM and zero swap, with no memory-limit events. This is local batch
throughput evidence, not parallelization of an individual search tree.

The first-decision `ordering-exploration-pilot-v1` diagnostic did not recover the
manual short-value evaluator's failure by switching from shuffled to heuristic
ordering or reducing exploration from `sqrt(2)` to 0.1. Its two-seat sample is
too small to select a general exploration constant. A residual scoring
optimization was also removed after paired CPU measurements found no consistent
improvement.

Adaptive allocation of time across decisions, shared-tree parallelism and an
AlphaZero-style self-play training loop remain unimplemented. The
[OpenSpiel AlphaZero documentation](https://github.com/google-deepmind/open_spiel/blob/master/docs/alpha_zero.md)
describes learned policy/value guidance and self-play for perfect-information
games. Our experiments borrow the policy/value separation while retaining
filtered observations and information-set search for hidden cards; they are
not a direct AlphaZero implementation.

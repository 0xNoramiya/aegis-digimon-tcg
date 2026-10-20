# GEPA heuristic evolution

## Conditional deck pilots

`learn_pilots.py` uses the official GEPA custom-proposer interface without a model
or API calls. The desktop worker's `--describe-pilots` response discovers every
known, legal, implemented preset and reports excluded recipes with their reasons.
The generator preserves every rule of the certified generic policy and appends
one bounded preference scoped to actual cards in the deck: boss development,
boss security pressure, early Tamer development, or rookie development. These are
frozen hypotheses based on card kind and level, not claims about unmodeled effects.
Their advice states the exact hand, turn, security and memory conditions.

```sh
tools/bot-evolution/.venv/bin/python tools/bot-evolution/learn_pilots.py \
  --run-dir artifacts/bot-evolution/deck-pilots-v1 \
  --deck-pool artifacts/bot-evolution/gepa-balanced-v6/deck-pool.json \
  --desktop-host desktop \
  --node /home/vinicius/aegis-bot-lab/toolchain/node-v26.10.0-linux-x64/bin/node \
  --worker /path/to/frozen/checkout/apps/api/dist/bot/evolution/evaluateCli.js \
  --pairs 48 --gate-pairs 96 --held-out-pairs 2400 --attempt 1
```

The manifest freezes the entire deck and hypothesis family before any games.
Each block has two games, placing the pilot's own deck in each player seat; the
opponent directly uses the certified generic residual. A matched control arm
uses that same generic policy on the same seeds, decks and seats. This controls
for differing inherent deck strength. Train, validation and held-out opponent
decks are disjoint; mirrors are excluded. The gate uses fresh seeds outside the
training and validation splits. The approximate paired Wilson screen corrects
for all frozen hypotheses across the shared family's maximum three waves. Fresh
held-out activation uses a conservative empirical Bernstein lower bound on paired
seed-block differences in [-1, 1], with sample variance and the range-scaled
Maurer–Pontil correction. The lower bound must exceed zero. Its error budget is
`0.05/(3*number_of_decks)`. Before games, the manifest records uniformly sampled
held-out seeds without replacement from a reserved 100-million-seed domain.
The bound adjusts its delta by each deck's probability of unique independent seed
draws. The shared registry retains failed reservations and requires disjoint
held-out domains between waves. These are scoped pilot/control and opponent-split
results, not a new aggregate strength certificate or MCTS guide publication gate.

GEPA must finish every reserved hypothesis. Invalid games and transport timeouts
stop selection and retain their artifacts. Completed stages can be resumed only
with identical inputs; partial stages require diagnosis and a new run directory.
`--only-deck` executes a subset of the already frozen family without reducing its
multiple-comparison budget. `catalog.json` includes only distinct GEPA selections
that also pass the held-out bound. Resume and catalog assembly reconstruct every
completed GEPA selection, raw validation score, proposal gate, held-out score and
activation decision; altered summaries cannot enable a pilot. Rejected decks and custom lists continue to
use the unchanged certified generic fallback. Live catalogs route pilots by the
exact main-deck and egg-deck card multisets, reject unavailable presets, and refuse
two aliases that would overwrite the same multiset. A later wave needs a new run
directory, `--attempt 2` or `3`, and a disjoint `--seed-offset`, such as 100000000
or 200000000. Its family budgets stay fixed rather than resetting after rejection.

## Learning against the current balanced bot

`learn_balanced.py` evolves bounded score adjustments on top of the current
projected balanced policy. A neutral residual reproduces the control's actions,
seeded tie jitter, readiness guard, legal-action search and driver limits. Only
public observations and the learner's own visible cards reach learned rules.
The deterministic numeric pass precedes official GEPA API reflection. Reflection
edits conditions/card scopes; code owns numeric calibration and activation advice.

Run the orchestration locally with API credentials in the local environment;
all games execute on the desktop. Use a fresh run directory after engine or runner
changes. Balanced evaluations batch up to 32 isolated games per SSH process,
preserving each game's full-task cache identity, result and audit record.

```sh
tools/bot-evolution/.venv/bin/python tools/bot-evolution/learn_balanced.py \
  --run-dir artifacts/bot-evolution/gepa-balanced-v4 \
  --deck-pool artifacts/bot-evolution/gepa-balanced-v4/deck-pool.json \
  --node /home/vinicius/aegis-bot-lab/toolchain/node-v26.10.0-linux-x64/bin/node \
  --worker /home/vinicius/aegis-bot-lab/checkouts/gepa-delivery-68ed0fef6d/apps/api/dist/bot/evolution/evaluateCli.js \
  --pairs 96 --metric-calls 6144 --numeric-proposals 24
```

The 24-deck pool is a JSON array of legal, implemented repository deck IDs.
Each seed contributes four games: both deck assignments and both learner seats.
Train and selection use different opponent pairings. Certification excludes both
pairings in either orientation and uses fresh seeds. Invalid or timed-out games
remain unscored and prevent acceptance. The pinned GPT-4.1 snapshot uses a 4,096
completion-token limit and a conservative US$5 ledger shared across run directories.
The explicitly priced `--model gemini/gemini-3.1-pro-preview` alternative uses 8,192
tokens including thinking, medium reasoning, and conservative upper-context rates
from the [official pricing table](https://ai.google.dev/gemini-api/docs/pricing).
Switching providers preserves every reservation and the same total cap. Provider
failure stops the optimizer after one failed request and never selects a policy.
Before tuning, all validation seed blocks must pass a neutral-control seat-swap audit.
Neutral numeric rules explore both coefficient directions with code-authored advice.

When paid reflection is intentionally skipped, `--model deterministic` uses the
official GEPA custom-proposer interface with no model calls. Supply a frozen JSON
`--proposal-plan`, use `--numeric-proposals 0`, and reserve enough `--metric-calls`
for the entire plan. The plan records `origin: "deterministic-numeric"`, the pinned
`engineSha256`, `initialPolicySha256`, and a list of distinct `programs`. Only
bounded weights, authored advice and titles may change; features, conditions and
card scopes remain fixed. Record the training screen and construction method in
the plan for reproducibility. `--gate-pairs 384` supplies 1,536 fresh paired games
per hypothesis; the approximate Wilson screen corrects for the whole frozen plan.
GEPA additionally compares full training batches and selects on separate validation.
It stops after the last proposal completes, reports the attempted/completed count,
and refuses selection after a gate failure. Partial deterministic stages require a
fresh directory; exact-task game cache entries remain reusable.

`certify_balanced.py` requires the selected policy to reconstruct from an accepted
GEPA proposal and the actual GEPA validation result. API proposals reconstruct from
their pinned prompt/response after code calibration; deterministic proposals
reconstruct from their frozen numerical plan and a recomputed fresh paired gate.
The certificate records their different origins explicitly. It freezes
the program, engine, worker, evaluator, task list and lineage before execution.
One shared registry permits at most five candidate attempts and three fixed looks
at 1,200, 2,400 and 4,800 complete seed blocks. It accepts only when every game is
valid and the sole preregistered lower confidence bound exceeds 50% against the
current balanced control. Use `--attempt` once per frozen candidate; changed inputs
cannot reuse a reservation.

The certification bound is the empirical Bernstein bound in
[Maurer–Pontil (2009), Theorem 11](https://arxiv.org/pdf/0907.3740#page=4), applied
to one minus the mean score of each four-game block. It uses sample variance with
denominator `n-1` and permits differing deck distributions. Its per-look error
budget is `0.05/(5*3)`, further multiplied by the probability that all 4,800
independent seeds would be unique. That conditioning correction covers the actual
sampling without replacement. The protocol records the amendment from the training
manifest's provisional Hoeffding plan before any held-out candidate games. This
certificate concerns direct strength against current balanced; high-budget MCTS
guide publication remains a separate gate.

## Certified numeric policy

The delivered `programs/certified-balanced.json` catalog contains the actual GEPA
v6 selection: the projected balanced policy with a `sourceDp` residual weight of
`0.2`. The frozen numerical proposal plan used the official GEPA custom proposer
and made no model calls. Independent attempt 2 passed at the second preregistered
look: 5,036 wins and 4,564 losses in 9,600 valid games across 2,400 independent
four-game seed blocks. The family- and unique-seed-adjusted empirical Bernstein
lower bound is 50.5706%, with an observed win rate of 52.4583% against the current
projected balanced control. There were no invalid games, timeouts, rejections,
engine errors or inference fallbacks. The first 1,200-block look did not pass;
attempt 1 remains consumed and invalid due to its repaired projection defect.

The ordinary balanced app bot now uses `defaultBotOptions` and this certified
generic policy without requiring an environment option. Explicit policies and
custom profile weight sets keep their own choices; aggressive and defensive bots
continue using their corresponding projected profiles. Match and seat seed the
default policy, while the readiness guard, configured pacing and action limits
are preserved. No production deployment has occurred. An explicit catalog can
still override startup, with validation before room admission:

```sh
AEGIS_BOT_HEURISTIC="$PWD/apps/api/src/bot/evolution/programs/certified-balanced.json" pnpm dev
```

This historical catalog is generic. Its result establishes
aggregate strength on the frozen 24-deck distribution, not superiority for every
deck, aggressive/defensive profiles, tournaments or high-budget MCTS. It does not
authorize strict guide publication. The certificate describes its pinned historical
engine; integrating later main changes does not create a new certificate.

The committed [strength evidence](../../apps/api/src/bot/evolution/strength-evidence.json)
pins the policy, merged source/runtime, certifier, protocol, statistics and raw
batch hashes. [proof.tgz](evidence/balanced-v6/proof.tgz) contains the original
protocols, both fixed-look results, all 60 raw game batches and inputs, GEPA
selection/plan/gate evidence, provenance records and independent audits. The full
source/runtime archives remain in the local run directory with their hashes
pinned in those records.

The practice room now forwards the engine match seed to the configured policy;
this wiring was added after the frozen certificate without changing its decision
function. Desktop regressions verify actual startup, seeded policy selection,
accepted main actions and exact catalog/evaluator event equality in both seats.
The benchmark and ordinary default policy now seed decisions by match and seat.
Human opponents and real-time presentation differ from the benchmark.

### Validated Chronomon pilot

`programs/certified-pilots.json` now selects `sourceDp=0.25` for the exact main
and egg card multisets of `bt26-dgo-2026-08-28-7-chronomon@1`. Other decks retain
the generic `0.2` policy. The global `0.25` proposal failed confirmation; its
exploratory Chronomon result selected this separate, deck-specific hypothesis.

A frozen screen used eight new opponents and 960 games. Confirmation used twelve
different opponents, 1,440 fresh seed blocks, both seats, and 2,880 games per arm.
The incumbent won 1,894 games (65.7639%); the pilot won 2,042 (70.9028%). The paired
gain was 5.1389 percentage points, with an empirical Bernstein lower bound of
1.6757 points at alpha 0.01. Only the confirmation games count toward acceptance;
this consumes reservation 3 of the existing five-candidate family.

[Chronomon strength evidence](../../apps/api/src/bot/evolution/chronomon-strength-evidence.json)
pins the scope, engine, protocol and statistics.
[The proof archive](evidence/chronomon-quarter-v1/proof.tgz) includes all 6,720 raw
games, frozen inputs, independent audits, runner sources and resource evidence.
Full-game tests compare the normal default policy with the evaluated policy in
both seats. These results concern the fixed opponent distribution using the
incumbent policy; they do not establish superiority against humans or all decks.
No production deployment or strict guide publication is implied.

## Historical matchups and identities

```sh
tools/bot-evolution/.venv/bin/python tools/bot-evolution/matchup_report.py \
  --proof tools/bot-evolution/evidence/balanced-v6/proof.tgz \
  --output-dir tools/bot-evolution/evidence/balanced-v6
```

The report verifies the pinned proof archive, certificate protocol, accepted fixed
look and all raw batch counts before writing `matchups.json` and the interactive
`matchups.html`. Its rows cover the historical 24-deck certificate distribution;
they describe candidate performance against the frozen balanced control rather
than certifying uplift for every deck. Matchup groups have their own sample sizes,
and uncertain rows remain inconclusive. Later main integration needs fresh games
before making new strength claims.

Names and portraits are independent of policy strength. The server resolves the
actual deck to a shared persona, and the lobby and game present that same identity.
See the [persona mapping and source rationale](../../packages/shared/src/bot/personas/README.md)
for Rina/Ulforce, other printed Tamer associations, Digimon portraits and fallback
behavior for custom or substituted recipes.

## Residual MCTS experiments

The compiled `evaluateCli.js` accepts `learnerMctsSimulations` to put real-engine
search on the residual learner. With `opponent: "mcts"`, it instead searches for
the opponent. These modes cannot be combined in one comparison. A zero learner
budget preserves the current residual policy's choices and game events.

Search runs at settled Main windows. The current policy's preferred intent is
the first root candidate; other affordable legal declarations are shuffled with
the recorded search seed. Activation-effect choices stay with the current policy
to preserve its per-turn activation tracking. Breeding, combat responses and
private selections also retain that policy. Rollouts reconstruct every recorded
intent, advance the original policy's RNG and guards, verify the visible root and
offered intents, then sample hidden zones with the existing open-decklist belief.
Future rollout choices use the same residual policies. Search reports include
completed/invalid rollouts, the searched seat and elapsed milliseconds. Captured
residual traces are explicitly baseline traces, rather than searched choices.

`mctsMaxSearches` and `mctsStartAfterDecisions` support latency and restoration
probes. A capped-search probe is not a full-game strength result. Strength tests
should freeze their scheduling policy, compare matched seeds and seats against
the same control, and keep invalid games and timeouts unscored. The local
experiment uses one Docker container with a shared 4 GiB RAM ceiling and zero
additional swap; this covers the coordinator and evaluation workers together.
This interface does not establish a new strength certificate or activate MCTS
for ordinary application matches.

## Guarded MCTS prefix acceleration

The engine still reconstructs simulation state through real prefix replay. It can
reuse recorded main-action catalogs while replaying the exact, unsampled prefix.
The replay checks the expected seat, public information key and selected action
key; a mismatch invalidates that rollout. At the sampled root and beyond the
prefix, the authoritative engine enumerates actions. This reduces enumeration work
without changing hidden-information access or claiming a clone of runtime state.

The compiled `replayAccelerationBenchmark.js` accepts JSON on stdin. Benchmark
budgets 8, 32, 128 and 256 in `mode: "single-search-after-prefix"` with
`startAfterDecisions: 16` and paired enabled/disabled runs. Each measured game
contains exactly one search after the prefix; warm-up searches are excluded from
timing. Every rollout must complete, the recorded catalog path must execute, and
seeded events, actions and search reports must match. This mode measures the cost
of a bounded search inside a real game. `mode: "full-game"` searches every MCTS
decision and measures a different, more expensive workload. Neither benchmark
establishes playing strength; timings from an earlier runtime do not establish
speedup after a main integration.

## MCTS and pilot evolution

The official GEPA package evolves bounded JSON heuristics; the TypeScript
interpreter scores legal engine actions. Each rule contains plain English advice
for future strategy-guide publication. Candidate code is never executed.

The runner first trains a generic policy on composed random decks, then
coevolves Glowing Dawn and Toho Braves pilots. Each generation freezes an archive
of the other pilots; pilots face both that archive and an information-set MCTS
opponent. Training, model selection, and final evaluation use disjoint seeds.
Final evaluations compare the selected and initial policies on the same tasks.
Training adaptively screens search budgets up to 8 completed real-engine rollouts
per main choice by default. Strict publication requires a separate final budget of
at least 128 completed rollouts.
Incomplete search budgets, policy fallbacks, rejected intents, and truncated
games cannot produce valid fitness results.

MCTS reconstructs the engine by exact replay, then samples hidden copies uniformly
over unknown deck/hand/security slots under an open-decklist assumption. The
observer's hand, public zones, and face-up security stay fixed. Future shuffle
streams are resampled. This belief discards remembered hidden locations and
ordered-deck knowledge, rather than pinning cards to privileged server locations.
The other seat uses the candidate heuristic during rollouts. Search expands one
new edge per rollout and uses UCT and terminal-game reward backpropagation.
Each rollout receives a turn horizon measured from its search root: the root turn
plus the configured match turn limit (60 by default). The outer match retains its
original absolute turn limit. Reaching either limit without a terminal result
remains invalid; a cutoff is never scored as a draw. Late searches therefore do
not lose their rollout horizon merely because the outer game is near turn 60.

The late-terminal-rollout regression restores recorded MCTS choices from a random
deck match, verifies root information hashes and offered action counts, and runs
one real determinized rollout. That rollout previously stopped at turn 61 and
now reaches a security win at turn 62, with both prefix replay modes. Its forced
search choices are regression data, not strength or publication evidence.
Engine rule fixes later changed the turn-59 block window at rollout choice 13. The
fixture keeps the first 13 recorded choices, forces the first block option there, and
lets the rollout heuristic continue; that path still wins by security at turn 62.

Search is currently applied to settled Main windows; other windows use the
rollout heuristic. Full engine replay is expensive. Logs report actual completed
and rejected simulations, and the run directory pins the compiled engine hash.
A low-budget smoke run is development evidence, not a validated strategy guide.

## Multi-fidelity campaigns

The engine cannot snapshot a live match: it holds in-flight promises, closure
subscriptions and weak maps. Every simulation therefore replays the prefix from the
seed. In local measurements on the current engine, prefix replay was 40–75% of
rollout time at mid-game roots, and full rollouts played to the end of the game.
Glowing Dawn matches cost about 7–10 ms per engine decision, about five times the
random-deck cost.

These options define a new experiment. They are off by default, and a run that uses
them is not equivalent to a full 128-simulation campaign:

| Option                    | Effect                                                                         |
| ------------------------- | ------------------------------------------------------------------------------ |
| `--screen-simulations`    | GEPA training, selection and reflection screening use this MCTS budget.        |
| `--screen-rollout-turns`  | Screening rollouts stop at that turn and score `evaluateSearchPosition`.       |
| `--selection-pairs`       | GEPA's selection set uses only the first N validation seed blocks.             |
| `--gate-simulations`      | Proposal gates use this MCTS budget instead of `--simulations`.                |
| `--gate-rollout-turns`    | Proposal gate rollouts stop at that turn and score `evaluateSearchPosition`.   |
| `--sequential-looks`      | Gates and stage confirmation play one look of seed blocks at a time.           |
| `--teacher-simulations`   | Traced training games add advisory searches from the learner's seat.           |
| `--final-control generic` | Held-out pilot results use the accepted generic policy as control.             |
| `--heuristic-batch-size`  | Heuristic-opponent games share one worker process; search games stay isolated. |

A heuristic-opponent pilot game costs about 6.6 s alone, and about 2 s of that is the
engine fingerprint plus module loading. Three batched games took 9.1 s instead of about
20 s, with outputs identical to separate runs apart from latency samples.

Multi-fidelity screening requires `--fixed-opponent`. The proposal count follows
the selection set size, so a smaller set yields more proposals per stage.

The sequential gate uses an exact one-sided sign test on one task-hash
representative per seed block. Each look spends `0.05 / proposals / looks`, so the
familywise error stays bounded for any stopping time. A gate stops for futility when
the control leads or when even all remaining blocks could not reach the threshold.
Those stops are non-binding and only lower acceptance. Gates for the same parent
reuse one set of fresh gate blocks, so the parent's control games come from the cache.
Bonferroni over proposals holds under that dependence. More proposals make each gate
stricter, so a stage that wants several proposals may need more `--pairs`.

With `--gate-simulations`, a campaign has three tiers. GEPA screens at the screening
budget, proposal gates run at the gate budget, and the stage winner must then beat its
starting policy at `--simulations` without rollout bounds. Confirmation uses fresh seed
blocks, the same looks and its own 0.05 error budget. If confirmation fails, the stage
keeps its starting policy; `selected.json` records the gate winner and the evidence.
Held-out final evaluation always runs at `--simulations` without rollout bounds.

Measured on Examon against Toho Braves, a full game at 128 simulations with full
rollouts took 37–46 minutes and about 125 s per search. A screening game at 16
simulations with two-turn rollouts took 33–38 s and about 3.7 s per search, including
worker startup. The games diverged, so these are cost figures, not paired outcomes.

Teacher searches run after the learner has chosen its action and never change the
played game; a test checks that results, decisions and opponent searches match.
Reflection receives up to six `teacherDisagreements` per game where the search's top
action had more than twice the visits of the played action. Those are noisy hints from
short searches against a heuristic opponent, not ground truth. Validation and held-out
games never capture traces, so teacher data stays in the training split.

In one-sample measurements at 16 simulations, two-turn rollouts cut rollout time 2–11×
early in the game. Late roots gain less because prefix replay dominates. Examon
against Toho Braves fell from 7.0 s to 1.2 s per search after 16 decisions; Glowing
Dawn against Examon fell from 10.4 s to 8.1 s after 40 decisions.

## Desktop execution

The user's Windows desktop is SSH host `desktop`, reached through Tailscale.
Run engine tests and simulations inside its WSL checkout with the provisioned
Node 26 environment `/home/vinicius/aegis-bot-lab/env.sh`. Keep each SSH/WSL job
attached until completion. Use one Vitest worker and a bounded Node heap.

LLM reflection can remain on the local machine while complete evaluations run on
the desktop. This keeps API credentials local, and sends one JSON configuration
per game over SSH, rather than transferring every action over the network.

Install Python dependencies with `uv sync --group dev` in this directory. For
the current isolated desktop checkout:

```sh
tools/bot-evolution/.venv/bin/python tools/bot-evolution/evolve.py \
  --run-dir artifacts/bot-evolution/desktop-gepa-smoke-8 \
  --desktop-host desktop \
  --node /home/vinicius/aegis-bot-lab/toolchain/node-v26.10.0-linux-x64/bin/node \
  --worker /home/vinicius/aegis-bot-lab/checkouts/gepa-2026-10-10-v2/apps/api/dist/bot/evolution/evaluateCli.js \
  --simulations 8 --metric-calls 512 --pairs 24 --generations 2 \
  --evaluation-timeout 21600 \
  --evaluation-workers 4 \
  --reflection-model session
```

The configured reflection model defaults to `openai/gpt-4.1`. Its credentials
are supplied through the local environment. A run directory can be resumed only
with the same engine and parameters; completed stage artifacts are reused and
GEPA retains its own checkpoint state. Use a fresh directory after code changes.
GEPA 0.0.27 does not checkpoint its random-number generator or shuffled batch
sampler. Restarting the same command can therefore change later optimization
choices even when it reuses completed evaluations. Keep a controlled run
uninterrupted; if interruption is unavoidable, record the resume in its evidence
instead of claiming an identical optimization trajectory.
Four bounded desktop workers evaluate independent games while preserving batch order.
A complete random-deck game exceeded the two-hour default deadline at 256
rollouts per search, so certification at high budgets needs a separate measured runtime budget.
The deadline is recorded in the run manifest. An execution timeout aborts
evaluation; it does not count as a heuristic loss. Valid exact-task games remain
reusable from the adapter cache when a fresh run uses a longer deadline.
A shared cache reuses only valid games with identical policy, task, engine, and
search budget; reflection additionally requires recorded traces. GEPA's internal
candidate/example-ID cache is disabled because list loaders reuse integer IDs
across training and validation. The adapter cache uses the full task instead.
After changing the optimizer protocol, reuse only valid exact-task game outputs
in a fresh run; do not migrate old optimizer checkpoints or selected stages.
Official GEPA
callbacks record proposed policies separately from the retained candidate pool.
Raw games, stderr logs, selected pilots, lineage, and held-out results remain
under the ignored run directory.

The training action and material-selection modules were adapted from
`feat/bot-bt26-chronomon` at `a2692dcbdf`. Its deployment changes were not imported.

## Research and current limits

- [GEPA adapter protocol](https://gepa-ai.github.io/gepa/guides/adapters/) and
  [official implementation](https://github.com/gepa-ai/gepa).
- [Information Set Monte Carlo Tree Search](https://pure.york.ac.uk/portal/en/publications/information-set-monte-carlo-tree-search/).
- [DCG Nexus](https://dcg-nexus.com/) lists Toho Braves and Glowing Dawn among
  its tracked archetypes for 27 September–4 October 2026 (checked 10 October).
  The exact pilot decks are pinned repository tournament lists, not claims that
  these lists are the strongest current builds.

A local experimental preview can use a completed low-budget run. It does not
establish improved playing strength. High-budget evaluation is still required
for ordinary guide publication.

## Experimental preview and live practice

For a completed paired run with at least eight simulations per search:

```sh
tools/bot-evolution/.venv/bin/python tools/bot-evolution/preview.py \
  --run-dir artifacts/bot-evolution/desktop-gepa-timeboxed-preview-8 \
  --base-url http://localhost:5173

AEGIS_BOT_HEURISTIC="$PWD/apps/api/src/bot/evolution/programs/preview.json" pnpm dev
```

Preview pages explicitly identify the limited evaluation and use `noindex`.
The preview renderer checks complete paired games, both player seats, matching
selected and control policies, and pinned engine and runner fingerprints. The
strict publisher below retains its minimum of 128 simulations.

The live catalog contains `schemaVersion: 1`, a `generic` heuristic and `pilots`
keyed by the exact supported deck version. A deck pilot is selected only when
the actual main and Digi-Egg card multisets match; other decks use the generic
policy. `AEGIS_BOT_HEURISTIC` and `AEGIS_BOT_CHECKPOINT` are mutually exclusive.
Restart the API after changing the catalog. Rejected actions disable the policy
for that match and use the standard bot fallback. Live games retain the normal
bot action cap and presentation pacing; the benchmark uses a pinned evaluation
engine and removes think delays. The live app is not an identical benchmark run.

To compare bot policies against real players instead, use the opt-in
[bot A/B experiment](../../internal-docs/ai/bot-ab-experiment.md). It stays
off while either explicit policy above is configured.

## Guide publication

After the high-budget run completes, publish its selected policies and paired
held-out results to static HTML (crawlable without JavaScript):

```sh
tools/bot-evolution/.venv/bin/python tools/bot-evolution/publish.py \
  --run-dir artifacts/bot-evolution/desktop-gepa-isolated-256 \
  --base-url https://aegis-digi.online
```

The publisher requires matching engine/policy fingerprints, both player seats,
valid final games, explicit zero invalid simulations in every search, and complete
search budgets of at least 128 rollouts. It
refuses low-budget smoke results and requires an alternative policy evaluated
in completed games. The selected policy must differ semantically from the original baseline and beat its
paired held-out control with a positive confidence lower bound. Publication
preserves every active rule's
exact advice and conditions, exposes benchmark denominators and the paired
starting-policy control, and links to Aegis practice. Generated pages live in
`apps/web/public/strategy-guides/`; deploying those pages is a separate delivery
step. No raw game traces or hidden observations are published.

The EX13-era DigiLab campaign has separate guide routes for Examon, Jupitermon,
UlforceVeedramon, TS Mervamon, Toho Braves, and Glowing Dawn. These routes support
the exact deck versions in the campaign; adding a route does not publish a guide
or relax the held-out evidence requirements.

If an external reflection provider is unavailable, `--reflection-model session`
uses the active coding session as the proposer. GEPA writes each exact prompt
under the stage's `reflections/` directory and waits for a matching response
fingerprint. The coding session reviews the real feedback and supplies a fenced
JSON candidate. These prompt/response records make the provenance explicit;
this mode does not claim an external API model produced the candidate. The
same GEPA selection and real-engine evaluations still apply. Session runs can pass
strict publication when each selected stage includes an audited prompt/response
archive frozen with its selection. The publisher verifies both file hashes, prompt
fingerprints, complete response coverage, and the exact selected stage. Missing or
modified archives are rejected. Public evidence identifies session reflection and
includes archive hashes, but does not expose private prompts or responses. This
records provenance; it does not claim an independent API model authored the proposals.

## Numeric selection and publication gates

`learn_combo_pilots.py` freezes 18 finite public-state hypotheses for the exact
Ulforce `ex4-dgo-2022-06-25-1-ulforceveedramon@1`, Mirage
`ex6-dgo-2024-07-06-1-miragegaogamon@2`, and Shine
`bt25-dgo-2026-06-06-4-shinegreymon@1` versions. Each preserves the certified generic
rules and appends one authored, card-scoped Main rule, using own board/hand predicates
and weights 4, 8, or 12. The 24-deck opponent pool remains separate from these three
targets. Unsupported intentions are frozen as metadata, outside the scored program.

The launcher requires `--run-root`, `--amendment`, `--prior-registry`, `--prior-run`,
`--deck-pool`, `--node`, and `--worker`. `--freeze-only` closes and allocates the family
without launching games. `--attempt 1` uses 96 training/validation, 384 gate, and
2400 held-out seed blocks per deck; attempt 2 prospectively uses 192, 768, and 9600.
Both waves' counts, hypotheses, runtime, runner, opponent partitions, and unique
held-out seed plans are frozen before either runs. `--only-deck` can select a subset
of the three targets without changing their allocated confidence budget. Completed
selections are reconstructed from raw games before their catalog is assembled.
`--desktop-system` freezes the exact WSL prefix `--system -d Ubuntu` for descriptor,
process capture and every match, supporting a verified runtime built in desktop RAM.
Omitting it retains ordinary WSL transport. Changing the prefix prevents resume.

The append-only amendment retains the full original wave-one alpha charge of
0.05/3, retires original waves two and three permanently, and divides the remaining
0.05×2/3 over three targets and two waves. Activation uses the existing conservative
paired seed-block empirical Bernstein bound at alpha 0.0055555556 per target/wave.
Training screens retain their explicitly approximate corrected Wilson gate. Failure
does not refund either budget. The original registry and every run artifact retain
their bytes and hashes, including stale summaries, partial reservations and raw
invalid games. Separate immutable closure records authorize the new family.

If the original wave ended in a non-resumable infrastructure failure,
`--prior-failure <record.json>` accepts `kind: infrastructure-failure-abandonment`,
the nonzero `orchestratorExitCode`, the absolute immutable failure `log`, and its
byte `logSha256`. The launcher captures local and desktop process snapshots and
refuses closure while any worker or orchestrator is live. It verifies the original
source/runtime archives, completed raw selections, partial frozen reservations,
and a disk/I/O failure in the log. Its terminal audit records completed, partial,
and unstarted decks explicitly. Invalid games keep null scores and do not become
losses. This abandonment authorizes a prospective family; it makes no strength claim.

Independent balanced certification preserves the GEPA selection's original engine
and policy identities. `certify_balanced.py --runtime-amendment <record.json>` can
pin a repaired certification runtime without rewriting the selection. A
`projection-repair` record permits only the declared visibility/verifier changes.
A `main-integration` record additionally verifies the merge parents and ancestry,
the complete source archive against the commit's Git blobs and file modes, and
the actual desktop build record with source checks before and after compilation.
All runtime changes are declared, and every production bot module must retain its
membership and bytes; only test modules and the previously reviewed projection
verifier are exempt. The worker binds the live API, shared runtime and dependency
lock to that archive before and after games. Historical selection scores continue
to describe the original runtime. Strength on the integrated engine requires a
fresh reserved certification attempt with the existing seeds, family budget and
confidence gates.

Run `tune.py --manifest <run>/manifest.json --program <program.json> --tasks <tasks.json>
--output <selection-dir>` before paying for reflection. It evaluates fixed, reproducible
single-weight neighbors through `HeuristicAdapter` and the same compiled worker as GEPA.
Conditions and authored advice stay fixed; weights retain their signs. Each candidate
faces the frozen initial control on the same seeds. At least 48 distinct games are
required, rechecks add no samples, and paired confidence calculations group seats and
opponents by engine seed. Numeric selection uses an approximate paired Wilson win test with one task-hash
representative per seed and corrects for the number of predeclared proposals. The
strict publisher retains the more conservative Hoeffding bound on complete seed blocks.
The MCTS-only subset must independently pass that same paired improvement gate;
archive wins cannot compensate for no demonstrated gain against MCTS. Its output is selection evidence: freeze the winner
and evaluate new held-out seed blocks before claiming improved strength.

Each structural proposal is screened on at least 48 fresh same-seed games against
its parent before admission to GEPA. Seeds are separate from training, validation
and final testing, and the gate corrects for the predeclared proposal limit.

Reflection defaults to thin feedback (the final eight recorded decisions, without the
card-text dump). `feedbackMode: "rich"` enables the longer diagnostic dataset. A
`blockedIntents` list records ideas unavailable in the grammar without changing policy
identity or scores. Exact score ties use seeded randomness derived from the public
window, preserving deterministic prefix replay; traces report tied actions per window.

Invalid games and timeouts have null fitness. An incomplete GEPA batch stops with its
audit artifacts rather than supplying artificial losses. Strict publication requires a
policy distinct from the seed, at least 48 valid paired held-out games, and a positive
95% seed-block Hoeffding lower bound against control. Duplicate cached games never add
independent evidence. A weight sign change with unchanged advice also blocks publication.
Pilot test matchups exclude mirrors; larger deck pools rotate opponents across splits.

Preview catalogs set `strictVerified: false`, so Home exposes the guides link only after
strict publication. Pilots identical to generic have no deck page. Preview sitemaps
contain no noindex URLs; canonical origins come from the required `--base-url` option.

API reflection requires `--dollar-cap`, `--input-usd-per-million` and
`--output-usd-per-million` with prices checked for the chosen model. The runner sends
`--completion-tokens` (4096 by default) on the wire, disables automatic paid retries,
and reserves a conservative upper cost before each call across all stages. Reservations
are never refunded for missing usage or unknown library pricing. Prompts, raw API
responses and the shared budget ledger are saved with the run. Session reflection incurs no reflection API charges. Its audited provenance is
required for strict publication; the same high-budget MCTS and held-out improvement
gates apply regardless of reflection origin. Existing session runs without frozen
reflection records remain ineligible; do not retroactively certify their provenance.

A cheap engine snapshot is not currently safe. GameState omits runtime effect and
modifier ledgers, once-per-turn usage tracking, reducers and RNG closures. The complete
engine additionally owns promises, WeakMaps and callbacks bound to its original state.
An engine-owned settled snapshot API would need full runtime export/import, explicit
quiescence checks, serializable RNG and rebuilt callbacks before replacing prefix replay.

Training selects a search rung adaptively by default (`--fixed-opponent` disables it).
The seed first faces a seeded random legal-action control, then progressively larger
MCTS budgets up to `--simulations`. A rung advances after its approximate Wilson win
lower bound clears 50%; the first blocked interval is bisected to find an intermediate
budget. This is a heuristic bracket: larger MCTS budgets are not guaranteed to be
monotonically stronger. Each rung records played games, independent seed blocks and its mastery result.
Archive opponents remain frozen while the search budget changes. These are training
screens; the final held-out report uses the independently configured search budget.

### Independent campaign seed allocation

`evolve.py --seed-offset <integer>` offsets game seeds, search seeds, and random
composition seeds across training, validation, and final testing. The default zero
preserves existing task generation. Choose an unused range before starting a new
campaign; the offset is frozen in its manifest and cannot change on resume.
Changing the offset does not by itself prove that a range is unused: check prior
experiment manifests before allocation. Runtime calibration games must remain
outside the campaign's training, selection, proposal-gate, and final-test ranges.

`--turn-limit` fixes the outer match horizon for every training, selection, and
held-out task, including both selected policies and controls. It defaults to 60
and accepts 1–200 turns. The manifest pins this value, and task cache keys include
it; changing it requires a new campaign. Use a prospectively chosen longer limit
when random-deck matches need more turns to reach a terminal result. A cutoff
remains invalid and never becomes a draw or a fitness loss.

`--final-pairs` independently fixes the number of reserved seed blocks per pilot
for final evaluation (24–1000). When omitted, it inherits `--pairs`. Training and
validation sizes remain controlled by `--pairs`; the manifest records both values.
Choose the final sample size before running the campaign and do not increase it
in response to an unfavorable confidence bound. Both seats are played for every
block, and archive opponents do not replace the required MCTS comparisons.

### Paired reflection batches

`evolve.py --reflection-pairs 4` samples four complete training seed blocks per
GEPA reflection. Generic batches contain eight games; pilot batches additionally
include the frozen archive opponent in both seats. Blocks rotate deterministically
without replacement within an epoch, and the final short batch is not padded with
duplicate games. Incomplete or duplicated seat pairs are rejected. The setting is
pinned in both campaign and stage fingerprints; changing it requires a new run.

This reduces feedback collection per proposal while preserving the full initial
validation, fresh proposal gates, and final held-out sample. It does not accelerate
the initial validation or establish a strength gain. The strong MCTS reference,
invalid-game rejection, and strict publication criteria remain applicable.
The [TCG bot comparison](../../docs/tcg-bot-training-comparison.md) records the
sources and limits motivating shorter reflection cycles and future opponent
diversity. Four pairs is an engineering starting point, not a proven optimum.

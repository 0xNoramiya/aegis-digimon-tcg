# GEPA heuristic evolution

The official GEPA package evolves bounded JSON heuristics; the TypeScript
interpreter scores legal engine actions. Each rule contains plain English advice
for future strategy-guide publication. Candidate code is never executed.

The runner first trains a generic policy on composed random decks, then
coevolves Glowing Dawn and Toho Braves pilots. Each generation freezes an archive
of the other pilots; pilots face both that archive and an information-set MCTS
opponent. Training, model selection, and final evaluation use disjoint seeds.
Final evaluations compare the selected and initial policies on the same tasks.
The default search budget is 256 completed real-engine rollouts per main choice.
Incomplete search budgets, policy fallbacks, rejected intents, and truncated
games cannot produce valid fitness results.

MCTS reconstructs the engine by exact replay, then samples hidden copies uniformly
over unknown deck/hand/security slots under an open-decklist assumption. The
observer's hand, public zones, and face-up security stay fixed. Future shuffle
streams are resampled. This belief discards remembered hidden locations and
ordered-deck knowledge, rather than pinning cards to privileged server locations.
The other seat uses the candidate heuristic during rollouts. Search expands one
new edge per rollout and uses UCT and terminal-game reward backpropagation.

Search is currently applied to settled Main windows; other windows use the
rollout heuristic. Full engine replay is expensive. Logs report actual completed
and rejected simulations, and the run directory pins the compiled engine hash.
A low-budget smoke run is development evidence, not a validated strategy guide.

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
  --run-dir artifacts/bot-evolution/desktop-gepa-isolated-256 \
  --desktop-host desktop \
  --node /home/vinicius/aegis-bot-lab/toolchain/node-v26.10.0-linux-x64/bin/node \
  --worker /home/vinicius/aegis-bot-lab/checkouts/gepa-2026-10-10-v2/apps/api/dist/bot/evolution/evaluateCli.js \
  --simulations 256 --metric-calls 24 --pairs 2 --generations 2 \
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
rollouts per search, so this high-budget command allows six hours per game.
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

## Guide publication

After the high-budget run completes, publish its selected policies and paired
held-out results to static HTML (crawlable without JavaScript):

```sh
tools/bot-evolution/.venv/bin/python tools/bot-evolution/publish.py \
  --run-dir artifacts/bot-evolution/desktop-gepa-isolated-256 \
  --base-url https://aegis-digi.online
```

The publisher requires matching engine/policy fingerprints, both player seats,
valid final games, and complete search budgets of at least 128 rollouts. It
refuses low-budget smoke results and requires an alternative policy evaluated
in completed games. If selection retains the stage input or original baseline,
the guide reports that explicitly without claiming improvement. Publication
preserves every active rule's
exact advice and conditions, exposes benchmark denominators and the paired
starting-policy control, and links to Aegis practice. Generated pages live in
`apps/web/public/strategy-guides/`; deploying those pages is a separate delivery
step. No raw game traces or hidden observations are published.

If an external reflection provider is unavailable, `--reflection-model session`
uses the active coding session as the proposer. GEPA writes each exact prompt
under the stage's `reflections/` directory and waits for a matching response
fingerprint. The coding session reviews the real feedback and supplies a fenced
JSON candidate. These prompt/response records make the provenance explicit;
this mode does not claim an external API model produced the candidate. The
same GEPA selection, real-engine evaluations, and held-out gates still apply.

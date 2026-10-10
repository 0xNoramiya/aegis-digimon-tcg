# Heuristic evolution

This directory supplies the engine evaluation surface for GEPA. The initial
implementation is an evaluator and heuristic interpreter; it does not yet run
GEPA or provide an MCTS opponent.

`heuristic.ts` defines a bounded JSON rule format. A candidate contains a title
and weighted public action features, each accompanied by English advice. The
interpreter never executes candidate code. `rankHeuristic` records the rules
that contributed to a choice, allowing reflection to inspect actual behavior.
An opportunity to attack at zero security is not proof that the attack wins:
blockers and counters still resolve through the engine.

`randomDecks.ts` builds deterministic new compositions by replacing cards in
legal catalog decks with cards of matching kind, level, and compatible colors.
Every replacement passes the server deck-validation gate, including current
copy limits and banned pairs. This preserves a playable curve while varying
composition; it does not sample the whole implemented card catalog yet.

`evaluateCli.ts` accepts one JSON object on stdin and prints one result on
stdout. Application logs go to stderr. Build shared and API packages before
running `node apps/api/dist/bot/evolution/evaluateCli.js` with Node 26.

Input fields:

- `seed`: game seed.
- `learnerSeat`: 0 or 1; run both seats for each matchup.
- `decks`: two random-deck integer seeds or pinned BT26 training-deck versions.
- `program`: a version-1 heuristic program.
- `opponentProgram`: optional heuristic opponent for coevolution evaluation.
  Without this, the opponent is explicitly labeled `evaluation-baseline`.
- `turnLimit`: optional positive integer, at most 200 (default 60).
- `captureTraces`: optional; retains up to 200 learner decisions and alternatives.

An evaluation is valid only when the game completes without engine errors,
intent rejections, asynchronous rejections, a stalled result, or truncation.
Invalid games receive zero score and a nonzero process exit. Hidden-state
projection verification runs throughout the game. These checks verify evaluator
integrity; they do not demonstrate pilot strength.

The intended next stage is a custom adapter for the official
[GEPA implementation](https://github.com/gepa-ai/gepa), following its
[adapter protocol](https://gepa-ai.github.io/gepa/guides/adapters/): execute
candidate heuristics, return game outcomes, and reflect on action contributions
and alternatives. Generic training must use composed random decks first;
deck pilots then inherit the generic policy and coevolve against both the
search opponent and a frozen archive of other pilots. Selection and final
evaluation require disjoint seeds. Guide publication must use the actual
selected rules and held-out evidence, without claims of tournament strength
unsupported by games.

The engine currently has no search snapshot/restore API. A high-simulation MCTS
opponent must use faithful engine reconstruction and hidden-information
sampling. A simplified combat model or the current baseline must not be labeled
as that opponent.

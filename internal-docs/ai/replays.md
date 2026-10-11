# Replay reproduction

- When a report has a "Replay" section or a match ID, reproduce the match exactly before guessing. Build `@aegis/shared` first; use `pnpm --silent replay … --json` to parse output.

  ```sh
  pnpm replay fetch <reportId>
  pnpm replay extract <matchId> --log-dir <dir>
  pnpm replay inputs replays/<file>.json
  pnpm replay run replays/<file>.json --until <N>
  pnpm replay run replays/<file>.json --export replays/<file>.aegis-replay
  pnpm replay scaffold replays/<file>.json --until <N> --out apps/api/src/engine/scenarios/<behavior>.test.ts --issue <id>
  ```

- `run` exits 1 on a divergence. One before input N means the code differs from the server that played the match (`serverRevision`); resolve it before trusting the repro.
- Replace the scaffold's `it.todo` with the expected behaviour (Oxlint rejects `.todo`), confirm it fails, fix, confirm it passes.
- Replays hold both decklists and every action, no names or chat. `replays/` is git-ignored; a committed fixture is the scaffold's trimmed record and nothing else.

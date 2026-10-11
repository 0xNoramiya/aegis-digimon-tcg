# Cards and rules

- Check the exact card in `packages/shared/src/cards/data/cards.json` and its implementation in `apps/api/src/cards/<SET>/`.
- Query local official Q&A, errata, restrictions, and rules:

  ```sh
  node tools/kb/query.mjs card BT20-016 --json
  node tools/kb/query.mjs rules "DNA digivolution" --limit 5 --json
  ```

- Search rules in English; read the full returned text and referenced sections. Chunk IDs are KB references, not printed rule numbers. Card queries do not include the complete printed card text.
- Check official card images at `https://world.digimoncard.com/images/cardlist/card/<CARD-ID>.png` and rulings at `https://world.digimoncard.com/rule/?card_no=<CARD-ID>`. Prefer official sources; do not guess ambiguous behavior.
- The KB in `data/kb/` is a snapshot. `pnpm verify:rules-source` checks rules freshness and requires `pdftotext`; Q&A, errata, and restrictions need their own currency checks. Do not scrape or rebuild the KB as a routine fix. See [KB tooling](../../tools/kb/README.md).
- In conformance tests, use `cite()` with a reviewed literal fingerprint and note; run `node tools/kb/check-conformance-citations.mjs` after citation changes. See [conformance guidance](../../apps/api/src/engine/conformance/README.md).
- Use [verify-card-implementation](../../.agents/skills/verify-card-implementation/SKILL.md) for card behavior and [fix-discord-bug](../../.agents/skills/fix-discord-bug/SKILL.md) for Discord reports. Read the full thread and attachments; follow current paths and session authorization. Production investigation must follow the host's instructions and resource guard.

## Card Changes

- Register executable card behavior exclusively with `registerIrCard(cardId, compiled)`. Do not add a second `registerCard` registration; it is reserved for existing legacy compatibility, engine tests, and justified internal seams.
- Synchronize and check changed card effect snapshots:

  ```sh
  node tools/sync-effects-from-card-modules.mjs --set <SET>
  node tools/sync-effects-from-card-modules.mjs --set <SET> --check
  ```

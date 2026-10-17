# Liberator story battles

The catalog contains 30 mapped encounters across 12 playable characters. Sources are the [official comic](https://digimoncard.com/digimon_liberator/en/comic/), [novel](https://digimoncard.com/digimon_liberator/en/novel/), and official Battle Coverage articles linked by each catalog entry. Chapter names remain in their original language. Cover images reference the corresponding official comic splash or novel thumbnail; the banner uses official artwork. No generated artwork or chapter text is shipped.

Ice Knight, Three Musketeers, and The Crystal Sea Palace use the documented visible starting fields from Battle Coverage. Hidden deck contents and ordering are reconstructed even for these three battles. The other 27 encounters are marked adaptations. These use documented characters and visible cards where available, with playable approximations for missing information. Grouped NPC encounters are represented by one battle; reported defeats become winnable challenges. Fictional card changes are represented using the simulator's printed card behavior.

Research covered 42 novel chapters, 32 TIPS articles, and sampled panels across 50 comic installments. This is a mapped encounter catalog, not a claim of exhaustive panel-by-panel coverage. Progression follows each character's catalog order; it does not establish a single chronology across both media.

The API selects the scenario, decks, opponent, and starting state. Authenticated progress is persisted in `story_battle_completions`; a seat-zero victory unlocks the next encounter for that character. Losses, draws, and surrender do not unlock later battles. The progress endpoint is read-only. Story matches use the existing simulator and bot, disable rollback, and do not update regular match statistics.

Each match shuffles both players' remaining main and Digi-Egg decks using the match seed. Scenario hands, security, trash, and starting fields stay fixed. The shuffled fixture is recorded in the replay so playback preserves the original draw order.

Every playable encounter must supply two legal 50-card main decks across all starting zones. The Arisa rematch reconstruction includes two BT22-042 copies, one on the starting field and one in the draw pile. Deck admission tests validate all encounters, and a room regression verifies that this opponent can be seated.

Guests can play without signing in. A random browser token identifies their server-owned progress in `story_guest_completions`; only its SHA-256 hash is stored in the database. The API verifies prerequisites and records wins for guests as it does for accounts. Signing in switches to separate account progress; clearing browser storage loses access to guest progress.

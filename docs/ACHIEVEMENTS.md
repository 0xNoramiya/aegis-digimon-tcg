# Achievements and trophies

Players earn trophies for tournament placements and for final tournament circuit standings. Ranked seasons grant badges and profile frames, never trophies. The API grants and stores every trophy. The client only displays them on the player's profile.

## Tiers and awards

[TrophyAward](../packages/shared/src/achievements/TrophyAward.ts) is the single mapping from an achievement to a tier. Change a tier there; persisted trophies keep the tier they were granted with.

| Award                  | Source                        | Tier    |
| ---------------------- | ----------------------------- | ------- |
| `tournament_champion`  | Community tournament champion | Gold    |
| `tournament_top_four`  | Community tournament Top 4    | Silver  |
| `tournament_top_eight` | Community tournament Top 8    | Bronze  |
| `circuit_champion`     | Tournament circuit 1st place  | Rainbow |
| `circuit_top_four`     | Tournament circuit Top 4      | Gold    |
| `circuit_top_eight`    | Tournament circuit Top 8      | Silver  |

Tier values are `bronze`, `silver`, `gold` and `rainbow` ([TrophyTier](../packages/shared/src/achievements/TrophyTier.ts)). Single tournaments grant Bronze, Silver and Gold. Only a circuit champion earns Rainbow.

## Community tournaments

The tournament deadline worker runs a `trophies` pass every 15 seconds ([createTournamentTrophySweep](../apps/api/src/achievements/createTournamentTrophySweep.ts)). It picks up finished tournaments without a `tournament_trophy_grants` row, up to 20 per pass, including tournaments that finished before this feature shipped.

- Placements come from [computeTournamentPlacements](../apps/api/src/tournaments/discord/computeTournamentPlacements.ts), the same calculation that drives the Discord results post and placement roles. It does not depend on the tournament being announced on Discord.
- Each account receives at most one trophy per tournament: its highest placement.
- Bots and participants without an account receive nothing.
- The award date is the time of the `tournament_finished` event.
- The pass claims a tournament by inserting its `tournament_trophy_grants` row in the same transaction as the trophies. A concurrent or retried pass skips a claimed tournament, and the `player_trophies` primary key refuses duplicates.

The pass only runs where the deadline worker runs: in production by default, or locally with `TOURNAMENT_SCHEDULER=on`.

## Tournament circuits

The circuit `finalize` pass grants circuit trophies once, in the same transaction that freezes the final circuit leaderboard. The award comes from the frozen position: 1st earns `circuit_champion`, 2nd to 4th `circuit_top_four`, and 5th to 8th `circuit_top_eight`. Tied players share a position, so more than eight players can earn a trophy. A player with 0 points earns nothing. See [tournament circuits](TOURNAMENT_CIRCUITS.md).

## Ranked seasons

Season finalization grants only ranked cosmetics. It does not create trophies. Historical season trophy records are excluded from the trophy cabinet; the legacy database columns remain for storage compatibility.

## Display

`GET /achievements/trophies` returns the signed-in player's trophies, newest first. It requires a session and responds with `private, no-store`. The profile shows each trophy with its image, tier, source tournament name and award date, and an empty state when there are none. Aegis has no public profile yet; when one exists, it can reuse [TrophyCabinet](../apps/web/src/achievements/TrophyCabinet.tsx) with a public read route.

Trophy images are WebP files at 128 and 256 pixels in `apps/web/public/achievements/`. The 1024-pixel source PNGs are not shipped.

## Known limitations

- Trophies are never revoked automatically. Changing a tournament result after the grant leaves existing trophies in place. An administrator must delete the `player_trophies` row by hand.
- A tournament whose grant fails is retried on every pass and logged each time until the cause is fixed.

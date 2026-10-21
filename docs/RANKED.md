# Ranked seasons

Ranked is practice-oriented BO1 matchmaking. Ratings describe Aegis play; tournament and physical-event results are separate sources and never change queue Elo.

## Configuration and rollout

`AEGIS_RANKED_ENABLED=true` enables the new queue and reserved-room admission. The default is disabled. `AEGIS_RANKED_FORMATS` is a comma-separated allowlist, defaulting to `standard`; Unlimited formats are refused. Enable the flag consistently across all processes of a deployment. The client exposes season information at `/ranked`, linked from the play controls and profile.

The API selects authenticated accounts and saved decks, validates the frozen deck against its format and banlist, and reserves two seats in one room. Queue requests cannot provide arbitrary deck contents or account identities. Public ranked room joins cannot bypass reservations while the feature is enabled. Queue operations serialize through a PostgreSQL control row across processes. Queues are scoped to deployment slot and format.

Search starts at a 100-point Elo difference, expands by 50 every 30 seconds, and stops at 400. Both players must have waited through each expansion. Regional preference expands after 60 seconds. South America is the initial selector default; players can change it before searching. The region recorded for season statistics is frozen on first participation across formats.

Waiting clients heartbeat every two seconds and expire after 30 seconds without a heartbeat. Seat reservations last 60 seconds; once both players have claimed seats, readiness has a separate 90-second allowance. Expired reservations requeue opponents still polling. Playing rooms heartbeat every 15 seconds; after two minutes without a heartbeat, maintenance voids the unresolved pair without inventing a result. A linked account cannot reserve another room while its room lease is active. The room lease expires after two minutes without renewal.

## Seasons, rating and clocks

Season 1 starts on 2026-10-12 at 00:00 UTC. Seasons last exactly 56 days. Each account starts at 1000 Elo per format, with K=32 and scores 1, 0.5 and 0. Elo persists between seasons. Season counters start empty; existing historical results are not backfilled into Elo. Leaderboards share placement for equal ratings. Win rate is wins divided by all completed games, including draws. Players with fewer than ten games are provisional and have no placement.

A match belongs to the season in effect when the server starts it. Closing a season waits for its running games. Result recording, match history, rating and seasonal counters commit together, once per room. A surrender after start is a loss. Unrecoverable server failures produce no rated result.

The round clock is 48 wall-clock minutes and continues through animations and reconnects. At expiry the current turn is turn zero, followed by three additional turns. Overtime ends when those turns finish or six more minutes elapse. The room draws the game at the next safe input boundary after outstanding effects and decisions resolve. The existing per-player inactivity clock also runs. The server publishes remaining round time and records timeout draws in replays. Tournament clocks are unchanged.

Tiers are Bronze below 1000, Silver from 1000, Gold from 1200, Platinum from 1400 and Diamond from 1600. Eligible peak rating is tracked starting with the tenth game. Each completed season grants one badge and profile frame per account, taking the highest eligible tier across formats. Grants are idempotent and permanent; one season reward can be equipped at a time from the Rewards tab.

## Discord

Cosmetics do not require Discord. Optional role synchronization uses the linked Discord identity and a bot, with `AEGIS_DISCORD_BOT_TOKEN`, `AEGIS_RANKED_DISCORD_GUILD_ID`, and `AEGIS_RANKED_DISCORD_ROLES` (a JSON object mapping all five tier values to distinct role IDs). The bot needs Manage Roles, with its highest role above every configured reward role. Use dedicated Aegis roles: synchronization removes only configured roles and its previously applied role.

Roles reflect the latest finalized season, including removal when the account did not qualify. Opt-in is explicit, and opting out removes the managed role. A maintenance worker retries failures with exponential backoff, capped at one hour. The UI distinguishes pending and synchronized roles. Missing configuration leaves only Discord synchronization disabled.

## Matchups

Match facts use frozen deck contents, origin, format, region, time and classifier version. Tournament facts are captured per played human game without altering tournament counters or Elo. Bots and voided games are excluded. Archetype classification is deferred; new match facts use unidentified archetypes and classifier version 0. Private decklists and identities are not returned by aggregate endpoints.

Aggregates require at least 30 distinct games and ten distinct participants before showing a win rate. Mirror matches count once toward the sample threshold; outcome percentages use player perspectives. Unidentified archetypes have no published win rate. Ranked and tournament origins are separately selectable.

External data integrations are deferred. Matchup statistics use only Aegis ranked and tournament results.

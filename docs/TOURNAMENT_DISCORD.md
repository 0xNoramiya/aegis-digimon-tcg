# Tournament Discord announcements

The API posts selected tournaments to the community Discord server and keeps tournament roles in sync. A dedicated bot, **Aegis Tournaments**, does the posting through the Discord REST API. It does not run a gateway bot or slash commands.

## What the bot does

| When                                      | What the bot does                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| An admin turns on **Announce on Discord** | Posts the tournament in the announcement channel and opens a thread under that message.                    |
| Every match of a round has its players    | Posts the round's pairings in the thread. Players with a linked Discord account are mentioned.             |
| A player registers, checks in or plays    | Gives the participant role while the tournament is open or running.                                        |
| The tournament finishes                   | Posts the champion, Top 4 and Top 8 in the thread, removes the participant role and gives placement roles. |
| The tournament is cancelled               | Posts a cancellation notice in the thread.                                                                 |

Only admins can turn the flag on, in the tournament's admin controls. Any player can create a community tournament, so the flag keeps the server free of spam.

### Placements

- **Champion:** the tournament winner.
- **Top 4:** the finalist and the semifinal losers of the last bracket. Without a bracket, Swiss ranks 2–4.
- **Top 8:** the quarterfinal losers. Without a bracket, Swiss ranks 5–8.

Placement roles are permanent. A player keeps only their best placement role across all tournaments.

### Rounds

- A round is posted once. The bot waits until every match in the round has both players.
- If the bot catches up on a round that has already finished, it skips that round.
- Players without a linked Discord account appear by their Aegis name.

## Configuration

The sync runs in the tournament deadline worker, about every 15 seconds. It stays off until the token and channel are set.

| Variable                              | Required    | Value                                                                                                     |
| ------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| `AEGIS_TOURNAMENT_DISCORD_BOT_TOKEN`  | Recommended | Token of the dedicated tournament bot. Falls back to `AEGIS_DISCORD_BOT_TOKEN`, then `DISCORD_BOT_TOKEN`. |
| `AEGIS_TOURNAMENT_DISCORD_CHANNEL_ID` | Yes         | Text channel for announcements.                                                                           |
| `AEGIS_TOURNAMENT_DISCORD_GUILD_ID`   | For roles   | Server ID.                                                                                                |
| `AEGIS_TOURNAMENT_DISCORD_ROLES`      | For roles   | JSON object. Keys: `participant`, `champion`, `top_four`, `top_eight`. Any subset works.                  |
| `AEGIS_WEB_URL`                       | Yes in prod | Base URL for tournament links.                                                                            |

Example:

```sh
AEGIS_TOURNAMENT_DISCORD_CHANNEL_ID=123456789012345678
AEGIS_TOURNAMENT_DISCORD_GUILD_ID=123456789012345679
AEGIS_TOURNAMENT_DISCORD_ROLES='{"participant":"223456789012345678","champion":"223456789012345679","top_four":"223456789012345680","top_eight":"223456789012345681"}'
```

If a value is invalid, the API logs an error and keeps the sync off. Other API features keep working.

### Bot permissions

In the announcement channel, the bot needs:

- View Channel
- Send Messages
- Embed Links
- Create Public Threads
- Send Messages in Threads

For roles, the bot needs **Manage Roles**. Its highest role must be above every configured tournament role. Use dedicated roles: the bot adds and removes only the roles in `AEGIS_TOURNAMENT_DISCORD_ROLES`.

## Failures

- Each tournament retries on its own schedule. Backoff starts at 2 minutes and is capped at 1 hour. A `429` waits at least Discord's `Retry-After`.
- A player who has not linked Discord is retried every hour.
- If a post succeeds but saving its state fails, a retry can post the message again.

Persistence is described in [COLLECTIONS.md](../COLLECTIONS.md#tournament-discord-announcements).

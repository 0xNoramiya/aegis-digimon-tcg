# Tournament cancellation

An organizer can cancel a tournament at any time before it finishes, including while games are in progress. The **Cancel tournament** control asks for a reason. If any confrontation is `playing` or `overtime`, the control also warns that cancelling ends those games without a result.

## What a cancellation does

`ParticipantStore.cancelTournament` runs these steps in one transaction:

| Step                                                                                      | Effect                                                                  |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Set `tournaments.status` to `cancelled`                                                   | Every series command now refuses with `tournament_cancelled`            |
| Drop every registered, checked-in or active participant                                   | Nobody holds a slot in the event                                        |
| Void every `allocated`, `room_claimed` or `playing` game (`voidCancelledTournamentGames`) | `result_reason` is `tournament_cancelled`; unused authorizations expire |

It returns the room IDs of the voided games. The arbitration and circuit routes then call `closeCancelledTournamentRooms`, which asks each live room to close through `matchMaker.remoteRoomCall`. A room that already closed is skipped. A failure to close one room is logged and does not fail the command.

The room closes every client with `TOURNAMENT_CANCELLED_CLOSE_CODE` (4411). The client treats this code as final, does not reconnect, and shows **Tournament cancelled**.

If a room still reports a result after the cancellation, the series store refuses it with `tournament_cancelled`. The room logs that refusal at `INFO`, because nothing is left waiting on it. Every other refusal still logs at `ERROR`.

## Why

On 2026-11-09, an organizer cancelled a tournament at 02:07 UTC, two minutes into a round 1 game. Nothing told the room. The players kept playing for 27 minutes, the room's result was refused, and the refusal raised an `ERROR` alert.

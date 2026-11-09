import { matchMaker } from "colyseus";
import { logError } from "#api/logger";
import type { AegisRoom } from "#api/rooms/AegisRoom";

export async function closeCancelledTournamentRooms(roomIds: readonly string[]): Promise<void> {
  await Promise.all(
    roomIds.map(async (roomId) => {
      try {
        const [listing] = await matchMaker.query({ roomId });
        if (!listing) return;
        await matchMaker.remoteRoomCall<AegisRoom, "closeForCancelledTournament">(
          roomId,
          "closeForCancelledTournament",
          [],
        );
      } catch (error) {
        logError(`[tournaments] closing cancelled tournament room ${roomId} failed`, error);
      }
    }),
  );
}

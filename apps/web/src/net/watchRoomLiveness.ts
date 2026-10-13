import { CloseCode } from "@colyseus/sdk";
import type { AegisRoom } from "@/net/client";

const PROBE_INTERVAL_MS = 4_000;
const SILENCE_LIMIT_MS = 10_000;

const isHidden = () => typeof document !== "undefined" && document.hidden;

export function watchRoomLiveness({ room }: { room: AegisRoom }): () => void {
  let probeSentAt: number | undefined;

  const probe = () => {
    probeSentAt = Date.now();
    room.ping(() => {
      probeSentAt = undefined;
    });
  };

  const check = () => {
    if (isHidden()) {
      probeSentAt = undefined;
      return;
    }
    if (probeSentAt === undefined) {
      probe();
      return;
    }
    if (Date.now() - probeSentAt < SILENCE_LIMIT_MS) return;
    stop();
    room.connection.close(CloseCode.MAY_TRY_RECONNECT);
  };

  const probeWhenVisible = () => {
    if (!isHidden()) probe();
  };

  const interval = setInterval(check, PROBE_INTERVAL_MS);
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", probeWhenVisible);
  if (typeof window !== "undefined") window.addEventListener("online", probeWhenVisible);

  function stop() {
    clearInterval(interval);
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", probeWhenVisible);
    if (typeof window !== "undefined") window.removeEventListener("online", probeWhenVisible);
  }

  return stop;
}

import { useEffect } from "react";
import type { AnimationSpeedReport } from "@aegis/shared";
import { getEffectSpeed, subscribeEffectSpeed } from "./pacing";

/**
 * Tell the server this seat's Effect speed on join and on every change. The server holds a
 * timed seat's clock for as long as the seat's animations take at that speed.
 */
export function useAnimationSpeedReport({
  enabled,
  send,
}: {
  enabled: boolean;
  send: ((report: AnimationSpeedReport) => void) | undefined;
}): void {
  useEffect(() => {
    if (!enabled || !send) return;
    send({ speed: getEffectSpeed() });
    return subscribeEffectSpeed((speed) => send({ speed }));
  }, [enabled, send]);
}

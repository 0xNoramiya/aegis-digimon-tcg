import { useEffect } from "react";

export function useScreenWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return;
    let released = false;
    let lock: WakeLockSentinel | undefined;
    const acquire = async (): Promise<void> => {
      if (document.hidden) return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (released) await next.release();
        else lock = next;
      } catch {
        return;
      }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, [active]);
}

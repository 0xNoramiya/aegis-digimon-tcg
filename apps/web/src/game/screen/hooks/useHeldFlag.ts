import { useEffect, useState } from "react";

/** True as soon as `active` is, and for `holdMs` after it last stopped being true. */
export function useHeldFlag(active: boolean, holdMs: number): boolean {
  const [held, setHeld] = useState(active);
  useEffect(() => {
    if (active) {
      setHeld(true);
      return;
    }
    const timer = window.setTimeout(() => setHeld(false), holdMs);
    return () => window.clearTimeout(timer);
  }, [active, holdMs]);
  return active || held;
}

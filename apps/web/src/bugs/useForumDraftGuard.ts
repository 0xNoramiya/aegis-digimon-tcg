import { useEffect, useRef } from "react";
import { FORUM_NAVIGATION_EVENT } from "@/bugs/forumNavigationEvent";

export function useForumDraftGuard({ dirty, busy, message }: { dirty: boolean; busy: boolean; message: string }) {
  const bypass = useRef(false);
  useEffect(() => {
    const protectedPath = location.pathname;
    const guard = (event: Event) => {
      if (bypass.current || (!dirty && !busy)) return;
      if (busy || !window.confirm(message)) {
        event.preventDefault();
        if (location.pathname !== protectedPath) window.history.pushState(null, "", protectedPath);
      }
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!bypass.current && (dirty || busy)) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener(FORUM_NAVIGATION_EVENT, guard);
    return () => {
      window.removeEventListener(FORUM_NAVIGATION_EVENT, guard);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [dirty, busy, message]);
  return bypass;
}

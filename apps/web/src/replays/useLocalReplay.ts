import { useEffect, useState } from "react";
import type { ReadyReplay } from "./files";
import { keepLocalReplay } from "./local";

export type LocalReplayState = "saving" | "saved" | "unavailable";

/** Whether this match's replay is safe in this browser. The room already started the save. */
export function useLocalReplay(replay: ReadyReplay | undefined): LocalReplayState {
  const [state, setState] = useState<LocalReplayState>(replay ? "saving" : "unavailable");
  useEffect(() => {
    if (!replay) {
      setState("unavailable");
      return;
    }
    let active = true;
    setState("saving");
    keepLocalReplay(replay).then(
      () => active && setState("saved"),
      () => active && setState("unavailable"),
    );
    return () => {
      active = false;
    };
  }, [replay]);
  return state;
}

import { useEffect, useRef } from "react";
import { playAttentionSound } from "@/design/sound";

export function useDecisionPing(promptKey: string | undefined): void {
  const previousRef = useRef(promptKey);
  useEffect(() => {
    const opened = promptKey !== undefined && promptKey !== previousRef.current;
    previousRef.current = promptKey;
    if (opened) {
      playAttentionSound("prompt");
    }
  }, [promptKey]);
}

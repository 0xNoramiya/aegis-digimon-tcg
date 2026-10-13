import { useEffect, useState } from "react";
import { isCardDataLoaded } from "@/cardData/isCardDataLoaded";
import { loadCardData } from "@/cardData/loadCardData";

const RETRY_DELAY_MS = 2_000;

export function useCardDataReady(): boolean {
  const [ready, setReady] = useState(isCardDataLoaded);

  useEffect(() => {
    if (ready) {
      return;
    }
    let cancelled = false;
    let retryTimer: number | undefined;
    const load = () => {
      loadCardData()
        .then(() => {
          if (!cancelled) {
            setReady(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            retryTimer = window.setTimeout(load, RETRY_DELAY_MS);
          }
        });
    };
    load();
    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
    };
  }, [ready]);

  return ready;
}

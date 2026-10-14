import { useEffect, useState } from "react";
import { famousDeckCache, type FamousDeckCatalog } from "@/game/famousDeckCache";
import { loadFamousDecks } from "@/game/loadFamousDecks";

const RETRY_DELAY_MS = 2_000;

export function useFamousDecks(): FamousDeckCatalog | undefined {
  const [catalog, setCatalog] = useState(famousDeckCache.catalog);

  useEffect(() => {
    if (catalog) {
      return;
    }
    let cancelled = false;
    let retryTimer: number | undefined;
    const load = () => {
      loadFamousDecks()
        .then((loaded) => {
          if (!cancelled) {
            setCatalog(loaded);
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
  }, [catalog]);

  return catalog;
}

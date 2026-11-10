import { useSyncExternalStore } from "react";
import { fieldScrollArrowsPreference } from "@/game/fieldScrollArrows/fieldScrollArrowsPreference";

export function useFieldScrollArrows(): boolean {
  return useSyncExternalStore(fieldScrollArrowsPreference.subscribe, fieldScrollArrowsPreference.isShown, () => true);
}

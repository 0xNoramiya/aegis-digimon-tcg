import { useSyncExternalStore } from "react";

export enum HandSortMode {
  Type = "type",
  Cost = "cost",
  Color = "color",
}

export const HAND_SORT_MODES: readonly HandSortMode[] = [HandSortMode.Type, HandSortMode.Cost, HandSortMode.Color];

const STORAGE_KEY = "aegis.hand.sort-mode";

const listeners = new Set<() => void>();

function readHandSortMode(): HandSortMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return HAND_SORT_MODES.find((mode) => mode === stored) ?? HandSortMode.Type;
  } catch {
    return HandSortMode.Type;
  }
}

let current = readHandSortMode();

/** The order the sort button and the "Keep hand sorted" setting apply. */
export function getHandSortMode(): HandSortMode {
  return current;
}

export function setHandSortMode(next: HandSortMode): void {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Keep the current-session choice when storage is unavailable.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useHandSortMode(): HandSortMode {
  return useSyncExternalStore(subscribe, getHandSortMode, () => HandSortMode.Type);
}

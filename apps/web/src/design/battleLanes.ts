import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aegis.battle-lanes";

/**
 * How many lanes each organized battle area draws. Two keeps Tamers and Options in a
 * lane of their own beside or under the Digimon; one puts them after the Digimon in a
 * single lane. Every screen size draws the saved choice.
 */
export enum BattleLanes {
  One = "one",
  Two = "two",
}

const listeners = new Set<() => void>();

function readBattleLanes(): BattleLanes {
  try {
    return localStorage.getItem(STORAGE_KEY) === BattleLanes.One ? BattleLanes.One : BattleLanes.Two;
  } catch {
    return BattleLanes.Two;
  }
}

let currentLanes = readBattleLanes();

export function getBattleLanes(): BattleLanes {
  return currentLanes;
}

export function setBattleLanes(next: BattleLanes): void {
  currentLanes = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Keep the current-session choice when storage is unavailable.
  }
  for (const listener of listeners) listener();
}

export function subscribeBattleLanes(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBattleLanePreference(): BattleLanes {
  return useSyncExternalStore(subscribeBattleLanes, getBattleLanes, () => BattleLanes.Two);
}

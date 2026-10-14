import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aegis.chat.sound";
const ON = "on";
const OFF = "off";

const listeners = new Set<() => void>();

function readChatSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === ON;
  } catch {
    return false;
  }
}

let currentEnabled = readChatSoundEnabled();

export function isChatSoundEnabled(): boolean {
  return currentEnabled;
}

function persistChatSoundEnabled(next: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, next ? ON : OFF);
  } catch {
    return;
  }
}

export function setChatSoundEnabled(next: boolean): void {
  currentEnabled = next;
  persistChatSoundEnabled(next);
  for (const listener of listeners) {
    listener();
  }
}

function subscribeChatSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useChatSoundEnabled(): boolean {
  return useSyncExternalStore(subscribeChatSound, isChatSoundEnabled, () => false);
}

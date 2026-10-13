const STORAGE_KEY = "aegis.keep-awake.enabled";

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    return;
  }
}

let keepAwakeEnabled = readStored() !== "false";

export function isKeepAwakeEnabled(): boolean {
  return keepAwakeEnabled;
}

export function setKeepAwakeEnabled(next: boolean): void {
  keepAwakeEnabled = next;
  writeStored(String(next));
}

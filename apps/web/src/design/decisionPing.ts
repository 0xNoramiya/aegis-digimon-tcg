const STORAGE_KEY = "aegis.decision-ping.enabled";

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

let decisionPingEnabled = readStored() !== "false";

export function isDecisionPingEnabled(): boolean {
  return decisionPingEnabled;
}

export function setDecisionPingEnabled(next: boolean): void {
  decisionPingEnabled = next;
  writeStored(String(next));
}

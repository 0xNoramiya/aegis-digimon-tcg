import type { GameEngine } from "#api/engine/GameEngine";
import { continuousSkipVerifier } from "#api/engine/mutationClock/continuousSkipVerifier";

type Fingerprint = Map<string, string>;
type Verification = { verified: number; mismatches: string[] };

export function installContinuousSkipVerification(): Verification {
  const verification: Verification = { verified: 0, mismatches: [] };
  continuousSkipVerifier.verify = async ({ engine, reuse, recompute }) => {
    const restoreIdentities = captureIdentities(engine);
    reuse();
    const reused = fingerprintEngine(engine);
    restoreIdentities();
    await recompute();
    const recomputed = fingerprintEngine(engine);
    verification.verified++;
    const changed = [...new Set([...reused.keys(), ...recomputed.keys()])].filter(
      (part) => reused.get(part) !== recomputed.get(part),
    );
    if (changed.length > 0) {
      const mismatch = `A reused continuous recompute differs from a real one in ${changed.join(", ")}`;
      verification.mismatches.push(mismatch);
      throw new Error(mismatch);
    }
  };
  return verification;
}

function captureIdentities(engine: GameEngine): () => void {
  const ledgers: object[] = [engine.subTriggers, engine.modifiers, engine.continuous];
  const restoreLedgers = ledgers.map((ledger) => {
    const record = ledger as Record<string, unknown>;
    const fields = Object.entries(record)
      .filter(([, value]) => typeof value !== "function")
      .map(([name, value]) => {
        if (!Array.isArray(value)) return () => void (record[name] = value);
        const entries = value.map((entry: { id?: number; grantId?: number }) => ({
          entry,
          id: entry?.id,
          grantId: entry?.grantId,
        }));
        return () => {
          record[name] = entries.map(({ entry, id, grantId }) => {
            if (id !== undefined) entry.id = id;
            if (grantId !== undefined) entry.grantId = grantId;
            return entry;
          });
        };
      });
    return () => fields.forEach((restoreField) => restoreField());
  });
  const { windowTokenSeq, continuousRecomputeKey, continuousIdentitySpan } = engine;
  return () => {
    restoreLedgers.forEach((restoreLedger) => restoreLedger());
    engine.windowTokenSeq = windowTokenSeq;
    engine.continuousRecomputeKey = continuousRecomputeKey;
    engine.continuousIdentitySpan = continuousIdentitySpan;
  };
}

function fingerprintEngine(engine: GameEngine): Fingerprint {
  const parts = new Map<string, string>();
  const ledgers = new Set<object>([
    engine.modifiers,
    engine.continuous,
    engine.memory,
    engine.tracker,
    engine.subTriggers,
    engine.securityDp,
    engine.deletionMaxDp,
    engine.dpDeleteBudget,
  ]);
  const ownFields = (ledger: object): Record<string, unknown> =>
    Object.fromEntries(
      Object.entries(ledger).filter(([, value]) => typeof value !== "function" && !ledgers.has(value as object)),
    );
  const components: [string, () => unknown][] = [
    ["state", () => engine.state.toJSON()],
    ["modifiers", () => ownFields(engine.modifiers)],
    ["continuous", () => ownFields(engine.continuous)],
    ["memory", () => ownFields(engine.memory)],
    ["tracker", () => ownFields(engine.tracker)],
    ["subTriggers", () => ownFields(engine.subTriggers)],
    ["securityDp", () => ownFields(engine.securityDp)],
    ["deletionMaxDp", () => ownFields(engine.deletionMaxDp)],
    ["dpDeleteBudget", () => ownFields(engine.dpDeleteBudget)],
    ["core", () => engine.getSnapshotCoreState()],
  ];
  for (const [name, read] of components) {
    const value = read();
    if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Map)) {
      for (const [key, entry] of Object.entries(value)) {
        parts.set(`${name}.${key}`, stableText(entry, new Set()));
      }
    } else {
      parts.set(name, stableText(value, new Set()));
    }
  }
  return parts;
}

function stableText(value: unknown, ancestors: Set<object>): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "function") return `function:${value.name}:${value.toString().length}`;
  if (typeof value !== "object") return String(value);
  if (ancestors.has(value)) return "<cycle>";
  ancestors.add(value);
  let text: string;
  if (value instanceof Map) {
    text = `Map{${[...value]
      .map(([key, entry]) => `${stableText(key, ancestors)}=>${stableText(entry, ancestors)}`)
      .join(",")}}`;
  } else if (value instanceof Set) {
    text = `Set{${[...value].map((entry) => stableText(entry, ancestors)).join(",")}}`;
  } else if (Array.isArray(value)) {
    text = `[${value.map((entry) => stableText(entry, ancestors)).join(",")}]`;
  } else if (value instanceof Promise) {
    text = "<promise>";
  } else if (
    typeof (value as { toJSON?: unknown }).toJSON === "function" &&
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    text = `${value.constructor.name}:${stableText((value as { toJSON: () => unknown }).toJSON(), ancestors)}`;
  } else {
    const record = value as Record<string, unknown>;
    text = `{${Object.keys(record)
      .sort()
      .map((key) => `${key}:${stableText(record[key], ancestors)}`)
      .join(",")}}`;
  }
  ancestors.delete(value);
  return text;
}

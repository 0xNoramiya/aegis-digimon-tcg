import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { type BoardSpec, type EngineSetup, settle, setupEngine } from "../testkit/harness.js";

// Feedback #5 follow-up: an "[End of Your Turn] ... this Digimon may attack" effect must not ask
// "attack?" when the Digimon can't attack (suspended), the same way ＜Execute＞ no longer does.
// KB Q2490 (BT15-004): such an effect "does not allow you to attack with Digimon that are in a
// state where they can't attack".
const DUMMY = "BT1-009";

function attackPrompts(s: EngineSetup, sourceCardId: string): number {
  return s.decisions.filter(({ req }) => req.sourceCardId === sourceCardId && req.kind === "optional").length;
}

type Host = { card: string; under?: string[]; linked?: { card: string }[] };

const cases: { cardId: string; label: string; host: Host }[] = [
  { cardId: "BT14-013", label: "Tyrannomon inherited", host: { card: "BT1-016", under: ["BT14-013"] } },
  { cardId: "BT15-004", label: "Motimon inherited", host: { card: "BT1-066", under: ["BT15-004"] } },
  { cardId: "BT23-009", label: "Coachmon link", host: { card: "BT21-009", linked: [{ card: "BT23-009" }] } },
  { cardId: "EX10-009", label: "Creepymon", host: { card: "EX10-009" } },
  { cardId: "EX12-019", label: "Nezhamon ＜Engage＞", host: { card: "EX12-019" } },
  { cardId: "EX12-060", label: "Chaosdramon ＜Engage＞", host: { card: "EX12-060" } },
  { cardId: "ST22-08", label: "Offensive Plug-In V link", host: { card: "ST22-03", linked: [{ card: "ST22-08" }] } },
  { cardId: "EX13-013", label: "WarGrowlmon ＜Engage＞", host: { card: "EX13-013" } },
];

async function endTurnWith(host: Host, suspended: boolean): Promise<EngineSetup> {
  const fixture: BoardSpec = {
    0: { battleArea: [{ ...host, as: "attacker", suspended }], deck: Array<string>(5).fill(DUMMY) },
    1: {
      battleArea: [{ card: DUMMY, as: "defender", dp: 1000, suspended: true }],
      security: [DUMMY, DUMMY, DUMMY],
      deck: Array<string>(5).fill(DUMMY),
    },
  };
  const s = setupEngine(fixture, { autoAcceptOptional: true, autoSelectCards: true });
  await s.ready();
  await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
  await settle(() => s.state.pendingDecision === undefined);
  return s;
}

describe("End-of-turn 'may attack' with a Digimon that can't attack", () => {
  it.each(cases)("$cardId $label: no attack prompt while suspended", async ({ cardId, host }) => {
    const s = await endTurnWith(host, true);

    expect(attackPrompts(s, cardId)).toBe(0);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
  });

  it.each(cases)("$cardId $label: asks and attacks while unsuspended", async ({ cardId, host }) => {
    const s = await endTurnWith(host, false);

    expect(attackPrompts(s, cardId)).toBeGreaterThan(0);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
  });
});

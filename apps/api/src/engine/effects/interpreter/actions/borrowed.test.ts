import { expect, it } from "vitest";
import type { Action } from "@aegis/shared";
import { setupEngine } from "../../../testkit/harness.js";
import { internalsOf } from "../../../testkit/internals.js";
import { runActivateForeignEffect } from "./borrowed.js";
import "../../../../cards/index.js";

// Controlled shared-action comparisons isolate usage ownership from the copier's outer OPT.
it.each([
  { transferred: true, lenderSource: false, spent: true },
  { transferred: true, lenderSource: false, spent: false },
  { transferred: false, lenderSource: false, spent: true },
  { transferred: false, lenderSource: false, spent: false },
  { transferred: true, lenderSource: true, spent: true },
  { transferred: true, lenderSource: true, spent: false },
])(
  "borrowed OPT ownership transfer=$transferred lenderSource=$lenderSource spent=$spent",
  async ({ transferred, lenderSource, spent }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-054", as: "host", suspended: true },
            { card: "BT19-064", as: "lender", suspended: true },
            { card: "LM-058", as: "payment" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    await s.ready();
    const engine = internalsOf(s.engine);
    const ctx = engine.buildEffectContext(engine.cardSourceOf(s.perm("host").topCard), {});
    const source = s.perm("lender").topCard.instanceId;
    const key = "BT19-064/ir-shared-0";
    if (spent) ctx.usage!.register(source, key);
    const action: Extract<Action, { kind: "ActivateForeignEffect" }> = {
      kind: "ActivateForeignEffect",
      zone: "battleArea",
      fromTriggers: ["WhenDigivolving"],
      filter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Justimon: Blitz Arm"], match: "nameExact" }],
      },
      count: 1,
      ...(transferred ? { asEffectOf: "this Digimon" } : {}),
      ...(lenderSource ? { useLenderAsSource: true } : {}),
    };
    await runActivateForeignEffect(ctx, action);
    const copied = transferred && !lenderSource;
    expect(ctx.usage!.count(source, key)).toBe(copied ? Number(spent) : 1);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual(
      copied || !spent ? [s.inst("payment").instanceId] : [],
    );
    expect(s.perm("host").isSuspended).toBe(!copied);
    expect(s.perm("lender").isSuspended).toBe(copied || spent);
  },
);

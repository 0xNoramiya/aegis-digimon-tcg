import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

const ZANBAMON = "BT18-085";
const BAALMON = "BT10-081";
const THREE_COLOR_TRASH = [{ card: "BT1-030" }, { card: "BT1-016" }, { card: "BT1-089" }];

async function memorySpentDigivolving(
  battleArea: Array<{ card: string; as?: string }>,
  hand: Array<{ card: string; as: string }>,
  into: string,
) {
  const s = setupEngine({ 0: { battleArea, hand }, 1: { trash: THREE_COLOR_TRASH } }, { autoSelectCards: true });
  await s.ready();
  s.state.memory = 10;
  await s.engine.recomputeContinuousEffects();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("into").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === into && s.state.pendingDecision === undefined, 400);
  return 10 - s.state.memory;
}

describe("Zanbamon digivolution cost counts the colors in the opponent's trash", () => {
  it("costs 1 from hand against 3 trash colors", async () => {
    expect(
      await memorySpentDigivolving([{ card: BAALMON, as: "base" }], [{ card: ZANBAMON, as: "into" }], ZANBAMON),
    ).toBe(1);
  });

  it("costs the same 1 when another Zanbamon is already in play", async () => {
    expect(
      await memorySpentDigivolving(
        [{ card: ZANBAMON }, { card: BAALMON, as: "base" }],
        [{ card: ZANBAMON, as: "into" }],
        ZANBAMON,
      ),
    ).toBe(1);
  });

  it("does not discount digivolving into another card while Zanbamon is in play", async () => {
    expect(
      await memorySpentDigivolving(
        [{ card: ZANBAMON }, { card: BAALMON, as: "base" }],
        [{ card: "BT10-082", as: "into" }],
        "BT10-082",
      ),
    ).toBe(3);
  });
});

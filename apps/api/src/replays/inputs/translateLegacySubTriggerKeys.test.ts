import { describe, expect, it } from "vitest";
import type { Intent } from "@aegis/shared";
import { translateLegacySubTriggerKeys } from "#api/replays/inputs/translateLegacySubTriggerKeys";

const saneiketsu = "s1-42::subtrigger/whenPlayed~perm-4~s1-42~s1-42%2FEX12-071%2Fir-35-1%2F0/whenPlayed";
const gokuumon = "s1-7::EX12-015/ir-6-0";
const onceWatcher = "s0-28::subtrigger/opt/s0-28/printed/BT21-078/ir-35-0/s0-28/BT21-078/ir-35-0/0";

function buildOrder(order: string[], optionalAnswers?: Record<string, boolean>): Intent {
  return {
    type: "respondDecision",
    decisionId: "dec-5",
    response: { kind: "orderTriggers", order, ...(optionalAnswers === undefined ? {} : { optionalAnswers }) },
  };
}

describe("translateLegacySubTriggerKeys", () => {
  it("maps a recorded counter key to the one offered stable key of the same source and description", () => {
    const recorded = buildOrder([gokuumon, "s1-42::subtrigger/86/whenPlayed"], {
      "s1-42::subtrigger/86/whenPlayed": true,
    });
    expect(
      translateLegacySubTriggerKeys(recorded, { decisionId: "dec-5", triggerKeys: [gokuumon, saneiketsu] }),
    ).toEqual(buildOrder([gokuumon, saneiketsu], { [saneiketsu]: true }));
  });

  it("follows an activation suffix the stable key gained in the same window", () => {
    const recorded = buildOrder(["s1-42::subtrigger/792/whenPlayed"]);
    const offered = `${saneiketsu}/activation-2`;
    expect(translateLegacySubTriggerKeys(recorded, { decisionId: "dec-5", triggerKeys: [offered] })).toEqual(
      buildOrder([offered]),
    );
  });

  it("leaves keys that are offered, once-per-turn, or ambiguous unchanged", () => {
    const recorded = buildOrder([gokuumon, onceWatcher, "s1-42::subtrigger/86/whenPlayed"]);
    const offered = [gokuumon, onceWatcher, saneiketsu, `${saneiketsu.replace("perm-4", "perm-9")}`];
    expect(translateLegacySubTriggerKeys(recorded, { decisionId: "dec-5", triggerKeys: offered })).toEqual(recorded);
  });

  it("does not map two recorded keys onto one offered key", () => {
    const recorded = buildOrder(["s1-42::subtrigger/86/whenPlayed", "s1-42::subtrigger/87/whenPlayed"]);
    expect(translateLegacySubTriggerKeys(recorded, { decisionId: "dec-5", triggerKeys: [saneiketsu] })).toEqual(
      recorded,
    );
  });

  it("only answers the decision that is open", () => {
    const recorded = buildOrder(["s1-42::subtrigger/86/whenPlayed"]);
    expect(translateLegacySubTriggerKeys(recorded, { decisionId: "dec-6", triggerKeys: [saneiketsu] })).toEqual(
      recorded,
    );
    expect(translateLegacySubTriggerKeys(recorded, undefined)).toEqual(recorded);
  });
});

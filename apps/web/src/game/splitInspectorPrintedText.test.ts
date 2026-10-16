import { expect, it } from "vitest";
import { splitInspectorPrintedText } from "@/game/splitInspectorPrintedText";
import { getInspectorMarker } from "@/game/getInspectorMarker";

it("moves evolution requirements without moving when-digivolving effects", () => {
  const requirements =
    "[Digivolve] Lv.6 w/[DATA SQUAD] trait: Cost 5 [Burst Digivolve] [Rosemon]: Cost 0 by returning 1 [Yoshino Fujieda] to the hand.";
  const effects = "[When Digivolving] You may suspend 2 Digimon.\n[When Attacking] [Once Per Turn] Draw 1.";
  expect(splitInspectorPrintedText({ text: `${requirements}\n\n${effects}` })).toEqual({ requirements, effects });
});

it("keeps ambiguous and requirement-only text visible", () => {
  for (const text of [
    "[Digivolve] Lv.3: Cost 2",
    "[Digivolve] Lv.3: Cost 2\n\n＜Blocker＞\n[On Play] Draw 1.",
    "[When Digivolving] Draw 1.",
  ]) {
    expect(splitInspectorPrintedText({ text })).toEqual({ requirements: "", effects: text });
  }
});

it("separates translated evolution text and classifies translated timings", () => {
  expect(splitInspectorPrintedText({ text: "[进化]Lv.3：费用2\n\n[进化时]抽1张卡" })).toEqual({
    requirements: "[进化]Lv.3：费用2",
    effects: "[进化时]抽1张卡",
  });
  expect(getInspectorMarker({ text: "[攻击时]" })).toBe("attack");
  expect(getInspectorMarker({ text: "[进化时]" })).toBe("evolution");
  expect(getInspectorMarker({ text: "[Once Per Turn]" })).toBe("limit");
  expect(getInspectorMarker({ text: "[DATA SQUAD]" })).toBeUndefined();
  expect(getInspectorMarker({ text: "[Rosemon]" })).toBeUndefined();
});

it.each(["[Trash]", "[手牌]", "[废弃区]", "[养成]"])("recognizes activation zone %s", (text) => {
  expect(getInspectorMarker({ text })).toBe("timing");
});

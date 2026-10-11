import { expect, it } from "vitest";
import { Zone } from "@aegis/shared";
import "../../cards/index.js";
import { setupEngine } from "../testkit/harness.js";
import { advance } from "../testkit/advance.js";
import { beginResolvingWindow, endResolvingWindow } from "./windows.js";
import { extractCardById, insertCard } from "../state/access.js";
import { pendingEffectCandidates } from "./pendingEffectCandidates.js";
import { subTriggerIdentity } from "./subTriggerIdentity.js";

it.each(["pending", "active", "completed", "left", "returned"] as const)(
  "pending discard display provenance: %s physical occurrence",
  async (mode) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-082", as: "host", under: [{ card: "EX7-071", as: "source" }] }] },
    });
    await s.ready();
    const id = s.inst("source").instanceId;
    const spec = {
      seat: 0 as const,
      kind: "selectCards" as const,
      promptText: "Choose",
      options: { candidateInstanceIds: [id], visibleInstanceIds: [id] },
    };
    expect(pendingEffectCandidates(s.engine, spec)).toEqual([]);
    const outer = beginResolvingWindow(s.engine);
    s.engine.effectResolutionDepth += 1;
    try {
      await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [id], 0);
      expect(pendingEffectCandidates(s.engine, spec)).toEqual([id]);
      const item = s.engine.pendingWindowSubTriggers.find((candidate) => candidate.sub.sourceInstanceId === id)!;
      expect(item).toBeDefined();
      if (mode === "active") item.activationStarted = true;
      if (mode === "completed") s.engine.consumedSubTriggerKeys.add(subTriggerIdentity(item.sub, item.ctx.trigger));
      if (mode === "left" || mode === "returned") {
        const card = extractCardById(s.state.players[0]!, Zone.Trash, id)!;
        if (mode === "returned") insertCard(s.state.players[0]!, Zone.Trash, card);
        else insertCard(s.state.players[0]!, Zone.Hand, card);
      }
      expect(pendingEffectCandidates(s.engine, spec)).toEqual(mode === "pending" ? [id] : []);
      expect(
        pendingEffectCandidates(s.engine, { ...spec, options: { candidateInstanceIds: [id], visibleInstanceIds: [] } }),
      ).toEqual([]);
      expect(pendingEffectCandidates(s.engine, { ...spec, options: { candidateInstanceIds: ["unknown"] } })).toEqual(
        [],
      );
    } finally {
      s.engine.effectResolutionDepth -= 1;
      endResolvingWindow(s.engine, outer);
    }
    expect(pendingEffectCandidates(s.engine, spec)).toEqual([]);
  },
);

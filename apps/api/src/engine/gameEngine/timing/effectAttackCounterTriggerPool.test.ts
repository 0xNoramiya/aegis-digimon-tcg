import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../../cards/index.js";
import { advance } from "../../testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../../testkit/harness.js";
import { observe } from "../../testkit/observe.js";

// Discord 1558478403219488899: a Counter-timing [When Digivolving] window opened inside an
// effect-ordered attack collected the watchers its play armed (Keenan Crier) but left the played
// Digimon's [On Play] parked until after Counter Timing. Both trigger on one play (CR 15-4).
describe("[When Digivolving] window inside an effect-ordered attack", () => {
  it("pools the played Digimon's [On Play] with the watchers that play armed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX13-051", as: "guardromon", under: ["BT16-005", "EX13-047"] },
            { card: "BT13-102", as: "keenan" },
          ],
          hand: [
            { card: "BT25-054", as: "greatGrizzlymon" },
            { card: "BT22-052", as: "leopardmon" },
            { card: "EX13-047", as: "gotsumon" },
          ],
          security: ["BT1-085", "BT1-085"],
          deck: ["BT1-085", "BT1-085", "BT1-085", "BT1-085", "BT1-085", "BT1-085"],
        },
        1: {
          battleArea: [{ card: "BT26-072", as: "peckmon" }],
          eggDeck: ["BT1-001"],
          security: ["BT1-085", "BT1-085"],
          deck: ["BT1-085", "BT1-085", "BT1-085"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false, declineDigiXros: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 4;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // GreatGrizzlymon gives Peckmon "[Start of Your Main Phase] This Digimon attacks."
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guardromon").permanentId,
        instanceId: s.inst("greatGrizzlymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.pendingDecision === undefined && s.state.phase === Phase.Main);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settleAcrossTimers(() => s.events.some((event) => event.kind === "counterWindowOpened"));

    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: s.inst("leopardmon").instanceId,
        effectKey: `blast-digivolve:${s.perm("guardromon").permanentId}`,
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(
      () =>
        s.state.pendingDecision?.kind === "orderTriggers" || s.events.some((event) => event.kind === "counterResolved"),
    );

    expect(s.state.pendingDecision).toMatchObject({ kind: "orderTriggers", seat: 0 });
    const prompt = s.decisions.find(({ req }) => req.kind === "orderTriggers")!.req;
    expect([...(prompt.options?.triggerCardIds ?? [])].sort()).toEqual(["BT13-102", "EX13-047"]);
    expect(s.events.some((event) => event.kind === "counterResolved")).toBe(false);

    const gotsumonKey = prompt.options!.triggerKeys![prompt.options!.triggerCardIds!.indexOf("EX13-047")]!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: { kind: "orderTriggers", order: [gotsumonKey] },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.events.flatMap((event) =>
        event.kind === "effectResolved" && ["EX13-047", "BT13-102"].includes(event.sourceCardId)
          ? [event.sourceCardId]
          : event.kind === "counterResolved"
            ? ["counterResolved"]
            : [],
      ),
    ).toEqual(["EX13-047", "BT13-102", "counterResolved"]);
    expect(s.perm("keenan").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  });
});

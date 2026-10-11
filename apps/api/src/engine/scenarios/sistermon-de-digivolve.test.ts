import type { ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { setupEngine, settle, type SetupEngineOptions } from "../testkit/harness.js";

// Feedback report 13 (production match 8a48fc6f-d0e8-4006-b9ea-a516b80c4656): EX12-059
// ＜De-Digivolve 3＞ on EX13-065 stacked over BT23-076 trashed nothing. CR 16-12-4: <De-Digivolve>
// can't trash cards from level 3 cards or lower, and both Sistermon cards are level 3.
describe("Machinedramon De-Digivolve against Sistermon Blanc (Awakened)", () => {
  it.each([
    { target: "sistermon", trashed: [], top: "EX13-065", stack: ["BT23-076"] },
    { target: "baohuckmon", trashed: ["BT13-013"], top: "EX13-009", stack: [] },
  ])("De-Digivolve 3 on $target trashes $trashed", async ({ target, trashed, top, stack }) => {
    const preferred: string[] = [];
    const responses: SetupEngineOptions = {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: preferred,
    };
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-059", as: "machinedramon" }],
          eggDeck: ["BT1-001"],
          deck: Array(12).fill("BT1-001"),
          security: 5,
        },
        1: {
          battleArea: [
            { card: "EX13-065", as: "sistermon", under: ["BT23-076"] },
            { card: "BT13-013", as: "baohuckmon", under: ["EX13-009"] },
            { card: "EX13-009", as: "huckmon" },
          ],
          eggDeck: ["BT1-001"],
          deck: Array(12).fill("BT1-001"),
          security: 5,
        },
      },
      responses,
    );
    preferred.push(s.perm(target).topCard.instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("machinedramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX12-059"),
    );

    const targetRequest = s.decisions.find(
      ({ seat, req }) => seat === 0 && req.kind === "chooseTargets" && req.promptText === "Machinedramon",
    );
    expect(targetRequest?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("sistermon").permanentId, s.perm("baohuckmon").permanentId]),
    );
    expect(
      s.events
        .filter(
          (event): event is Extract<ServerEvent, { kind: "cardsMoved" }> =>
            event.kind === "cardsMoved" && event.strippedStackTops?.reason === "deDigivolve",
        )
        .flatMap((event) => event.cardIds ?? []),
    ).toEqual(trashed);
    expect(s.perm(target).topCard.cardId).toBe(top);
    expect(s.perm(target).stack.map((card) => card.cardId)).toEqual(stack);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(trashed);
  });
});

import { Phase, type GameState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { seatClients } from "../testkit/seatClients.js";

const ADISTAKTO = "dev-security-leak-adistakto";
const MONODRAMON = "dev-field-1-security-leak-monodramon";
const FACE_UP_SECURITY = "dev-security-leak-security-1-face-up";

/** Every security card of `owner` that `seen` holds with an identity while it is face down. */
function faceDownIdentities(seen: GameState, ownerSeat: 0 | 1): string[] {
  const owner = seen.players[ownerSeat]!;
  const raw = Array.from(owner.security).filter((card) => !card.faceUp && (card.cardId || card.artId));
  const projected = Array.from(owner.securityView).filter(
    (card) => !card.faceUp && (card.instanceId || card.cardId || card.artId),
  );
  return [...raw, ...projected].map((card) => card.instanceId || "(projection)");
}

// Hidden information: a card both seats saw on the field goes face down into the bot's security,
// which already shows one card face up. No client may receive that card's identity there.
describe("Known card placed face down into a partly face-up security stack", () => {
  it("keeps Monodramon's identity out of both clients after Lónkhē Adistakto places it", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    const clients = seatClients(s.engine, s.state);
    layDevScenario("arena-security-leak-known-card-face-down", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => clients.patch() && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    clients.patch();
    const bot = s.state.players[1]!;
    for (const seat of [0, 1] as const) {
      const seen = clients.stateFor(seat).players[1]!;
      expect(seen.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-009"]);
      expect(seen.securityView[1]).toMatchObject({ instanceId: FACE_UP_SECURITY, cardId: "BT1-010", faceUp: true });
    }

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ADISTAKTO })).toEqual({ ok: true });
    await settle(
      () =>
        clients.patch() &&
        bot.battleArea.length === 0 &&
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some((card) => card.instanceId === ADISTAKTO),
    );
    clients.patch();

    expect(bot.security.map((card) => [card.instanceId, card.faceUp])).toEqual([
      [MONODRAMON, false],
      ["dev-security-leak-security-1-0", false],
      [FACE_UP_SECURITY, true],
      ["dev-security-leak-security-1-2", false],
    ]);
    expect(s.state.memory).toBe(2);
    expect(clients.decoderErrors).toEqual([]);
    for (const seat of [0, 1] as const) expect(faceDownIdentities(clients.stateFor(seat), 1)).toEqual([]);
    const human = clients.stateFor(0).players[1]!;
    expect(human.security).toHaveLength(0);
    expect(human.securityCount).toBe(4);
    expect(human.securityView.map((card) => [card.instanceId, card.cardId, card.faceUp])).toEqual([
      ["", "", false],
      ["", "", false],
      [FACE_UP_SECURITY, "BT1-010", true],
      ["", "", false],
    ]);
    const ownerCopy = clients.stateFor(1).players[1]!;
    expect(Array.from(ownerCopy.security, (card) => card.instanceId)).toEqual(
      bot.security.map((card) => card.instanceId),
    );

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    s.engine.expireMatchTimer(0);
    await loop;
    clients.restore();
  });
});

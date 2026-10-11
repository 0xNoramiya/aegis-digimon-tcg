import fixtureBt13OmnimonLaterTokenRush from "./bt13-omnimon-later-token-rush.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const TOKEN_ID = "TOKEN-AthoRenePor-Token";

it("stages Omnimon so the token Jesmon plays afterwards still gains Rush and attacks", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
  );
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startScenarioFixture(fixtureBt13OmnimonLaterTokenRush);
  try {
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    expect(human.breeding?.topCard.cardId).toBe("BT13-007");
    expect(human.breeding?.stack.map(({ instanceId }) => instanceId)).toEqual([
      fixtureInstanceId("omnimon-rush-egg-card"),
      fixtureInstanceId("own-source-omnimon-rush-drasil-0-card"),
    ]);
    expect(s.state.memory).toBe(10);

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: fixtureInstanceId("omnimon-rush-omnimon-card") }),
    ).toEqual({ ok: true });
    const token = () => human.battleArea.find(({ topCard }) => topCard.cardId === TOKEN_ID);
    await settle(() => token() !== undefined && s.state.pendingDecision === undefined);

    expect(human.breeding).toBeUndefined();
    expect(human.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining(["BT13-112", "EX13-014", TOKEN_ID]),
    );
    expect(opponent.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).hasKeyword(token()!, "Rush")).toBe(true);

    const securityBefore = opponent.security.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: token()!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(opponent.security).toHaveLength(securityBefore - 1);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});

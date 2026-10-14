import fixture from "../../api/src/engine/scenarios/security-removal-by-effect-to-hand-or-deck.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

const KYO_ID = fixturePermanentId("kyo");
const COUGARMON_ID = fixturePermanentId("cougarmon");
const OPPONENT_DIGIMON_ID = fixturePermanentId("opponent-digimon");
const TOP_SECURITY = fixtureInstanceId("kyo-top-security");
const PLACED_DECK_CARD = fixtureInstanceId("kyo-placed-deck-card");

test("Kyo gives Security A. -1 when Murasamemon's cost adds the top security card to the hand", async ({
  scenario,
}) => {
  await scenario.openFixture(fixture);
  await scenario.resolveUntil(
    (s) => s.phase === "Main" && !s.pendingDecision,
    (decision) => (decision.kind === "selectCards" ? { cardId: "P-236" } : {}),
  );
  await scenario.evolve("Murasamemon", COUGARMON_ID);

  await scenario.resolveUntil(
    (s) => !s.pendingDecision && s.players[0]!.battleArea.some((p) => p.permanentId === KYO_ID && p.isSuspended),
  );

  const state = await scenario.snapshot();
  const kyo = state.players[0]!.battleArea.find((p) => p.permanentId === KYO_ID)!;
  const opponentDigimon = state.players[1]!.battleArea.find((p) => p.permanentId === OPPONENT_DIGIMON_ID)!;
  expect(state.players[0]!.hand!.map((card) => card.instanceId)).toContain(TOP_SECURITY);
  expect(kyo.stack.map((card) => card.instanceId)).toContain(PLACED_DECK_CARD);
  expect(opponentDigimon.securityAttackModifier).toBe(-1);
  await scenario.healthy();
});

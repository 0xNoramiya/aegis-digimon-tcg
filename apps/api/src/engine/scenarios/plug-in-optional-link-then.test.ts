import fixturePluginHighSpeedOptionalLink from "./plugin-high-speed-optional-link.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const AGUMON = fixturePermanentId("own-plugin-h-agumon");
const MONODRAMON = fixturePermanentId("opponent-plugin-h-monodramon");
const OPTIONS = [fixtureInstanceId("plugin-h-option-0-card"), fixtureInstanceId("plugin-h-option-1-card")];

describe("Plug-In optional link, then mandatory effect", () => {
  it("High-Speed Plug-In H restricts the opponent whether the link is declined or accepted", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true });
    layScenarioFixture(s.state, fixturePluginHighSpeedOptionalLink, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    const agumon = () => human.battleArea.find(({ permanentId }) => permanentId === AGUMON)!;
    const plugInPrompts = () =>
      s.decisions
        .filter(({ req }) => req.sourceCardId === "ST22-09" && req.kind === "optional")
        .map(({ req }) => req.promptText);

    for (const [index, acceptLink] of [false, true].entries()) {
      const option = OPTIONS[index]!;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.promptText === "Link");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: acceptLink },
        }),
      ).toEqual({ ok: true });
      await settle(() => !human.hand.some(({ instanceId }) => instanceId === option) && !s.state.pendingDecision);
      await settle(() => observe(s.engine).isRestricted(MONODRAMON, "beSuspended"));

      expect(agumon().linked.some(({ instanceId }) => instanceId === option)).toBe(acceptLink);
      expect(human.trash.some(({ instanceId }) => instanceId === option)).toBe(!acceptLink);
    }
    expect(plugInPrompts()).toEqual(["Link", "Link"]);
    expect(s.state.memory).toBe(1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

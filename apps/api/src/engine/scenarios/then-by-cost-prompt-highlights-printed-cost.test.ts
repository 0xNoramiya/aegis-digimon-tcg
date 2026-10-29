import { expect, it } from "vitest";
import "#api/cards/index";
import { Phase } from "@aegis/shared/schema/enums";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/then-by-cost-prompt-highlights-printed-cost.fixture";
import { settle } from "#api/engine/testkit/harness";

it("highlights the printed cost when asking a later Then-by-cost clause of an Option", async () => {
  const s = setupScenario(fixture);
  s.state.phase = Phase.Main;
  await s.ready();
  try {
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("habakirimon").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const payload = JSON.parse(s.state.pendingDecision!.payloadJson);
    expect(payload.effectKey).toMatch(/^BT25-043\//);
    expect(payload.effectText).toContain("Then, by trashing your top security card");
    expect(payload.effectTextEmphasis).toBe("by trashing your top security card");
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});

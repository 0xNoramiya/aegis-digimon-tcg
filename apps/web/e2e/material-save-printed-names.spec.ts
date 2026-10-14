import evolvedFixture from "../../api/src/engine/scenarios/material-save-digixros-only-names.fixture";
import printedFixture from "../../api/src/engine/scenarios/material-save-original-names.fixture";
import { test, expect } from "./scenario-page";

for (const fixture of [evolvedFixture, printedFixture]) {
  test(`${fixture.name} offers Material Save only for eligible printed names`, async ({ scenario }) => {
    const refs = await scenario.openFixture(fixture, "normal", "none");
    const saved = fixture === printedFixture;
    await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
    await scenario.attack(refs.permanentId("shoutmon"));
    const prompts: string[] = [];
    await scenario.resolveUntil(
      (state) =>
        state.players[0]!.trash.some((card) => card.instanceId === refs.instanceId("shoutmon")) &&
        !state.pendingDecision &&
        !state.combatWindow,
      (decision) => {
        prompts.push(decision.promptText ?? "");
        if (decision.options.min === 0) return { instanceId: refs.instanceId("firstSource") };
        return { instanceIds: [refs.instanceId("firstSource"), refs.instanceId("secondSource")] };
      },
    );
    const final = await scenario.snapshot();
    const tamer = final.players[0]!.battleArea.find(
      (permanent) => permanent.permanentId === refs.permanentId("tamer"),
    )!;
    expect(tamer.stack.map((card) => card.instanceId)).toEqual(
      saved ? [refs.instanceId("secondSource"), refs.instanceId("firstSource")] : [],
    );
    expect(prompts.some((prompt) => prompt.includes("Material Save"))).toBe(saved);
    expect(final.players[1]!.securityCount).toBe(3);
    await scenario.healthy();
  });
}

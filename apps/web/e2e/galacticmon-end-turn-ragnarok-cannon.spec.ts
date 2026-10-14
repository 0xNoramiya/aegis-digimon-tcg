import fixture from "../../api/src/engine/scenarios/galacticmon-end-turn-ragnarok-cannon.fixture";
import { test, expect } from "./scenario-page";

const vemmonTextTrash = ["vemmonA", "vemmonB", "snatchmonA", "snatchmonB"];

for (const viewport of [
  { width: 1440, height: 1000, dark: false },
  { width: 390, height: 844, dark: true },
]) {
  test(`Galacticmon end-turn digivolution uses Ragnarok Cannon at ${viewport.width}px`, async ({ scenario, page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript((dark) => localStorage.setItem("aegis:darkMode", String(dark)), viewport.dark);
    const refs = await scenario.openFixture(
      {
        ...fixture,
        presentation: { holdBotAfterTurn: 4, opponent: { endBreeding: true, fallbackMain: "end", main: [] } },
      },
      "normal",
      "none",
    );
    const prompted: string[] = [];
    await scenario.resolveUntil(
      (state) => state.turnSeat === 0 && !state.pendingDecision,
      (decision) => {
        prompted.push(`${decision.kind}:${decision.sourceCardId}`);
        if (decision.kind === "selectCards" && decision.sourceCardId === "EX11-046")
          return { instanceId: refs.instanceId("evolutionGalacticmon") };
        if (
          decision.kind === "selectCards" &&
          decision.options.candidateInstanceIds?.includes(refs.instanceId("vemmonA"))
        )
          return { instanceIds: vemmonTextTrash.map((alias) => refs.instanceId(alias)) };
        if (decision.kind === "selectCards" && decision.sourceCardId === "BT21-062")
          return { instanceId: refs.instanceId("ragnarokCannon") };
        return {};
      },
    );
    expect(prompted).toContain("optional:EX11-046");
    expect(prompted).toContain("optional:BT21-062");

    const state = await scenario.snapshot();
    const galacticmon = state.players[0]!.battleArea.find(
      (perm) => perm.topCard.instanceId === refs.instanceId("evolutionGalacticmon"),
    )!;
    expect(galacticmon.stack.at(-1)?.instanceId).toBe(refs.instanceId("assembledGalacticmon"));
    expect(
      galacticmon.stack
        .slice(0, 4)
        .map((card) => card.instanceId)
        .sort(),
    ).toEqual(vemmonTextTrash.map((alias) => refs.instanceId(alias)).sort());
    expect(state.players[0]!.battleArea.map((perm) => perm.topCard.instanceId)).toContain(
      refs.instanceId("ragnarokCannon"),
    );
    expect(state.players[1]!.battleArea.map((perm) => perm.topCard.instanceId)).toEqual([
      refs.instanceId("costlyRival"),
    ]);
    await scenario.healthy();
  });
}

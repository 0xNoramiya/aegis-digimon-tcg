import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { advance } from "#api/engine/testkit/advance";

describe("Playing linked cards removes their DP bonus", () => {
  it("refreshes Maneuvermon when its linked Maquinamon enters the battle area", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-045", as: "host", linked: [{ card: "EX11-027", as: "link" }] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.perm("host").currentDP).toBe(14000);
    await advance(s.engine).verb.playInstances([s.inst("link").instanceId]);
    await settle();
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("link").instanceId)).toBe(
      true,
    );
    expect(s.perm("host").currentDP).toBe(12000);
  });
});

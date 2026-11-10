import { describe, expect, it } from "vitest";
import { ArenaZone } from "@/game/arena3d/ArenaZone";
import { buildArenaCardUrls } from "@/game/arena3d/field/buildArenaCardUrls";
import { buildArenaZoneCards, type ArenaSideZones } from "@/game/arena3d/field/buildArenaZoneCards";
import { Side } from "@/game/side";

const BACK_URL = "/sleeve.png";

function sideZones(security: ArenaSideZones["security"]): ArenaSideZones {
  return { deckCount: 20, trash: [], eggCount: 4, securityCount: 6, security };
}

function opponentSecurity(security: ArenaSideZones["security"]) {
  return buildArenaZoneCards({
    viewer: sideZones(undefined),
    opponent: sideZones(security),
    backUrl: BACK_URL,
    eggBackUrl: BACK_URL,
  }).get(`${Side.Opponent}:${ArenaZone.SECURITY.value}`);
}

describe("buildArenaZoneCards security faces", () => {
  it("shows a face-up bottom security card in the 3D pile", () => {
    const hidden = { cardId: "", artId: "", faceUp: false };
    const zone = opponentSecurity([
      hidden,
      hidden,
      hidden,
      hidden,
      hidden,
      { cardId: "BT26-082", artId: "", faceUp: true },
    ]);

    expect(zone?.topUrls).toEqual([BACK_URL]);
    expect(zone?.facesFromTop?.slice(0, 5)).toEqual([undefined, undefined, undefined, undefined, undefined]);
    expect(zone?.facesFromTop?.[5]?.urls).toEqual(
      buildArenaCardUrls({ cardId: "BT26-082", artId: "", faceUp: true, backUrl: BACK_URL }),
    );
    expect(zone?.facesFromTop?.[5]?.tint).toBe("#ffffff");
  });

  it("keeps every tile face down when no security card is public", () => {
    const hidden = { cardId: "", artId: "", faceUp: false };

    expect(opponentSecurity([hidden, hidden])?.facesFromTop).toBeUndefined();
    expect(opponentSecurity(undefined)?.facesFromTop).toBeUndefined();
  });
});

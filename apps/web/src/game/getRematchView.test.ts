import { describe, expect, it } from "vitest";
import { RematchStatus } from "@aegis/shared/protocol/RematchStatus";
import { SeriesState } from "@aegis/shared/schema/GameState";
import { getRematchView } from "@/game/getRematchView";

function buildSeries(fields: Partial<SeriesState>): SeriesState {
  return Object.assign(new SeriesState(), fields);
}

describe("getRematchView", () => {
  it("shows nothing where a rematch is not offered", () => {
    expect(getRematchView({ series: buildSeries({}), viewerSeat: 0 })).toBeUndefined();
  });

  it("tells the offering seat from the answering seat", () => {
    const series = buildSeries({ rematchStatus: RematchStatus.OFFERED.value, rematchOfferSeat: 1 });
    expect(getRematchView({ series, viewerSeat: 1 })?.stage).toBe("offeredByYou");
    expect(getRematchView({ series, viewerSeat: 0 })?.stage).toBe("offeredToYou");
  });

  it("hands the turn-order choice of an accepted rematch to the series view", () => {
    const series = buildSeries({
      rematchStatus: RematchStatus.ACCEPTED.value,
      bestOf: 3,
      gameNumber: 0,
      phase: "choosing",
      chooserSeat: 0,
    });
    expect(getRematchView({ series, viewerSeat: 0 })).toMatchObject({
      stage: "accepted",
      series: { bestOf: 3, viewerChooses: true, pips: ["pending", "pending", "pending"] },
    });
  });

  it("closes an accepted rematch whose series ended before its first game", () => {
    const series = buildSeries({
      rematchStatus: RematchStatus.ACCEPTED.value,
      bestOf: 3,
      phase: "over",
      endReason: "forfeit",
    });
    expect(getRematchView({ series, viewerSeat: 0 })).toEqual({ stage: "closed", series: undefined });
  });
});

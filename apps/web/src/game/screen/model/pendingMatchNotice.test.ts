import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/translator";
import { pendingMatchNotice } from "@/game/screen/model/pendingMatchNotice";

type Params = Partial<Parameters<typeof pendingMatchNotice>[0]>;

function getNotice(params: Params) {
  return pendingMatchNotice({
    status: "error",
    botError: undefined,
    error: undefined,
    vsBot: false,
    startMode: "casual",
    hostRoomCode: undefined,
    joinOptions: { displayName: "Tamer" },
    t: translator("en"),
    ...params,
  });
}

describe("connection notices", () => {
  it("explains an oversized selection while preserving automatic recovery", () => {
    expect(getNotice({ status: "reconnecting", error: "AEGIS_MESSAGE_TOO_LARGE" })).toMatchObject({
      title: "Reconnecting…",
      detail: "Your selection was too large to send. Reconnecting to restore the pending choice.",
      spinner: true,
    });
  });

  it("offers leaving after reconnection fails instead of showing the matchmaking spinner", () => {
    expect(getNotice({ status: "closed", error: "AEGIS_RECONNECT_FAILED" })).toMatchObject({
      detail: "We could not resume this match. Return to the lobby and try again.",
      spinner: false,
      exitTo: "lobby",
    });
  });

  it("does not infer a server outage from an abnormal closure", () => {
    expect(getNotice({ error: "AEGIS_CONNECTION_LOST" }).detail).toBe(
      "The connection to your match was interrupted. Please try reconnecting.",
    );
  });
});

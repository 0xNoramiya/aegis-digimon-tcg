import type { ScenarioFixture } from "#api/engine/scenario/types";

type BuildInheritedTraitGateReadsTopCardParams = {
  hostCardId: string;
};

export function buildInheritedTraitGateReadsTopCard({
  hostCardId,
}: BuildInheritedTraitGateReadsTopCardParams): ScenarioFixture {
  return {
    name: "inherited-trait-gate-reads-top-card",
    memory: 5,
    turnSeat: 0,
    turnCount: 3,
    isFirstPlayersFirstTurn: false,
    board: {
      0: {
        battleArea: [{ card: hostCardId, under: ["BT7-064"], as: "host" }],
        deck: Array<string>(12).fill("BT1-009"),
        security: 5,
      },
      1: { deck: Array<string>(12).fill("BT1-009"), security: 5 },
    },
  };
}

export default buildInheritedTraitGateReadsTopCard({ hostCardId: "BT3-089" });

import type { ScenarioFixture } from "../scenario/types.js";

export function shoutmonX4SecurityBattleMaterialSave({
  aliasOnlyMaterials = false,
}: { aliasOnlyMaterials?: boolean } = {}): ScenarioFixture {
  return {
    memory: 4,
    turnSeat: 0,
    turnCount: 0,
    isFirstPlayersFirstTurn: false,
    board: {
      0: {
        battleArea: [{ card: "BT21-083", as: "attackTaiki" }],
        hand: [
          { card: "BT10-009", as: "shoutmonX4" },
          { card: aliasOnlyMaterials ? "BT21-021" : "BT10-008", as: "shoutmonMaterial" },
          { card: aliasOnlyMaterials ? "BT19-051" : "BT10-049", as: "ballistamonMaterial" },
        ],
        deck: [{ card: "BT1-010", as: "turnDraw" }, "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        eggDeck: ["BT1-001"],
        security: 3,
      },
      1: {
        deck: Array<string>(8).fill("BT1-010"),
        eggDeck: ["BT1-001"],
        security: [{ card: "BT22-035", as: "securityEntermon" }, "BT1-010", "BT1-010"],
      },
    },
  };
}

export default shoutmonX4SecurityBattleMaterialSave();

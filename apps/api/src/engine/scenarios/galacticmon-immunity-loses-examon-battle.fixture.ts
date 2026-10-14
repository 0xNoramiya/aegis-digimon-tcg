import type { ScenarioFixture } from "#api/engine/scenario/types";

const filler = (count: number) => Array.from({ length: count }, () => "BT1-009");

const fixture: ScenarioFixture = {
  name: "galacticmon-immunity-loses-examon-battle",
  memory: 3,
  turnSeat: 1,
  turnCount: 1,
  isFirstPlayersFirstTurn: false,
  board: {
    0: {
      battleArea: [{ card: "BT1-080", as: "greenMaterial" }],
      breeding: { card: "ST2-10", as: "blueMaterial" },
      hand: [{ card: "EX13-045", as: "examon" }],
      deck: filler(16),
      security: filler(5),
    },
    1: {
      battleArea: [
        {
          card: "BT11-065",
          as: "snatchmon",
          under: [
            { card: "BT21-056", as: "vemmonA" },
            { card: "BT21-056", as: "vemmonB" },
            { card: "BT21-056", as: "vemmonC" },
            { card: "BT21-056", as: "vemmonD" },
          ],
        },
      ],
      hand: [{ card: "EX11-046", as: "galacticmon" }],
      deck: filler(16),
      security: filler(5),
    },
  },
};

export default fixture;

import type { TrainingObservation } from "#api/bot/training/observation";

export function evaluateSearchPosition(observation: TrainingObservation): number {
  function getMaterial(player: TrainingObservation["players"][number]): number {
    const permanents = player.breeding === undefined ? player.board : [...player.board, player.breeding];
    return (
      player.securityCount * 0.65 +
      player.handCount * 0.08 +
      permanents.reduce(
        (value, permanent) =>
          value +
          0.12 * (permanent.top.level ?? 0) +
          (0.1 * Math.max(0, permanent.dp)) / 10000 +
          (permanent.canAttackPlayer ? 0.15 : 0),
        0,
      )
    );
  }
  const own = observation.players.find((player) => player.seat === observation.seat);
  const opponent = observation.players.find((player) => player.seat !== observation.seat);
  if (own === undefined || opponent === undefined) {
    throw new Error("Search evaluation requires both seats");
  }
  const advantage =
    getMaterial(own) -
    getMaterial(opponent) +
    observation.memory * (observation.turnSeat === observation.seat ? 0.04 : -0.04);
  return 1 / (1 + Math.exp(-Math.max(-12, Math.min(12, advantage))));
}

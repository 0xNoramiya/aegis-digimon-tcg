# Effect attack target scope

An `Attack` IR action makes a Digimon attack as part of an effect. Its optional `attackTargetScope` field sets which attack targets the attacker's controller may choose. The `forceAttack` options use the same field.

The enum lives in `packages/shared/src/effects/ir/actions/AttackTargetScope.ts`.

| Entry     | Serialized value | Targets offered                               | Printed text                            |
| --------- | ---------------- | --------------------------------------------- | --------------------------------------- |
| `ANY`     | `"any"`          | The opponent and the opponent's legal Digimon | "attack" with no qualifier              |
| `PLAYER`  | `"player"`       | The opponent only                             | "attack a player" (BT23-086, Overclock) |
| `DIGIMON` | `"digimon"`      | The opponent's legal Digimon only             | "attack 1 of your opponent's Digimon"   |

## Default

When the field is omitted, `attackActionTargetScope` picks the scope:

- `DIGIMON` when the action names a separate defender: `target` differs from `attacker` or `subject`, and the `target` filter kind includes `Digimon`.
- `ANY` in every other case.

## Legality still applies

The scope only narrows the candidate list. `forcedAttackCandidateIds` still drops a player or Digimon target that ordinary attack legality refuses, such as a player under an `attackPlayers` restriction or a protected Digimon. When nothing is left, the attack does not happen and no target prompt opens.

## History

The field replaced two booleans, `attackPlayer` and `attackPlayerOnly`. Together they allowed an invalid state: `attackPlayer: false` with `attackPlayerOnly: true` offered no target at all. The mapping was:

| Old fields                                   | New value   |
| -------------------------------------------- | ----------- |
| `attackPlayer: true`                         | `"any"`     |
| `attackPlayer: false`                        | `"digimon"` |
| `attackPlayer: true, attackPlayerOnly: true` | `"player"`  |

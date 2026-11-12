# Defender constraints on effect-declared attacks

ED01-10 Bond of Snowflakes makes a chosen Digimon attack "1 of your opponent's Digimon with fewer digivolution cards than it" and adds "It can also attack your opponent's unsuspended Digimon with this effect". Before this change, an `Attack` action could only narrow its targets by scope: any, player, or Digimon. It could not compare a defender with the attacker, and it could not relax the suspended-defender rule for one attack.

The `Attack` action has two new optional fields:

| Field                               | Effect                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `defenderHasFewerDigivolutionCards` | Offers only opposing Digimon whose digivolution card count is lower than the attacker's.            |
| `canAttackUnsuspended`              | Offers unsuspended opposing Digimon for this attack only. It adds no grant to the attacker.         |

`attackActionOptions` copies both fields into `ForceAttackOptions`. `forceAttackCandidates` in `engine/effects/verbs/combat.ts` applies them when it lists legal defenders. The comparison uses the attacker, not the effect source, because the source here is an Option card with no digivolution cards. `digivolutionCardsCompareToSource` compares with the effect source, so it does not fit this card.

`getUnsuspendedAttackReader` wraps the continuous legality reader for one candidate search. The wrapper answers the three "can attack unsuspended" questions and delegates every other question to the original reader. All other target rules still apply: "can't be attacked", target-specific prohibitions, `cantAttackDigimon`, and `attackOnlySuspendedDigimon`. The attacker keeps no grant after the attack, so a later attack in the same turn follows the base rule again.

`canAttemptAttack` reads the same options, so the engine does not offer the attack when no defender qualifies.

`apps/api/src/cards/ED01/ED01-10.test.ts` proves the seam. The Digimon attacks an unsuspended defender with fewer digivolution cards. It does not attack a defender with as many digivolution cards, suspended or not, and it does not attack the player. Removing either field makes one of those cases fail.

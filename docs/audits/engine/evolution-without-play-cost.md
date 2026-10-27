# Evolution from a card without a play cost

`DigivolutionRequirement.baseWithoutPlayCost` limits an alternate evolution
route to bases without a playable Digimon cost. DUAL cards store their Option
use cost in `playCost`, so comparing the stored number with a negative sentinel
does not establish this condition. The API uses its existing `hasPlayCost`
predicate; the client uses the same Option-kind and nonnegative-cost checks
when projecting legal evolution routes.

BT27-052 uses this gate together with the exact name Atratusmon. Its behavioral
tests accept ST23-09 for two memory and reject the play-cost-bearing BT27-052
as a base for that route. Other named, trait and ordinary color routes retain
their own requirements and costs.

# Resident cost source validity

A cost reduction registered by a resident effect must still pass that effect's trigger and activation guards when another payment window consults it. A subscription surviving a declined payment is not permission to use a printed effect after its card becomes a digivolution card. Conversely, an inherited reducer must retain its valid host and placement.

`fireBeforePayCost` supplies `isResidentCostSourceActive` for battle-area and breeding-area resident effects. The replacement interpreter checks this live predicate alongside the turn gate in applicability checks, including cost projections. Triggered reductions without resident registration keep their existing duration and consumption behavior. Reusing the kernel guards preserves printed/inherited placement, conditions, and per-turn limits without a second implementation of those rules.

## Evidence

[Issue #5531](https://github.com/vinicius3333/aegis-digimon-tcg/issues/5531) supplied replay report 250. On the base revision, all 127 inputs reproduced without divergence. Before input 123, e-Pulse incorrectly offered BT25-049's printed reduction although Armalizamon was under BT25-057. The fixed replay matches through input 122; the first divergence is the recorded answer to the removed reduction prompt. Memory falls from 8 to 5, and the Tamer's face-down payment card is retained.

The [official BT25-049 image](https://world.digimoncard.com/images/cardlist/card/BT25-049.png) prints the reduction in the main text and only Piercing in the inherited box. No card-specific Q&A was present in the local KB. The card IR correctly separates these effects; no card module or effect snapshot change is needed.

`resident-option-reduction-after-evolution.fixture.ts` and its scenario test cover a declined first payment, evolution, acceptance/refusal of the next payment, memory, and the face-down Tamer card. The buried-source assertion failed before the fix and passed afterward. The browser spec with the same behavior name checks visible choices, synchronized memory, and presentation completion.

## Sweep

The effect snapshot contains 26 resident would-be-played replacement clauses: 22 printed and 4 inherited. The same stale-subscription defect is reproducible for BT14-046 Togemon and EX3-040 Parasaurmon; comparative tests cover both through public play and digivolve intents, and the shared fix handles them. LM-009 Airdramon has the same printed-source lifecycle risk, covered by the shared guard but without a dedicated reproduction in this investigation.

The other 18 printed clauses belong to Tamers or Digi-Eggs. They are lifecycle candidates when their placement or eligibility changes; this audit does not claim a reproduced defect for each. The 4 inherited clauses are BT22-079, BT22-080, BT23-073, and EX6-006. Existing breeding and cost suites verify that legitimate inherited and resident reductions remain available. No separate card-data defect was established by this sweep.

## Validation

The final targeted run passed 69 tests across 13 files. Removing only the new source-validity guard made four scenario assertions fail: both buried Armalizamon payment variants, Togemon, and Parasaurmon. Restoring it returned all tests to green. The Chromium scenario passed against the rebuilt API. `pnpm typecheck`, the full `pnpm check`, and `git diff --check` passed; repository lint still emits existing warnings outside the changed files. A separate code review found no actionable issues. Full simulator, mobile, and cross-browser suites were not run.

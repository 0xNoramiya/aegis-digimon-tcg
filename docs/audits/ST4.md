# ST4 implementation evidence

### ST4-13 — HerculesKabuterimon

Catalog: `packages/shared/src/cards/data/cards.json`, ST4-13. The printed contract is Piercing and a Main Digi-Burst 2 that suspends one opposing Digimon. There is no inherited or Security effect.

The module registers through `registerIrCard`. `TrashDigivolution` now explicitly requests a free choice of two sources and identifies the payment as Digi-Burst; `Suspend` resolves the opposing target afterward. This leaves top/bottom source-trash effects on other cards unchanged. Other registered Digi-Burst implementations use the stack-cost picker; ST6-13 already requests source selection.

Proof: `digi-burst-source-choice.test.ts` chooses the bottom and top of three sources and preserves the middle source. It fails without the change because no source decision opens. `drill-digi-burst.test.ts` proves the suspension, security check and subsequent victory; `keyword-digi-burst-parameters.test.ts` covers fixed-count parameters and insufficient supplies. Existing ST4-13 and ST6-13 card tests also pass.

KB: comprehensive section 16-14; official manual keyword entry says to trash any X sources (`data/kb/rules/manual.md:1962`). The ST4-13 KB card query has no errata, restriction or card-specific Q&A. Official general-rules Q&A, Digi-Burst question 5, permits selecting sources regardless of stacking order: https://world.digimoncard.com/rule/pdf/general_rules.pdf .

**8/10** (c + ir + b + p + g): source selection verified with public intents and shared scenario preparation. The historical reported match could not be replayed: no local DB/admin session and no retained per-match production log. Full card lifecycle and browser stack interactions were not audited in this change.

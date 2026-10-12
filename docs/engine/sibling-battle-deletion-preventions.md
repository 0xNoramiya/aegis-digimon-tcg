---
title: Sibling battle-deletion prevention payments
updated: 2026-09-12
---

# Sibling battle-deletion prevention payments

Frozen Q4261 permits two physical Reload Plug-In Q inherited effects to activate
and pay in the same battle-deletion window. Q4262 permits Reload payment together
with Barrier. The [official English Promo list](https://world.digimoncard.com/cards/?category=522901&search=true)
independently confirms both rulings. These are prevention reactions; competing
instead replacements retain the separate Q5352 exclusivity rule.

The shared leave-prevention consult previously skipped later prevention candidates
after one succeeded. The combat Barrier path separately consulted only instead
replacements after Barrier payment, so it excluded a sibling prevention. The
bounded correction allows each eligible prevention to pay, keeps activation and
reentry guards, and consults both modes once for a Barrier-protected permanent.
That permanent remains excluded from the later deletion consultation.

The pre-fix public Q4261 case reproduced one Reload source entering Security while
the second remained in the stack. After correction both exact sources enter
Security. The coordinator independently passed P146 plus the existing prevention
and keyword-battle suites (3 files / 39 tests), and the complete mechanism selection
(139 files / 2,081 tests). Q4262 is covered by the green native Barrier case; no
separate pre-fix Q4262 red is claimed. The existing generic prevention case is
corrected to require both eligible payments. Public battle cases use two
physical Reload sources, and native Barrier Unimon with one Reload source, against
a stronger WarGreymon. They require exact Security-bottom source transfers, exact
Barrier top-Security payment, surviving host and attacker identities, and completed
combat. Card-specific contract and closing results remain in the [P ledger](../P.md).

## Barrier ordering

＜Barrier＞ is a "would be deleted in battle" reaction, so it triggers at the same
time as the holder's "would leave the battle area" effects. The controller orders
them (Q6250). Both battle paths now offer Barrier inside the shared leave consult
(`effects/barrier.ts`) instead of prompting it alone:

- Field battles consult each Barrier holder once, at the Barrier step, and skip it
  in the later consult.
- Security battles add Barrier to the effect-path consult.

Barrier is listed first, so an unanswered order keeps the previous Barrier-first
flow. If an earlier reaction plays the card that granted Barrier, Barrier is no
longer offered. `engine/scenarios/barrier-would-leave-order.test.ts` and
`apps/web/e2e/barrier-would-leave-order.spec.ts` cover both orders with BT24-037
Silphymon and an inherited ＜Barrier＞ source.

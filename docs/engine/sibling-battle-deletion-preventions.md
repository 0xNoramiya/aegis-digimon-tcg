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

## Keyword reaction ordering

＜Barrier＞, ＜Evade＞, ＜Armor Purge＞, ＜Fragment＞ and ＜Scapegoat＞ are
immediate-type "would be deleted" effects (§16-19, §16-22, §16-25, §16-32, §16-37;
§15-8-5-3). They trigger at the same time as the holder's "would leave the battle
area" effects, and the controller orders them (Q5600, Q5906, Q6250, Q6884).

Every deletion path offers them in one shared leave consult:

- Field battles: `CombatController` makes one consult over the battle losers with
  `keywordPreventions`. It no longer prompts any of these keywords on its own.
- Security battles, effect deletions and rule deletions: the deletion primitive
  passes `keywordPreventions` to the same consult.

The engine host builds the entries in `keywordPreventionReplacements`
(`effects/barrier.ts`, `effects/armorPurge.ts`, `effects/evade.ts`,
`effects/fragmentLeaveReplacements.ts`, `effects/scapegoatLeaveReplacements.ts`).
Each entry keeps its own cost and outcome. Barrier is listed before card
reactions; the others follow them, so an unanswered order keeps the previous
default. Barrier applies only to battle deletions. Scapegoat skips deletions by
its controller's own effects. Its sacrifice is an effect deletion, so that
Digimon's own reactions apply.

Keyword reactions use `KeywordReaction` (`effects/KeywordReaction.ts`) as their
activation identity, and `buildKeywordReactionId` gives each reaction the id
`<keyword>/<permanentId>`. The order prompt key carries that id, so it does not
collide with registry ids.

Hosts without a leave consult (minimal combat test hooks) keep the inline fallback
in `resolveBattleDeletionPreventionsInline` and in the deletion primitive.

＜Decoy＞ is still prompted after the consult. It is an immediate-type effect too
(§16-18-2), but it protects a different Digimon and lets the player choose which
endangered Digimon it saves, which the per-Digimon consult does not model yet.

Regressions: `engine/scenarios/{barrier,evade,fragment,scapegoat}-would-leave-order.test.ts`
and `apps/web/e2e/{barrier,evade}-would-leave-order.spec.ts`, each with BT24-037
Silphymon as the would-leave source.

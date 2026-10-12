---
title: Sibling battle-deletion prevention payments
updated: 2026-10-12
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

＜Barrier＞, ＜Evade＞, ＜Armor Purge＞, ＜Fragment＞, ＜Scapegoat＞ and ＜Decoy＞ are
immediate-type "would be deleted" effects (§16-18-2, §16-19, §16-22, §16-25, §16-32,
§16-37; §15-8-5-3). They trigger at the same time as the holder's "would leave the battle
area" effects, and the controller orders them (Q5600, Q5906, Q6250, Q6884).

Every deletion path offers them in one shared leave consult:

- Field battles: `CombatController` makes one consult over the battle losers with
  `keywordPreventions`. It no longer prompts any of these keywords on its own.
- Security battles, effect deletions and rule deletions: the deletion primitive
  passes `keywordPreventions` to the same consult.

The engine host builds the entries in `keywordPreventionReplacements`
(`effects/barrier.ts`, `effects/armorPurge.ts`, `effects/evade.ts`,
`effects/fragmentLeaveReplacements.ts`, `effects/scapegoatLeaveReplacements.ts`,
`effects/decoyLeaveReplacements.ts`).
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

### ＜Decoy＞

＜Decoy＞ saves 1 of its controller's other specified Digimon, so one source can
save any one of several endangered Digimon. The consult models this with
`preventOneOf` on a prevention entry:

- Each Decoy holder is one entry, offered in the order prompt of every endangered
  Digimon it can protect.
- The entry resolves once per consult, whether the player uses it or declines it.
- When it resolves, its candidates are the endangered Digimon it protects that are
  still in play and not yet saved. With none, it fizzles without a prompt.
- The player confirms the holder. With more than one candidate, the player then
  picks the Digimon to save. The holder is then deleted as the cost.

The entry keeps the existing Decoy rules: only an opponent's effect deletion
activates it, `listDecoySources` and `isDecoySourceProtecting` match its
specifier, and `decoyCostPermanentIds` (now owned by `GameEngine`) keeps another
Decoy from saving a holder that is paying its cost.

### Yes and No presets

The order prompt offers a Yes or No preset for every keyword entry, because each
description says "you may". A preset answers the keyword's own confirmation:

- No skips the keyword without a prompt.
- Yes skips the confirmation and asks only the choices left. Evade, Barrier,
  Armor Purge, Guard and Partition ask nothing more. Detach asks which link card
  to trash, Fragment which digivolution cards, Scapegoat which Digimon to delete,
  and Decoy which Digimon to save, each only when there is more than one way to
  pay.

Regressions: `engine/scenarios/{barrier,evade,fragment,scapegoat,decoy}-would-leave-order.test.ts`,
`engine/scenarios/keyword-order-preset-answers.test.ts` and
`apps/web/e2e/{barrier,evade}-would-leave-order.spec.ts`. BT24-037 Silphymon is
the would-leave source.

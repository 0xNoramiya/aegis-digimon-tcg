---
title: Declined Main activation keeps its Once Per Turn use
updated: 2026-10-12
---

# Declined Main activation keeps its Once Per Turn use

A player who declines a `[Main]` effect's activation confirmation has not used that effect. Its `[Once Per Turn]` use stays available for the rest of the turn.

## Rule

- KB Q1818: when a player chooses not to use an optional effect, its `[Once Per Turn]` requirement is not used up.
- A `[Main]` effect is activated only by the turn player's choice. The engine asks for that choice with an `optional` decision marked `activationConfirmation`. Answering "no" means the effect was never activated.

## Engine behavior

`applyActivateEffect` in `apps/api/src/engine/actions/activateEffect.ts` registers the use only when the resolution did not end in a declined activation (`ctx.oncePerTurnActivationDeclined`). The interpreter sets that flag when the player refuses an optional cost or action before anything was chosen. Once the player pays a cost or accepts a choice, the flag stays clear and the use counts, as before.

This matches the triggered-effect path in `effects/stack.ts`, which already gave the use back when the body declined its own optional activation.

## Example

BT22-043 Terriermon's inherited effect reads: "[Main] [Once Per Turn] By placing this [CS] trait Digimon's top stacked card as its bottom digivolution card, <Draw 1>." A player activates it, declines the placement, and attacks. Before the fix, the engine counted the declined attempt and stopped offering the effect. Now the effect is offered again after the attack and resolves when accepted.

## Evidence

| Case                                                                             | Test                                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Decline Terriermon's restack, attack security, then activate it                  | `apps/api/src/engine/scenarios/declined-main-activation-keeps-once-per-turn.test.ts` |
| Decline BT25-070 Logamon's optional `[Main]` link; the same effect stays offered | `apps/api/src/cards/BT25/BT25-070.test.ts`                                           |

## Not changed

`applyRespondCounter` in `actions/counter.ts` also registers the use unconditionally after a `[Counter]` effect resolves. Thirteen `[Counter] [Once Per Turn]` effects exist, and most contain an optional step. That path also closes the counter window, so it needs its own rules check before it changes.

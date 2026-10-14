# DNA digivolution entry provenance

A Main-phase `dnaDigivolve` intent is a player procedure, not an effect. The shared DNA primitive also serves inherited end-turn effects and Blast DNA Counter effects. Paying a DNA cost does not distinguish these routes.

The public action passes `publicEntry: true` to `dnaDigivolveInto`. That route fires the ordinary When Digivolving window and carries `isDnaDigivolve: true` through the entering card, board-wide entry windows, and digivolution watchers. The new permanent keeps `enteredByEffect` false. Effect and Blast callers omit `publicEntry` and retain the effect-entry timing and provenance. App Fusion continues using its existing public-entry distinction.

This preserves printed DNA-only clauses while preventing manual DNA from satisfying “played or digivolved by an effect.” BT25-077's printed All Turns effect and Q6375–Q6378/Q6946 distinguish the optional suspension from the mandatory deletion triggered only by an effect entry.

Behavioral proof: `apps/api/src/engine/scenarios/dna-digivolution-effect-provenance.test.ts` and its reusable fixture exercise public manual DNA versus ST9-08 inherited end-turn DNA with Bacchusmon. They check stack order, suspension, target survival/trash, provenance and drained decisions. A separate manual DNA assertion preserves ST9-05's DNA-only bottom-deck effect. Existing DNA trigger-order, Blast DNA Counter and Chapter 8 conformance suites protect adjacent routes.

Snapshot sweep found 12 cards using the by-effect conditions. Board watchers AD1-024, BT16-028, BT25-058 and BT25-077 can observe DNA and share the corrected entry mechanism. BT24-023, BT24-049 and BT25-084 have own When Digivolving gates but no printed DNA route in the snapshot; their risk through this entry is latent. BT13-010, BT15-022, BT24-074, BT25-080 and ST19-14 only use these gates on play events and are unaffected by this DNA change. No separate card defect was established. This inventory is not a full audit of each card.

"""Reflection prompt for structural edits of one panel program component."""

from panel_program import ALWAYS_ZERO_FEATURES, FEATURES

FEATURE_MEANINGS = {
    "bias": "always 1; a flat bonus or penalty for every action the rule matches",
    "ownHandCount": "cards in the bot's hand (state, same for every action)",
    "opponentHandCount": "cards in the opponent's hand (state)",
    "turn": "turn number (state)",
    "ownTrashCount": "cards in the bot's trash (state)",
    "opponentTrashCount": "cards in the opponent's trash (state)",
    "ownSecurity": "the bot's security cards (state)",
    "opponentSecurity": "the opponent's security cards (state)",
    "opponentBodies": "opposing Digimon on the battle area (state)",
    "cost": "projected memory cost of the action",
    "handover": "memory the action would pass to the opponent (cost above current memory)",
    "attackPlayer": "1 for an attack on the opponent's security",
    "lethal": "1 for an attack on the player when the opponent has no security",
    "attackWinningBattle": "1 for an attack on a Digimon with lower DP",
    "attackLosingBattle": "1 for an attack on a Digimon with equal or higher DP",
    "digivolve": "1 for a digivolution",
    "breedingGrowth": "1 for digivolving the Digimon in the breeding area",
    "levelGain": "levels gained by the digivolution",
    "dpGain": "DP gained by the digivolution, in thousands",
    "playBody": "DP in thousands of a Digimon played from hand (0 for other plays)",
    "playTamer": "1 for playing a Tamer",
    "playOption": "1 for using an Option card",
    "hatch": "1 for hatching a Digi-Egg",
    "deploy": "1 for moving the breeding Digimon to the battle area",
    "sourceLevel": "level of the acting card",
    "sourceDp": "DP of the acting card, in thousands",
    "targetDp": "DP of the targeted Digimon, in thousands",
    "block": "1 for declaring a block",
    "criticalBlock": "1 for blocking an attack on the player at zero security",
    "accept": "1 for accepting an optional effect or a defensive response",
    "finish": "1 for finishing an optional selection",
    "pass": "1 for ending the phase or skipping",
    "openingRookie": "1 to keep an opening hand with a level 3 card, -1 to keep one without",
    "activate": "1 for activating a card effect",
    "sourceInHand": "1 when the acting card is in hand",
    "sourceInTrash": "1 when the acting card is in a trash",
    "sourceOnBoard": "1 when the acting card is a Digimon on the battle area",
    "sourceOpponent": "1 when the acting card belongs to the opponent",
    "sourceValue": "sourceDp + sourceLevel + playCost / 10",
    "digiXros": "1 for a DigiXros play",
    "assembly": "1 for an Assembly play",
    "dnaDigivolve": "1 for DNA digivolution",
    "appFusion": "1 for App Fusion",
    "link": "1 for linking a card",
    "materials": "number of material cards the action uses",
}

FEATURE_TABLE = "\n".join(
    f"- {feature}: {FEATURE_MEANINGS[feature]}"
    for feature in FEATURES
    if feature not in ALWAYS_ZERO_FEATURES
)

PANEL_REFLECTION_TEMPLATE = (
    """You are improving one component of a rule program that controls a Digimon card game bot.
The engine scores every legal action as the sum of weight x feature over the rules whose
`when` condition matches, then plays the highest-scoring action. The bot is judged in real
games against two fixed opponent bots on human tournament decks.

The current component:
```
<curr_instructions>
```

Component format. Return one JSON object with exactly two keys:
- "scope": one plain-English sentence on which decisions this component covers. Keep it.
- "rules": a list of rules. Each rule is
  {"feature": <name>, "weight": <number>, "advice": <plain English>, "when": <optional condition>}.
The main_rules component holds only rules with "when": {"kind": "main", ...}. The other_rules
component holds every other rule and never uses kind "main". Both components together may hold
at most 100 rules.

Allowed features (the value each rule multiplies by its weight):
"""
    + FEATURE_TABLE
    + """
Never use """
    + ", ".join(ALWAYS_ZERO_FEATURES)
    + """: they are always 0 in this engine path.

`when` conditions (all parts must hold; omit `when` to match every action):
- "kind": the decision kind: "main", "breeding", "block", "counter", "mulligan",
  "optional", "selectCards", "chooseTargets", "orderCards", "chooseOption", "respondEvade",
  or "respondBarrier". Each traced decision shows its kind.
- "sourceCardIds": list of card IDs; the rule matches only when the acting card is one of them.
- "minimum" / "maximum": maps of feature name to number, for example
  {"minimum": {"opponentSecurity": 3}, "maximum": {"turn": 4}}.
- "ownBoard": {"cardIds": [...], "suspended": true|false (optional), "minimum": n, "maximum": n}
  counts the bot's Digimon on the battle area whose top card is listed.
- "ownHand": {"cardIds": [...], "minimum": n, "maximum": n} counts listed cards in hand.
Use only card IDs that appear in the decks, decisions, or printed cards below.

How to improve:
- The unconditional weights were already tuned by a numeric optimizer over thousands of games.
  Do not retune them without strong evidence. Make structural changes instead: add a
  conditional rule that applies a correction only in a specific situation (turn, security,
  memory cost, board, hand), add a card-specific rule with sourceCardIds when a card is misplayed,
  remove or fix a rule that the decisions show is harmful, or rewrite advice that does not match
  its rule.
- Look at lost games: the chosen action, its score, and the alternatives with their features.
  A good new rule flips a bad choice to a better alternative in situations like these and leaves
  most other choices alone. Choose a weight just large enough for that flip.
- Make one to three focused changes and keep every other rule exactly as it is.
- Advice must be plain English that states what the rule does, for example
  "In the main phase, when the opponent has 2 or fewer security cards, favor attacking the player."
- Never invent card effects. When you mention what a card does, use only its printed text below.
- Ignore outcomes that you cannot explain from the decisions shown.

Games, outcomes, and decisions from the current program:
```
<inputs_outputs_feedback>
```

Write a short analysis, then return the complete new component as one JSON object inside a
single ```json fenced code block. Return nothing else in fenced blocks."""
)

# Liberator story battles

The catalog contains 30 mapped encounters across 12 playable characters. Sources are the [official comic](https://digimoncard.com/digimon_liberator/en/comic/), [novel](https://digimoncard.com/digimon_liberator/en/novel/), and official Battle Coverage articles linked by each catalog entry. Chapter names remain in their original language. Cover images reference the corresponding official comic splash or novel thumbnail; the banner uses official artwork. No generated artwork or chapter text is shipped.

Ice Knight, Three Musketeers, and The Crystal Sea Palace use the documented visible starting fields from Battle Coverage. Hidden deck contents and ordering are reconstructed even for these three battles. The other 27 encounters are marked adaptations. These use documented characters and visible cards where available, with playable approximations for missing information. Grouped NPC encounters are represented by one battle; reported defeats become winnable challenges. Fictional card changes are represented using the simulator's printed card behavior.

Research covered 42 novel chapters, 32 TIPS articles, and sampled panels across 50 comic installments. This is a mapped encounter catalog, not a claim of exhaustive panel-by-panel coverage. Progression follows each character's catalog order; it does not establish a single chronology across both media.

The API selects the scenario, decks, opponent, and starting state. Authenticated progress is persisted in `story_battle_completions`; a seat-zero victory unlocks the next encounter for that character. Losses, draws, and surrender do not unlock later battles. The progress endpoint is read-only. Story matches use the existing simulator and bot, disable rollback, and do not update regular match statistics.

Each match shuffles both players' remaining main and Digi-Egg decks using the match seed. Scenario hands, security, trash, and starting fields stay fixed. The shuffled fixture is recorded in the replay so playback preserves the original draw order.

Every playable encounter must supply two legal 50-card main decks across all starting zones. Tokens on the starting field do not count toward either deck. Deck admission tests validate all encounters, and a room regression verifies that this opponent can be seated.

The Arisa rematch starts on Violet's final turn from [Battle Coverage 11](https://digimoncard.com/digimon_liberator/en/column/tips28/), using the article's board images:

| Side   | Starting state                                                                                                                                                                                                  |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Violet | 6 memory, 0 security. Purple Memory Boost!, two BT23-087 and one BT20-088 Violet Inboots. MetalPhantomon in breeding over DemiMeramon, Ghostmon and Bakemon.                                                    |
| Arisa  | 2 security (Kaguyamon, Cendrillmon). Two Shoemon, Pandamon, Nyabootmon over a Puppet line ending in Cendrillmon, Kaguyamon EX9-033 over Karakurumon EX9-032, two Familiar Tokens and two Arisa Kinosaki Tamers. |

The article does not show hands, trash or deck lists, so these are adaptations. Violet's hand holds the cards the article plays: Necromon BT20-079 and BT23-069, ShineGreymon: Ruin Mode, Candlemon, Jack Raid, Phantomon BT23-065, Dullahamon and Kimeramon BT8-084. Her trash holds the Soulmon and other Ghost cards the combo revives, and enough cards for Jack Raid to gain 2 memory. Unique Emblem: Soul Banquet starts in her battle area because its ＜Delay＞ needs it there before the turn, although the board image does not show it. Arisa's Tamers, Nyabootmon's lower stack and the Cendrillmon printing are inferred from card costs and the article's text.

A regression test plays the article's full line to a win: Necromon into Ruin Mode, the Execute attack by Dullahamon, and the DNA Kimeramon finisher. The test makes Arisa's choices as the article describes. In a live match the bot can choose differently, so the player may need to adapt the line.

Guests can play without signing in. A random browser token identifies their server-owned progress in `story_guest_completions`; only its SHA-256 hash is stored in the database. The API verifies prerequisites and records wins for guests as it does for accounts. Signing in switches to separate account progress; clearing browser storage loses access to guest progress.

Opening corrections preserve playable printed-card lines. Owen uses Gigimon and a compatible Elizamon–Dimetromon–Lamiamon–Medusamon line in Deep Savers. Dragonkin Aggro retains its depicted BT21 Lamiamon in reserve and uses the same tournament deck as its base. The latter starts on Owen’s turn with Lamiamon in reserve, following [Battle Coverage 7](https://digimoncard.com/digimon_liberator/en/column/tips23/), rather than granting Shoto three immediate attacks against two Security. [Battle Coverage 4](https://digimoncard.com/digimon_liberator/en/column/tips15/) supplies Close’s EX8 Proganomon with Tumblemon, Sunarizamon and Landramon underneath; the opposing Plesiomon also has a complete evolution stack. Violet uses Ghost Reanimation with the Ghostmon–Soulmon–Phantomon–Necromon line, Violet Inboots and Apparition Legion against Sam, as described in [Battle Coverage 5](https://digimoncard.com/digimon_liberator/en/column/tips20/). Unshown deck slots remain adaptations, and card counts include all starting zones.

## Galacticmon rematch deck source

Owen's rematch uses the [Medusamon deck recorded by DigiLab](https://digimon.digilab.cards/decklist/120372) for Fan Favorite's first-place, 3–0 finish at the October 11, 2026 Meta Madness Gaming Evolution Cup (nine players, EX13 format). DigiLab links the submitted list to [Bandai TCG+](https://www.bandai-tcg-plus.com/deck_code_recipe/OITUTMWh2xKX9QdJ). Retrieved October 21, 2026 through DigiLab's authenticated API. DigiLab is an independent tournament-data service; this is a recorded tournament list, not a Bandai endorsement of this scenario.

The source has 50 main-deck cards and four BT21-001 Gigimon. Its Elizamon–Dimetromon–Lamiamon–Medusamon line, Styracomon, three Owen printings and two Red Memory Boosts fit Owen's story. The starting hand and two boosts are allocated from those counts, not added on top. Both boosts start in the battle area so their Delay effects are available.

Three one-for-one substitutions preserve the story's existing WarGreymon board and its printed inherited effects:

| Remove from tournament list | Add for story board   |
| --------------------------- | --------------------- |
| 1 BT24-008 Elizamon         | 1 BT21-007 Agumon     |
| 1 P-189 Dimetromon          | 1 BT21-015 Cyclonemon |
| 1 EX11-012 Medusamon        | 1 BT21-026 WarGreymon |

The tournament list already supplies BT21-024 Cyberdramon. Together with Gigimon and the added lower stages, WarGreymon starts at 19,000 DP. All other card counts match the source. This remains a 50-card story adaptation of the tournament list, rather than an unchanged competitive deck. The opponent's historical Galacticmon field is preserved. Its breeding Snatchmon now has a Vemmon beneath it, moved from the draw pile without changing deck quantities.

## Story deck audit

All 30 playable encounters and both seats were inspected for deck admission, starting eggs, printed and alternate evolution requirements, unrelated filler, seeded DP and inactive Delay zones. Passing the 50-card admission check alone does not prove that a deck has a usable evolution route. Multicolor and trait-based evolution requirements were checked before treating a color mismatch as a defect. White Sistermon and Ukkomon are played directly; King Drasil/Royal Knights and Lucemon have their own printed mechanics. Their absence of a conventional level-by-level chain is not itself a defect.

Twenty-one additional encounters had deck, stack or zone corrections; twenty-two fixture files changed including the earlier Galacticmon rematch. Seven immutable tournament lists under `story/decks/` hold public card quantities and source URLs; fixtures allocate their opening zones from those quantities through `buildStoryDrawPile`. Explicit one-for-one substitutions keep story cards within the 50-card total.

| Tournament source                                                     | Event and result                                                        | Uses                                                                                                   |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [Medusamon 120372](https://digimon.digilab.cards/decklist/120372)     | October 11, 2026; Meta Madness Gaming Evolution Cup; 1st/9, 3–0         | Owen in Deep Savers, Dragonkin Aggro, championship final and Galacticmon rematch                       |
| [Invisimon 111950](https://digimon.digilab.cards/decklist/111950)     | September 22, 2026; Plague Legacy locals; 2nd/6, 2–1                    | Both Altea encounters                                                                                  |
| [Dynasmon 125087](https://digimon.digilab.cards/decklist/125087)      | October 19, 2026; Eagle's Nest online; 11th/31, 3–2                     | Mistymon's opponent deck                                                                               |
| [Lucemon 112711](https://digimon.digilab.cards/decklist/112711)       | September 25, 2026; TableFlip locals; 1st/4, 2–0                        | Dokuson in Ryutaro's encounter                                                                         |
| [Millenniummon 124144](https://digimon.digilab.cards/decklist/124144) | October 17, 2026; Darkhound Game Center store championship; 2nd/45, 5–1 | Chitose in Altea's Shinjuku encounter                                                                  |
| [Deep Savers 125429](https://digimon.digilab.cards/decklist/125429)   | October 20, 2026; MasterRukasu online; 8th/8, 0–3                       | Deep Savers NPCs in all three Guardians encounters, Emerald Coast, Village Defence and Cross Connectia |
| [Nature Spirits 16430](https://digimon.digilab.cards/decklist/16430)  | January 21, 2025; Eagle's Nest online; 16th/30, 2–2–1                   | Temple priest against Yuuki and Winr                                                                   |

Sources were retrieved October 21, 2026 through DigiLab's authenticated API. Results are reported as recorded, not as evidence that every archetype is top-tier. The recent Deep Savers list was selected for its Plesiomon line and story compatibility despite its losing result. The newer Nature Spirits list available in DigiLab uses another strategy without Tlalocmon; the older listed build preserves the temple priest's Tlalocmon, Eldradimon and Nature Spirits evolution routes. No claim of a current-meta Tlalocmon list is made.

The changes fix the following repeated construction mistakes:

- The championship final no longer gives Owen a yellow egg for red rookies. Its hand has a compatible red line, including WarGreymon. Deep Savers no longer mixes the Dragonkin line with a full second Greymon deck, and Dragonkin Aggro uses the same sourced base.
- Altea no longer receives yellow ToyAgumon in a black Kapurimon deck. Both hands use Espimon, HoverEspimon, Oblivimon, Altea and Invisimon from the sourced deck. Chitose uses the sourced black/purple Gazimon line instead of black rookies that could not evolve from the purple starting egg.
- Mistymon no longer uses a blue aquatic egg, red Hybrid rookies and yellow Wizardmon as an opening line. The yellow egg, Candlemon, Wizardmon, Mistymon and Dynasmon now form a tested route.
- Dokuson's deck uses Cupimon and Lucemon's printed named evolutions instead of assuming yellow Patamon could evolve from a purple Tokomon. Lucemon can skip the ordinary level-four step.
- The temple priest's off-theme red rookies and blue fillers are replaced with the sourced Nature Spirits package. Trait-based digivolution connects its differently colored stages.
- The six Deep Savers NPCs use a complete Gomamon–Seadramon–MegaSeadramon–Plesiomon route instead of purple Gizamon and an overly top-heavy mixture. Bukamon EX8-002 is retained as the story's four eggs instead of the source's four BT7-002 eggs.
- Black Memory Boost in Abbadomon, Purple Scramble against Huckmon, and Royal Knights of the Purge/The Last Guardian against Omekamon now start in the battle area, rather than the inactive legacy Delay zone. Abbadomon also receives four Negamon, matching its other encounter, so Soundbirdmon has a breeding route.

All source quantities are unchanged except these explicitly declared main-deck substitutions:

| Encounter and seat                      | Remove                          | Add                                                             |
| --------------------------------------- | ------------------------------- | --------------------------------------------------------------- |
| Dragonkin Aggro, Owen                   | 1 EX11-054; 1 EX11-012          | 1 BT18-087 Owen; 1 BT21-025 Lamiamon                            |
| Championship final, Owen                | 1 BT24-008; 1 EX11-012          | 1 BT21-007 Agumon; 1 BT21-026 WarGreymon                        |
| Galacticmon rematch, Owen               | 1 BT24-008; 1 P-189; 1 EX11-012 | 1 BT21-007 Agumon; 1 BT21-015 Cyclonemon; 1 BT21-026 WarGreymon |
| Mistymon                                | 1 EX13-033                      | 1 BT18-039 Mistymon                                             |
| Altea in Shinjuku                       | 1 BT20-049                      | 1 BT20-050 HoverEspimon                                         |
| Guardians of the Deep, Close's opponent | 4 BT11-085                      | 2 EX8-017 Crabmon; 2 EX8-020 Dolphmon                           |

Starting breeding stacks were also repaired without changing main-deck quantities. Ice Knight's Bulucomon now has Hiyarimon, moved from the egg deck. Globemon gains Gatchmon and DoGatchmon; Chaperomon gains Shoemon and ShoeShoemon; Snatchmon gains Vemmon; Tyrannomon gains Agumon; and CrysPaledramon gains Bulucomon and Paledramon. These lower stages are moved from each existing draw pile. Altea in Shinjuku keeps the original BT20 HoverEspimon in reserve, with Espimon beneath it, rather than replacing the starting champion with a bare egg. Shinjuku's original two/four security counts are preserved.

Violet's Arisa rematch no longer assumes that level-five Phantomon can digivolve into level-five MetalPhantomon in breeding. MetalPhantomon keeps its legal Ghostmon/Bakemon line; that Phantomon is allocated to the initial trash instead. The article comeback remains winnable: the regression now revives Ghostmon from Phantomon's deletion effect, leaving a legal target for the hand Phantomon's later Main effect. The full Ruin Mode and DNA Kimeramon line is tested to victory. This is a printed-card adaptation of the unshown preparation, not a claim that the article specifies the new trash allocation.

These allocations preserve fixed starting fields: Dragonkin Aggro's Lamiamon, Close's opposing Plesiomon stack, the temple priest's three Digimon against Winr, and Dokuson's two Lucemon plus Chaos Mode. Regression tests exercise fourteen affected breeding routes using public digivolution intents, including alternate trait/name requirements. They isolate legality with sufficient memory; they do not claim that each full chain is affordable in one ordinary turn. Admission tests cover all sixty decks. Every encounter is checked for inactive Delay zones, and every seeded breeding stack must begin with an egg and have valid printed or alternate evolution edges. The remaining decks were inspected but were not replaced merely for using older cards. The Arisa comeback is tested to victory; full victory playthroughs and balance validation of all thirty encounters have not been completed.

## Tutorial lessons

The Learn page reuses this path. The client sends a tutorial lesson ID (prefix `tutorial-`) as `storyBattleId`. `findSoloBattle` resolves either a story battle or a lesson from `@aegis/shared/tutorial/tutorialLessons`, and `getTutorialScenario` supplies the lesson fixture from `engine/scenarios/tutorial-*.fixture.ts`. Lessons get the same room checks, guest and account progress, prerequisite gate, and disabled rollback as story battles. They differ in three ways: the player keeps their own name, the deck is named `Lesson <n>`, and the opponent is `Training Bot`. Lesson decks are not shuffled, so draws follow the fixture `deck` order from the front. Wins are stored in the story completion tables with the lesson ID as `battle_id`.

## Campanhas do universo Digimon

A API integra todos os confrontos do catálogo, além dos 30 encontros Liberator. `catalogStoryBattles` deriva os IDs persistentes em minúsculas e conserva os sete encontros World 1 anteriores com seus pré-requisitos. `getCatalogStoryScenario` configura os dois decks emprestados na API; o deck enviado pelo cliente continua sendo substituído. As partidas do catálogo começam com cinco cartas aleatórias e sem mulligan; seguranças e campo inicial seguem o nível de dificuldade descrito abaixo. A seed determina a distribuição e o replay registra o cenário completo. São duelos TCG inspirados nos confrontos, incluindo substituições temáticas já documentadas; a disponibilidade não certifica reprodução literal das equipes, fusões ou derrotas canônicas.

As receitas originais e suas fontes permanecem em `storyCatalogDecks`. A interface apresenta somente histórias, confrontos e progresso: remove receitas, fontes, datas e o inventário administrativo. Campanhas com apenas um confronto são omitidas da agregação, sem apagar suas fichas históricas ou alterar IDs já persistidos.

`getStoryScenarioDeck` aplica curadorias explícitas para a banlist atual do engine, mantendo 50 cartas e sem alterar a receita-fonte nem reapresentar a variante como lista original de torneio:

- WMD55: EX1-066 passa de 4 para 1, BT18-088 de 1 para 2, AD1-020 de 2 para 4.
- WMD71: EX8-012 passa de 3 para 1, BT21-068 de 2 para 4.

Não foram removidos limites ou adicionadas exceções às regras do engine. As demais receitas são usadas integralmente. As variantes inteiras, incluindo ovos, são reconstruídas deterministicamente do snapshot e ficam preservadas nos replays.

`GET /story/campaign-progress` mantém a identidade de conta/guest e `no-store`, retornando conclusões, conquistas derivadas por batalha/capítulo/campanha e revisão `story-catalog-v3`. Preserva os IDs das conquistas dos sete encontros World 1, sem duplicar esses capítulos. Repetir uma vitória não acumula recompensa; não há prêmio econômico. Nenhuma migração foi necessária. Merge de guest com conta e dificuldade escolhida pelo jogador permanecem fora desta entrega.

A biblioteca tem busca, filtros de mídia, destaque para continuar e cards compactos. O conceito gerado com imagegen está em `.local/story-campaign-redesign.png`; é referência visual, sem conteúdo fictício de progresso usado pelo produto. O código renderiza contagens e progresso reais usando o sistema visual existente. Artes mantêm a atribuição global do produto. A marca de conclusão representa vencer os desafios do catálogo, não comprova seguir a ordem ou o desfecho canônico da obra.

## Refinamentos de apresentação e compatibilidade

As três entradas históricas Back Dimension (`dw1-038`, `dw1-039`, `dw1-040`) são uma batalha na apresentação. `getStoryCampaignBattles` expõe apenas `dw1-038`; `normalizeStoryCompleted` preserva vitórias antigas em qualquer variante e elimina contagem/conquista duplicada. As entradas históricas e replays continuam endereçáveis. World 1 apresenta 38 desafios; as quatro lutas narrativamente diferentes de Ogremon permanecem separadas. A agregação omite campanhas com um confronto, campanhas retiradas e variantes históricas consolidadas.

A agregação e as batalhas de cada campanha usam pôsteres, capas ou artes promocionais oficiais da própria mídia, não ilustrações de cartas. Os arquivos estão em `apps/web/public/story/media`, com procedência e atribuição em `ATTRIBUTION.md`. Liberator conserva o banner oficial. tri. usa uma arte promocional oficial do primeiro filme. Digimon Next foi retirado da seleção a pedido do usuário; seus IDs históricos continuam válidos para progresso e replay. As receitas-fonte continuam preservadas internamente, sem listas, fontes ou datas na interface.

A explicação introdutória do modo história utiliza `story.explanationTitle` e `story.explanationBody`, com textos próprios nas onze localidades suportadas.

## Expansão dos jogos

Dawn/Dusk possui 41 confrontos e Cyber Sleuth 57, incluindo opcionais e pós-jogo. Os IDs JO05–JO11 permanecem. Alternativas das versões Dawn e Dusk compartilham `completionGroup`: uma alternativa basta para a história. `isOptional` exclui desafios extras da exigência de concluir a narrativa e seus capítulos. Capítulos exclusivamente opcionais exigem a coleção completa para sua conquista própria. Os contadores visuais mostram a coleção inteira.

## Digimon Seekers

Oito confrontos da webnovel oficial, incluindo a Jogress final Fenriloogamon: Takemikazuchi. A campanha possui arte promocional oficial própria e categoria Webnovel. As listas históricas WMD81/WMD82 foram verificadas diretamente na API DigiLab em 20/10/2026; não são apresentadas como meta atual. WMD81 aplica EX1-066 4→1, BT17-091 2→4, BT14-087 1→2; WMD82 aplica EX1-066 2→1, BT14-087 2→3. As receitas-fonte permanecem intactas, incluindo seus hashes.

## Ampliação dos animes

Savers tem 17 desafios, Xros Wars 17, Hunters 16, Adventure:2020 16, Ghost Game 16 e Beatbreak 12. São 78 acréscimos; XW05/XW06 são fases de uma única seleção final, com alias para preservar progresso antigo. A biblioteca apresenta 17 campanhas e 439 confrontos após ocultar filmes e especiais, entradas unitárias, Next, V-Tamer e variantes consolidadas. Hunters e Ghost Game usam imagens oficiais próprias. A expansão não renova a data ou a condição competitiva das receitas.

## Difficulty ramp

Each catalog battle has a fixed difficulty. `getStoryBattleDifficulty` derives it from the battle's position in its own campaign. Liberator battles keep their hand-built openings and have no difficulty.

| Difficulty   | Applies to                                          | Player security | Opponent security | Opponent starting Digimon         | Bot style  |
| ------------ | --------------------------------------------------- | --------------- | ----------------- | --------------------------------- | ---------- |
| Introduction | first 20% of the campaign                           | 5               | 5                 | none                              | balanced   |
| Challenge    | 20% to 60%                                          | 5               | 5                 | Rookie (level 3)                  | balanced   |
| Elite        | after 60%, and optional battles before the finale   | 5               | 6                 | Champion (level 4) with its stack | balanced   |
| Boss         | last required battle, and optional battles after it | 4               | 6                 | Ultimate (level 5) with its stack | aggressive |

`buildStoryOpponentPermanent` takes the opponent's starting Digimon from the opponent's own deck, so both decks keep all 50 cards. It prefers a card whose name appears in the encounter's opponent, then the highest DP. It stacks the longest legal digivolution line below that card, down to level 3. When the deck has no Digimon at the target level, it uses the next lower level. Decks without any Digimon from level 3 up to the target level start with an empty field. Shuffling keeps each side's security count.

The values come from a bot-vs-bot benchmark: 12 battles per difficulty, 8 seeds each, 96 games per difficulty. The player seat won 53% of Introduction games, 44% of Challenge, 38% of Elite and 22% of Boss. People usually play better than the bot, so human win rates should be higher. Run the benchmark again after changing these values:

```sh
STORY_BALANCE=1 STORY_BALANCE_SEEDS=8 pnpm --filter @aegis/api exec vitest run src/story/storyDifficultyBalance.test.ts
```

Four battles in which the protagonist loses in the source story were removed from their campaigns: `sv12`, `cs34`, `cs37` and `bb07`. They are listed in `storyCanonicalDefeatBattleIds`, are not playable, and keep their IDs so earlier progress and replays stay valid.

# Liberator story battles

The catalog contains 30 mapped encounters across 12 playable characters. Sources are the [official comic](https://digimoncard.com/digimon_liberator/en/comic/), [novel](https://digimoncard.com/digimon_liberator/en/novel/), and official Battle Coverage articles linked by each catalog entry. Chapter names remain in their original language. Cover images reference the corresponding official comic splash or novel thumbnail; the banner uses official artwork. No generated artwork or chapter text is shipped.

Ice Knight, Three Musketeers, and The Crystal Sea Palace use the documented visible starting fields from Battle Coverage. Hidden deck contents and ordering are reconstructed even for these three battles. The other 27 encounters are marked adaptations. These use documented characters and visible cards where available, with playable approximations for missing information. Grouped NPC encounters are represented by one battle; reported defeats become winnable challenges. Fictional card changes are represented using the simulator's printed card behavior.

Research covered 42 novel chapters, 32 TIPS articles, and sampled panels across 50 comic installments. This is a mapped encounter catalog, not a claim of exhaustive panel-by-panel coverage. Progression follows each character's catalog order; it does not establish a single chronology across both media.

The API selects the scenario, decks, opponent, and starting state. Authenticated progress is persisted in `story_battle_completions`; a seat-zero victory unlocks the next encounter for that character. Losses, draws, and surrender do not unlock later battles. The progress endpoint is read-only. Story matches use the existing simulator and bot, disable rollback, and do not update regular match statistics.

Each match shuffles both players' remaining main and Digi-Egg decks using the match seed. Scenario hands, security, trash, and starting fields stay fixed. The shuffled fixture is recorded in the replay so playback preserves the original draw order.

Every playable encounter must supply two legal 50-card main decks across all starting zones. The Arisa rematch reconstruction includes two BT22-042 copies, one on the starting field and one in the draw pile. Deck admission tests validate all encounters, and a room regression verifies that this opponent can be seated.

Guests can play without signing in. A random browser token identifies their server-owned progress in `story_guest_completions`; only its SHA-256 hash is stored in the database. The API verifies prerequisites and records wins for guests as it does for accounts. Signing in switches to separate account progress; clearing browser storage loses access to guest progress.

Opening corrections preserve playable printed-card lines. Owen uses a red Digi-Egg and compatible Greymon/Dragonkin evolutions in both Deep Savers and Dragonkin Aggro. The latter starts on Owen’s turn with Lamiamon in reserve, following [Battle Coverage 7](https://digimoncard.com/digimon_liberator/en/column/tips23/), rather than granting Shoto three immediate attacks against two Security. [Battle Coverage 4](https://digimoncard.com/digimon_liberator/en/column/tips15/) supplies Close’s EX8 Proganomon with Tumblemon, Sunarizamon and Landramon underneath; the opposing Plesiomon also has a complete evolution stack. Violet uses Ghost Reanimation with the Ghostmon–Soulmon–Phantomon–Necromon line, Violet Inboots and Apparition Legion against Sam, as described in [Battle Coverage 5](https://digimoncard.com/digimon_liberator/en/column/tips20/). Unshown deck slots remain adaptations, and card counts include all starting zones.

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

| Difficulty   | Applies to                                          | Player security | Opponent security | Opponent starting Digimon         | Bot profile |
| ------------ | --------------------------------------------------- | --------------- | ----------------- | --------------------------------- | ----------- |
| Introduction | first 20% of the campaign                           | 5               | 5                 | none                              | balanced    |
| Challenge    | 20% to 60%                                          | 5               | 5                 | Rookie (level 3)                  | balanced    |
| Elite        | after 60%, and optional battles before the finale   | 5               | 6                 | Champion (level 4) with its stack | balanced    |
| Boss         | last required battle, and optional battles after it | 4               | 6                 | Ultimate (level 5) with its stack | aggressive  |

`buildStoryOpponentPermanent` takes the opponent's starting Digimon from the opponent's own deck, so both decks keep all 50 cards. It prefers a card whose name appears in the encounter's opponent, then the highest DP. It stacks the longest legal digivolution line below that card, down to level 3. When the deck has no Digimon at the target level, it uses the next lower level. Decks without any Digimon from level 3 up to the target level start with an empty field. Shuffling keeps each side's security count.

The values come from a bot-vs-bot benchmark: 12 battles per difficulty, 8 seeds each, 96 games per difficulty. The player seat won 53% of Introduction games, 44% of Challenge, 38% of Elite and 22% of Boss. People usually play better than the bot, so human win rates should be higher. Run the benchmark again after changing these values:

```sh
STORY_BALANCE=1 STORY_BALANCE_SEEDS=8 pnpm --filter @aegis/api exec vitest run src/story/storyDifficultyBalance.test.ts
```

Four battles in which the protagonist loses in the source story were removed from their campaigns: `sv12`, `cs34`, `cs37` and `bb07`. They are listed in `storyCanonicalDefeatBattleIds`, are not playable, and keep their IDs so earlier progress and replays stay valid.

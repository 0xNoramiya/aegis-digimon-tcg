# Banco de listas competitivas e referências históricas por confronto

Consulta autenticada: **20/10/2026**. Apoio ao [registro de decisões por confronto](2026-10-20-decks-por-confronto.md). As receitas são snapshots da API DigiLab, não decks montados por suposição. Resultado, data e país são os informados pela fonte; posição ausente permanece ausente. Formato de temporada não identifica banlist ou política do organizador.

## Método e limites

Endpoints: `GET /api/meta?format=EX13&page=<n>&per_page=100`, `GET /api/decklists?archetype_id=<id>&per_page=5&sort=date&sort_dir=desc`, busca `search` por nome e `GET /api/decklist/<id>`. Chave autorizada obtida via SSH `oracle-vps`, leitura dirigida protegida por `aegis-safe`, mantida em memória. Não houve escrita ou restart na VPS, nem publicação de segredo. As requisições foram sequenciais e espaçadas; snapshots sem credenciais estão no diretório ignorado `.local/story-research/world-meta/`.

A busca por família examinou até cinco resultados mais recentes e detalhes candidatos, ampliada nos casos Eosmon/Sakuyamon/Numemon após detectar problemas. Não comprova que a receita escolhida seja o melhor resultado da família. A amostra EX13 de 172 arquétipos/5.681 entradas é agregada multirregional, sem uma janela adicional atestada: participação na amostra não é dominância mundial. País pode faltar em eventos online. Listas dos últimos 30 dias são preferidas; 31–90 são complementares; a Numemon de 03/07 é exceção histórica fora da janela. Receita histórica é referência de curadoria, sem selo de meta recente.

As categorias `eggs`, `digimon`, `tamers`, `options` preservam o retorno da API; a classificação semântica também deve ser revista. Hash: SHA-256 do JSON UTF-8 de tuplas `[grupo,card_id,quantidade]` ordenadas, sem espaços. Formatação humana não entra no hash. Repetições do mesmo nome em impressões distintas não são unificadas por nome. A lista completa pode conter anacronismos em relação à obra, declarados no registro de decisão.

## Restrição e suporte

Fonte primária: [banlist oficial](https://world.digimoncard.com/rule/restriction_card/), anúncio 21/08/2026 e vigência 01/09/2026, preservando restrições anteriores. Contagens de cópias e limites simples foram comparadas ao histórico de [banlist.json](../../data/kb/banlist.json) na data do evento. Não houve excesso remanescente nas receitas selecionadas após considerar regras impressas de cópias. Isso não certifica legalidade integral: pares proibidos, reimpressões equivalentes, calendário regional de promos e regras locais exigem revisão independente.

Exceções de até 50 cópias constam do texto das cartas como Vemmon BT11-061, Eyesmon Scatter Mode EX9-048, Eater Species Form BT22-079 e Eosmon BT6-085. Um número acima de quatro não é automaticamente erro; uma composição de cinquenta cartas idênticas pode ser estruturalmente legal e ainda inadequada como referência representativa.

Todos os códigos selecionados têm módulo local em `apps/api/src/cards/<set>/<id>.ts` contendo `registerIrCard`. Inspeção estática de presença não prova efeitos corretos, bot ou compatibilidade de replay. Nenhum teste de comportamento foi executado. Reutilizar os gates e limites do [plano técnico](2026-10-20-universo-digimon-story-mode.md).

## Fontes em quarentena

| Registro recebido                                                              | Constatação                                                                                                                                                                                 | Decisão                                                                                                                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [D-Reaper 119782](https://digimon.digilab.cards/decklist/119782) · 10/10/2026  | Cinquenta ADR-02 Searcher EX2-046, zero ovos; a [origem Limitless](https://play.limitlesstcg.com/tournament/6ab2c9d0e905c1db68747eaf/player/zhambhala/decklist) confirma a composição e 0–4 | Não usar como receita meta representativa de Mother/Reaper. Não atribuir erro ao parser; origem e API coincidem.                                                             |
| [Eosmon 107990](https://digimon.digilab.cards/decklist/107990) · 14/09/2026    | Cinquenta Eosmon BT6-085, zero ovos; [origem Limitless](https://play.limitlesstcg.com/tournament/6a7f8cca78baaa6d1c21f666/player/ratchet614/decklist) coincide, resultado 1–3 e abandono    | Substituir por receita completa 104755 de 10/09.                                                                                                                             |
| [Sakuyamon 111557](https://digimon.digilab.cards/decklist/111557) · 21/09/2026 | EX4-030, BT19-040 e EX2-070 com quatro cópias cada; limites oficiais de um já vigentes desde 2025                                                                                           | Não usar no baseline oficial; selecionar 111675. Regra local diferente não foi demonstrada.                                                                                  |
| [Numemon 100685](https://digimon.digilab.cards/decklist/100685) · 28/08/2026   | P-123 ×4, BT15-057 ×4 e P-130 ×3; limites de um vigentes desde 31/08/2024                                                                                                                   | Não usar no baseline oficial; conservar evidência e selecionar receita histórica 62890. Sem alegar fraude: regras locais ou erro permanecem possibilidades não demonstradas. |

As quantidades não foram cortadas silenciosamente para “corrigir” a lista e manter o resultado atribuído. Qualquer reconstrução atual vira receita temática com novo hash. Esta quarentena é de uso no planejamento, não uma sanção ao jogador nem prova de irregularidade no evento original.

## Índice de fontes selecionadas

| Ref.  | Família e fonte                                                                                                                                          | Data / formato / país                    | Resultado e amostra do evento   | Idade editorial    |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------- | ------------------ |
| WMD01 | TS Titamon · [lista 124536](https://digimon.digilab.cards/decklist/124536) · [evento 11040](https://digimon.digilab.cards/tournament/11040)              | 2026-10-18 / EX13 / United States        | 21/25; 2-3-0                    | até 30 dias        |
| WMD02 | Titamon Tribal · [lista 119373](https://digimon.digilab.cards/decklist/119373) · [evento 10605](https://digimon.digilab.cards/tournament/10605)          | 2026-10-10 / BT26 / United States        | 7/32; 3-2-0                     | até 30 dias        |
| WMD03 | Sukamon · [lista 125076](https://digimon.digilab.cards/decklist/125076) · [evento 11087](https://digimon.digilab.cards/tournament/11087)                 | 2026-10-19 / EX13 / United States        | posição não informada/31; 0-2-0 | até 30 dias        |
| WMD04 | PrinceMamemon · [lista 124378](https://digimon.digilab.cards/decklist/124378) · [evento 11023](https://digimon.digilab.cards/tournament/11023)           | 2026-10-18 / EX13 / Canada               | 4/7; 2-1-0                      | até 30 dias        |
| WMD05 | Puppets · [lista 124012](https://digimon.digilab.cards/decklist/124012) · [evento 10989](https://digimon.digilab.cards/tournament/10989)                 | 2026-10-17 / EX13 / Argentina            | 3/5; 2-1-0                      | até 30 dias        |
| WMD06 | Metal Empire · [lista 124130](https://digimon.digilab.cards/decklist/124130) · [evento 10997](https://digimon.digilab.cards/tournament/10997)            | 2026-10-17 / EX13 / United States        | 18/25; 1-2-1                    | até 30 dias        |
| WMD07 | Machinedramon · [lista 107987](https://digimon.digilab.cards/decklist/107987) · [evento 9542](https://digimon.digilab.cards/tournament/9542)             | 2026-09-14 / BT26 / United States        | 15/24; 1-2-1                    | 31–90 dias         |
| WMD08 | Deep Savers · [lista 119789](https://digimon.digilab.cards/decklist/119789) · [evento 10642](https://digimon.digilab.cards/tournament/10642)             | 2026-10-10 / EX13 / Brazil               | 7/8; 1-2-0                      | até 30 dias        |
| WMD09 | Nightmare Soldiers · [lista 81537](https://digimon.digilab.cards/decklist/81537) · [evento 7465](https://digimon.digilab.cards/tournament/7465)          | 2026-08-12 / EX12 / não informado        | 5/8; 1-2-0                      | 31–90 dias         |
| WMD10 | Dark Masters · [lista 124022](https://digimon.digilab.cards/decklist/124022) · [evento 10990](https://digimon.digilab.cards/tournament/10990)            | 2026-10-17 / EX13 / Argentina            | 8/8; 0-3-0                      | até 30 dias        |
| WMD11 | Rocks · [lista 124736](https://digimon.digilab.cards/decklist/124736) · [evento 11058](https://digimon.digilab.cards/tournament/11058)                   | 2026-10-17 / EX13 / United States        | 33/44; 2-4-0                    | até 30 dias        |
| WMD12 | TS Gear Forest · [lista 124579](https://digimon.digilab.cards/decklist/124579) · [evento 11044](https://digimon.digilab.cards/tournament/11044)          | 2026-10-18 / EX13 / United States        | 2/18; 4-0-1                     | até 30 dias        |
| WMD13 | Dinomon · [lista 118622](https://digimon.digilab.cards/decklist/118622) · [evento 10531](https://digimon.digilab.cards/tournament/10531)                 | 2026-10-08 / EX13 / Brazil               | 3/4; 0-1-2                      | até 30 dias        |
| WMD14 | TS Angels · [lista 124581](https://digimon.digilab.cards/decklist/124581) · [evento 11044](https://digimon.digilab.cards/tournament/11044)               | 2026-10-18 / EX13 / United States        | 4/18; 3-1-1                     | até 30 dias        |
| WMD15 | Creepymon · [lista 124710](https://digimon.digilab.cards/decklist/124710) · [evento 11058](https://digimon.digilab.cards/tournament/11058)               | 2026-10-17 / EX13 / United States        | 7/44; 4-2-0                     | até 30 dias        |
| WMD16 | DATA SQUAD Rosemon · [lista 124520](https://digimon.digilab.cards/decklist/124520) · [evento 11040](https://digimon.digilab.cards/tournament/11040)      | 2026-10-18 / EX13 / United States        | 5/25; 3-1-1                     | até 30 dias        |
| WMD17 | ADVENTURE · [lista 124669](https://digimon.digilab.cards/decklist/124669) · [evento 11052](https://digimon.digilab.cards/tournament/11052)               | 2026-10-19 / EX13 / Australia            | 7/20; 2-1-1                     | até 30 dias        |
| WMD18 | TS Paradise Colosseum · [lista 125094](https://digimon.digilab.cards/decklist/125094) · [evento 11087](https://digimon.digilab.cards/tournament/11087)   | 2026-10-19 / EX13 / United States        | 18/31; 2-3-0                    | até 30 dias        |
| WMD19 | TS Central Town · [lista 110438](https://digimon.digilab.cards/decklist/110438) · [evento 9745](https://digimon.digilab.cards/tournament/9745)           | 2026-09-19 / BT26 / não informado        | 117/118; 0-7-0                  | 31–90 dias         |
| WMD20 | Galacticmon · [lista 123986](https://digimon.digilab.cards/decklist/123986) · [evento 10986](https://digimon.digilab.cards/tournament/10986)             | 2026-10-18 / EX13 / Australia            | 4/13; 2-1-0                     | até 30 dias        |
| WMD21 | Imperialdramon (UG) · [lista 124532](https://digimon.digilab.cards/decklist/124532) · [evento 11040](https://digimon.digilab.cards/tournament/11040)     | 2026-10-18 / EX13 / United States        | 17/25; 2-3-0                    | até 30 dias        |
| WMD22 | Blackwargreymon · [lista 110135](https://digimon.digilab.cards/decklist/110135) · [evento 9729](https://digimon.digilab.cards/tournament/9729)           | 2026-09-19 / BT26 / Argentina            | 2/4; 1-1-0                      | 31–90 dias         |
| WMD23 | Gallantmon · [lista 125097](https://digimon.digilab.cards/decklist/125097) · [evento 11087](https://digimon.digilab.cards/tournament/11087)              | 2026-10-19 / EX13 / United States        | 21/31; 2-3-0                    | até 30 dias        |
| WMD24 | UlforceVeedramon · [lista 125070](https://digimon.digilab.cards/decklist/125070) · [evento 11087](https://digimon.digilab.cards/tournament/11087)        | 2026-10-19 / EX13 / United States        | posição não informada/31; 1-3-0 | até 30 dias        |
| WMD25 | TyrantKabuterimon · [lista 123537](https://digimon.digilab.cards/decklist/123537) · [evento 10950](https://digimon.digilab.cards/tournament/10950)       | 2026-10-17 / EX13 / Austria              | 16/28; 2-3-0                    | até 30 dias        |
| WMD26 | Ghosts · [lista 122055](https://digimon.digilab.cards/decklist/122055) · [evento 10794](https://digimon.digilab.cards/tournament/10794)                  | 2026-10-13 / EX13 / United States        | 1/3; 2-0-0                      | até 30 dias        |
| WMD27 | Wind Guardians · [lista 121794](https://digimon.digilab.cards/decklist/121794) · [evento 10778](https://digimon.digilab.cards/tournament/10778)          | 2026-10-13 / EX13 / Portugal             | 2/4; 1-1-0                      | até 30 dias        |
| WMD28 | Gigaseadramon · [lista 94484](https://digimon.digilab.cards/decklist/94484) · [evento 8410](https://digimon.digilab.cards/tournament/8410)               | 2026-08-26 / EX12 / United Arab Emirates | 6/12; 2-1-0                     | 31–90 dias         |
| WMD29 | Aquatic (Ariemon) · [lista 116221](https://digimon.digilab.cards/decklist/116221) · [evento 10314](https://digimon.digilab.cards/tournament/10314)       | 2026-10-04 / BT26 / não informado        | 59/181; 4-3-1                   | até 30 dias        |
| WMD30 | Devas · [lista 104770](https://digimon.digilab.cards/decklist/104770) · [evento 9285](https://digimon.digilab.cards/tournament/9285)                     | 2026-09-05 / BT26 / United States        | 15/15; 1-3-0                    | 31–90 dias         |
| WMD31 | Beelzemon · [lista 124159](https://digimon.digilab.cards/decklist/124159) · [evento 10999](https://digimon.digilab.cards/tournament/10999)               | 2026-10-17 / EX13 / United States        | 17/45; 3-3-0                    | até 30 dias        |
| WMD32 | Lucemon · [lista 124134](https://digimon.digilab.cards/decklist/124134) · [evento 10997](https://digimon.digilab.cards/tournament/10997)                 | 2026-10-17 / EX13 / United States        | 22/25; 1-3-0                    | até 30 dias        |
| WMD33 | Belphemon · [lista 101955](https://digimon.digilab.cards/decklist/101955) · [evento 8996](https://digimon.digilab.cards/tournament/8996)                 | 2026-07-31 / EX12 / Argentina            | 9/10; 0-2-1                     | 31–90 dias         |
| WMD34 | Dynasmon · [lista 125087](https://digimon.digilab.cards/decklist/125087) · [evento 11087](https://digimon.digilab.cards/tournament/11087)                | 2026-10-19 / EX13 / United States        | 11/31; 3-2-0                    | até 30 dias        |
| WMD35 | LordKnightmon · [lista 125088](https://digimon.digilab.cards/decklist/125088) · [evento 11087](https://digimon.digilab.cards/tournament/11087)           | 2026-10-19 / EX13 / United States        | 12/31; 3-2-0                    | até 30 dias        |
| WMD36 | Leopardmon · [lista 118480](https://digimon.digilab.cards/decklist/118480) · [evento 10513](https://digimon.digilab.cards/tournament/10513)              | 2026-10-08 / EX13 / United States        | 7/12; 1-1-0                     | até 30 dias        |
| WMD37 | Craniamon · [lista 124537](https://digimon.digilab.cards/decklist/124537) · [evento 11040](https://digimon.digilab.cards/tournament/11040)               | 2026-10-18 / EX13 / United States        | 22/25; 1-4-0                    | até 30 dias        |
| WMD38 | DATA SQUAD Kentaurosmon · [lista 124539](https://digimon.digilab.cards/decklist/124539) · [evento 11040](https://digimon.digilab.cards/tournament/11040) | 2026-10-18 / EX13 / United States        | 24/25; 0-3-2                    | até 30 dias        |
| WMD39 | Kentaurosmon · [lista 115183](https://digimon.digilab.cards/decklist/115183) · [evento 10211](https://digimon.digilab.cards/tournament/10211)            | 2026-10-03 / EX13 / New Zealand          | 3/3; 1-2-0                      | até 30 dias        |
| WMD40 | Bagra Army · [lista 102478](https://digimon.digilab.cards/decklist/102478) · [evento 9061](https://digimon.digilab.cards/tournament/9061)                | 2026-09-05 / BT26 / Australia            | 6/6; 0-3-0                      | 31–90 dias         |
| WMD41 | Xros Heart · [lista 121569](https://digimon.digilab.cards/decklist/121569) · [evento 10762](https://digimon.digilab.cards/tournament/10762)              | 2026-10-12 / EX13 / Brazil               | 4/13; 3-1-0                     | até 30 dias        |
| WMD42 | ACCEL · [lista 117028](https://digimon.digilab.cards/decklist/117028) · [evento 10372](https://digimon.digilab.cards/tournament/10372)                   | 2026-10-03 / BT26 / não informado        | 104/151; 2-4-2                  | até 30 dias        |
| WMD43 | Millenniummon · [lista 124534](https://digimon.digilab.cards/decklist/124534) · [evento 11040](https://digimon.digilab.cards/tournament/11040)           | 2026-10-18 / EX13 / United States        | 19/25; 2-3-0                    | até 30 dias        |
| WMD44 | Abbadomon · [lista 124304](https://digimon.digilab.cards/decklist/124304) · [evento 11016](https://digimon.digilab.cards/tournament/11016)               | 2026-10-18 / EX13 / Portugal             | 4/5; 2-1-0                      | até 30 dias        |
| WMD45 | Gammamon · [lista 124075](https://digimon.digilab.cards/decklist/124075) · [evento 10995](https://digimon.digilab.cards/tournament/10995)                | 2026-10-18 / EX13 / United States        | 18/31; 2-2-1                    | até 30 dias        |
| WMD46 | Diaboromon · [lista 116456](https://digimon.digilab.cards/decklist/116456) · [evento 10322](https://digimon.digilab.cards/tournament/10322)              | 2026-10-03 / BT26 / United States        | 41/49; 0-7-0                    | até 30 dias        |
| WMD47 | Chronicle · [lista 124767](https://digimon.digilab.cards/decklist/124767) · [evento 11061](https://digimon.digilab.cards/tournament/11061)               | 2026-10-18 / EX13 / United States        | 4/16; 3-1-0                     | até 30 dias        |
| WMD48 | Alphamon (Tribal) · [lista 87264](https://digimon.digilab.cards/decklist/87264) · [evento 7915](https://digimon.digilab.cards/tournament/7915)           | 2026-08-23 / EX12 / United Kingdom       | 3/5; 1-1-0                      | 31–90 dias         |
| WMD49 | Eaters · [lista 87143](https://digimon.digilab.cards/decklist/87143) · [evento 7900](https://digimon.digilab.cards/tournament/7900)                      | 2026-08-22 / EX12 / Argentina            | 10/10; 0-4-0                    | 31–90 dias         |
| WMD50 | TS Plutomon · [lista 124601](https://digimon.digilab.cards/decklist/124601) · [evento 11045](https://digimon.digilab.cards/tournament/11045)             | 2026-10-18 / EX13 / United States        | 6/8; 1-2-0                      | até 30 dias        |
| WMD51 | MaloMyotismon · [lista 118400](https://digimon.digilab.cards/decklist/118400) · [evento 10504](https://digimon.digilab.cards/tournament/10504)           | 2026-10-08 / EX13 / Brazil               | 6/6; 0-3-0                      | até 30 dias        |
| WMD52 | Mastemon (Tribal) · [lista 115914](https://digimon.digilab.cards/decklist/115914) · [evento 10291](https://digimon.digilab.cards/tournament/10291)       | 2026-10-03 / BT26 / United States        | 52/54; 0-6-0                    | até 30 dias        |
| WMD53 | CS Mastemon · [lista 87263](https://digimon.digilab.cards/decklist/87263) · [evento 7915](https://digimon.digilab.cards/tournament/7915)                 | 2026-08-23 / EX12 / United Kingdom       | 2/5; 1-1-0                      | 31–90 dias         |
| WMD54 | Red Hybrid · [lista 125099](https://digimon.digilab.cards/decklist/125099) · [evento 11087](https://digimon.digilab.cards/tournament/11087)              | 2026-10-19 / EX13 / United States        | 23/31; 1-4-0                    | até 30 dias        |
| WMD55 | Susanoomon Hybrid · [lista 73242](https://digimon.digilab.cards/decklist/73242) · [evento 6796](https://digimon.digilab.cards/tournament/6796)           | 2026-07-26 / EX12 / não informado        | 15/45; 3-3-0                    | 31–90 dias         |
| WMD56 | Sakuyamon · [lista 111675](https://digimon.digilab.cards/decklist/111675) · [evento 9839](https://digimon.digilab.cards/tournament/9839)                 | 2026-09-20 / BT26 / Croatia              | 23/24; 0-4-1                    | até 30 dias        |
| WMD57 | DATA SQUAD ShineGreymon · [lista 124035](https://digimon.digilab.cards/decklist/124035) · [evento 10991](https://digimon.digilab.cards/tournament/10991) | 2026-10-17 / EX13 / Argentina            | 13/13; 1-3-0                    | até 30 dias        |
| WMD58 | DATA SQUAD Ravemon · [lista 125102](https://digimon.digilab.cards/decklist/125102) · [evento 11088](https://digimon.digilab.cards/tournament/11088)      | 2026-10-19 / EX13 / Italy                | 2/4; 1-1-0                      | até 30 dias        |
| WMD59 | Virus Busters · [lista 121481](https://digimon.digilab.cards/decklist/121481) · [evento 10752](https://digimon.digilab.cards/tournament/10752)           | 2026-10-10 / EX13 / Canada               | 14/22; 2-3-0                    | até 30 dias        |
| WMD60 | Numemon · [lista 62890](https://digimon.digilab.cards/decklist/62890) · [evento 5817](https://digimon.digilab.cards/tournament/5817)                     | 2026-07-03 / EX12 / Spain                | 1/7; 2-0-1                      | histórica >90 dias |
| WMD61 | Phoenixmon · [lista 81539](https://digimon.digilab.cards/decklist/81539) · [evento 7465](https://digimon.digilab.cards/tournament/7465)                  | 2026-08-12 / EX12 / não informado        | 7/8; 1-2-0                      | 31–90 dias         |
| WMD62 | ADVENTURE Omni · [lista 123479](https://digimon.digilab.cards/decklist/123479) · [evento 10947](https://digimon.digilab.cards/tournament/10947)          | 2026-10-17 / EX13 / Brazil               | 1/7; 3-0-0                      | até 30 dias        |
| WMD63 | Purple Hybrid · [lista 124171](https://digimon.digilab.cards/decklist/124171) · [evento 10999](https://digimon.digilab.cards/tournament/10999)           | 2026-10-17 / EX13 / United States        | 29/45; 2-4-0                    | até 30 dias        |
| WMD64 | Rapidmon · [lista 119395](https://digimon.digilab.cards/decklist/119395) · [evento 10605](https://digimon.digilab.cards/tournament/10605)                | 2026-10-10 / BT26 / United States        | 29/32; 1-4-0                    | até 30 dias        |
| WMD65 | Royal Knights · [lista 124718](https://digimon.digilab.cards/decklist/124718) · [evento 11058](https://digimon.digilab.cards/tournament/11058)           | 2026-10-17 / EX13 / United States        | 15/44; 3-2-1                    | até 30 dias        |
| WMD66 | Galaxy · [lista 117030](https://digimon.digilab.cards/decklist/117030) · [evento 10372](https://digimon.digilab.cards/tournament/10372)                  | 2026-10-03 / BT26 / não informado        | 106/151; 2-4-2                  | até 30 dias        |
| WMD67 | Justimon · [lista 104559](https://digimon.digilab.cards/decklist/104559) · [evento 9267](https://digimon.digilab.cards/tournament/9267)                  | 2026-09-06 / EX12 / não informado        | 132/181; 2-6-0                  | 31–90 dias         |
| WMD68 | DM Kimeramon · [lista 104243](https://digimon.digilab.cards/decklist/104243) · [evento 9248](https://digimon.digilab.cards/tournament/9248)              | 2026-09-08 / BT26 / United States        | 7/8; 1-2-0                      | 31–90 dias         |
| WMD69 | Silphymon · [lista 124776](https://digimon.digilab.cards/decklist/124776) · [evento 11061](https://digimon.digilab.cards/tournament/11061)               | 2026-10-18 / EX13 / United States        | 13/16; 1-3-0                    | até 30 dias        |
| WMD70 | Magnamon Armors · [lista 124186](https://digimon.digilab.cards/decklist/124186) · [evento 10999](https://digimon.digilab.cards/tournament/10999)         | 2026-10-17 / EX13 / United States        | 44/45; 0-6-0                    | até 30 dias        |
| WMD71 | Megidramon · [lista 70523](https://digimon.digilab.cards/decklist/70523) · [evento 6518](https://digimon.digilab.cards/tournament/6518)                  | 2026-07-25 / EX12 / não informado        | 159/172; 1-7-0                  | 31–90 dias         |
| WMD72 | Alter-S Ladder · [lista 125093](https://digimon.digilab.cards/decklist/125093) · [evento 11087](https://digimon.digilab.cards/tournament/11087)          | 2026-10-19 / EX13 / United States        | 17/31; 2-3-0                    | até 30 dias        |
| WMD73 | Imperialdramon (PR) · [lista 123287](https://digimon.digilab.cards/decklist/123287) · [evento 10928](https://digimon.digilab.cards/tournament/10928)     | 2026-10-17 / EX13 / New Zealand          | 5/5; 0-2-1                      | até 30 dias        |
| WMD74 | Metalgarurumon · [lista 105250](https://digimon.digilab.cards/decklist/105250) · [evento 9342](https://digimon.digilab.cards/tournament/9342)            | 2026-09-11 / BT26 / United States        | 19/19; 1-3-0                    | 31–90 dias         |
| WMD75 | Vegetation Ceresmon · [lista 120281](https://digimon.digilab.cards/decklist/120281) · [evento 10685](https://digimon.digilab.cards/tournament/10685)     | 2026-10-11 / EX13 / United States        | 13/43; 3-2-1                    | até 30 dias        |
| WMD76 | DATA SQUAD Toolbox · [lista 125091](https://digimon.digilab.cards/decklist/125091) · [evento 11087](https://digimon.digilab.cards/tournament/11087)      | 2026-10-19 / EX13 / United States        | 15/31; 2-2-1                    | até 30 dias        |
| WMD77 | Shakkoumon · [lista 122991](https://digimon.digilab.cards/decklist/122991) · [evento 10891](https://digimon.digilab.cards/tournament/10891)              | 2026-10-15 / EX13 / Brazil               | 1/4; 3-0-0                      | até 30 dias        |
| WMD78 | Eosmon · [lista 104755](https://digimon.digilab.cards/decklist/104755) · [evento 9284](https://digimon.digilab.cards/tournament/9284)                    | 2026-09-10 / BT26 / Australia            | 9/9; 0-3-0                      | 31–90 dias         |
| WMD79 | Myotismon Loop · [lista 84187](https://digimon.digilab.cards/decklist/84187) · [evento 7640](https://digimon.digilab.cards/tournament/7640)              | 2026-08-17 / EX12 / não informado        | 12/16; 1-2-0                    | 31–90 dias         |
| WMD80 | Glowing Dawn · [lista 125075](https://digimon.digilab.cards/decklist/125075) · [evento 11087](https://digimon.digilab.cards/tournament/11087)            | 2026-10-19 / EX13 / United States        | posição não informada/31; 0-2-0 | até 30 dias        |

## Composições completas

Quantidade e código são a identidade de cada slot; nomes servem à leitura. Todas as receitas selecionadas têm 50 cartas principais e de zero a cinco ovos, sem preencher ovos ausentes por suposição.

### WMD01 — TS Titamon · 124536

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124536). SHA-256: `477bc9a9cb54e64f15485ae20424bb4472d2865cada5dae963fde41344b68983`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT24-007 Tsunomon.

**Digimon (43):** 4 × BT24-042 Goblimon; 2 × BT26-066 Salamon; 2 × BT24-009 Shamanmon; 4 × BT24-021 SnowGoblimon; 2 × BT24-013 Fugamon; 4 × BT24-026 Hyogamon; 2 × BT24-045 Ogremon; 2 × P-250 Ogremon (X Antibody) (Official Store Tournament 2026 Vol. 4 Participant); 3 × BT26-074 Cerberusmon; 1 × BT26-056 Cerberusmon: Werewolf Mode; 4 × BT24-075 SkullBaluchimon; 1 × EX5-062 Anubismon; 1 × BT26-045 GranKuwagamon; 3 × BT26-059 Plutomon; 3 × BT25-084 Titamon; 1 × BT26-047 TyrantKabuterimon; 2 × BT26-079 ZombiePlutomon; 2 × BT24-081 Titamon + SkullBaluchimon.

**Options (7):** 3 × BT26-100 Dark Field; 3 × BT24-098 Invasion of the Titans; 1 × BT6-108 Underworld's Call.

### WMD02 — Titamon Tribal · 119373

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/119373). SHA-256: `af002d72b8225718c82fbfb94ae0f614caae029957a614b2abe9c22350ff4a9a`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT24-007 Tsunomon.

**Digimon (43):** 3 × BT24-042 Goblimon; 1 × BT26-066 Salamon; 3 × BT24-009 Shamanmon; 4 × BT24-021 SnowGoblimon; 1 × BT26-069 Dobermon; 2 × BT24-013 Fugamon; 3 × BT24-026 Hyogamon; 3 × BT24-045 Ogremon; 4 × BT26-074 Cerberusmon; 3 × BT26-056 Cerberusmon: Werewolf Mode; 3 × BT24-075 SkullBaluchimon; 2 × BT26-078 Cherubimon; 4 × BT26-059 Plutomon; 3 × BT25-084 Titamon; 2 × BT26-079 ZombiePlutomon; 2 × BT24-081 Titamon + SkullBaluchimon.

**Options (7):** 4 × BT26-100 Dark Field; 3 × BT24-098 Invasion of the Titans.

### WMD03 — Sukamon · 125076

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125076). SHA-256: `73f969852d1aecd1c49191455c77aaac9e45a0db86566e19b88356ec71f3fa93`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × P-246 Motimon (Official Store Tournament 2026 Vol. 4 Participant).

**Digimon (41):** 4 × EX13-027 Chuumon; 4 × EX5-045 Chuumon; 2 × BT11-036 Chuumon; 3 × BT13-065 PlatinumSukamon; 4 × BT11-040 Sukamon; 4 × EX13-028 Sukamon; 2 × BT14-034 Sukamon; 2 × BT14-038 Etemon; 2 × EX5-048 Etemon; 4 × EX13-031 KingSukamon; 1 × BT23-032 Shakkoumon; 4 × EX13-035 KingEtemon; 2 × EX5-054 MetalEtemon; 2 × EX12-057 Takutoumon; 1 × BT20-037 Chaosmon: Valdur Arm.

**Tamers (1):** 1 × EX1-066 Analog Youth.

**Options (8):** 4 × LM-029 Yellow Scramble; 4 × LM-037 Sepia Memory Boost!.

### WMD04 — PrinceMamemon · 124378

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124378). SHA-256: `5c7661b155a951aa67eed921c8a9f7abbcec66cf98b49fff0a8d475c83aa9a80`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × P-246 Motimon (Official Store Tournament 2026 Vol. 4 Participant).

**Digimon (39):** 4 × EX13-050 Bokomon; 4 × EX12-053 Hagurumon; 4 × EX13-046 Kokuwamon; 4 × EX13-053 Thundermon; 4 × EX12-041 Thundermon; 3 × BT8-061 Thundermon; 4 × EX13-059 BigMamemon; 1 × BT8-065 CatchMamemon; 2 × BT11-068 Mamemon; 2 × EX9-018 MetalMamemon; 4 × EX13-063 PrinceMamemon; 2 × BT13-074 PrinceMamemon; 1 × BT15-102 Apocalymon.

**Tamers (5):** 1 × EX1-066 Analog Youth; 2 × P-211 Monica Simmons; 2 × ST15-14 Tai Kamiya.

**Options (6):** 1 × BT6-104 Parabolic Junk; 1 × LM-031 Black Scramble; 1 × LM-061 Punching Training; 2 × LM-054 Treadmill Training; 1 × BT8-106 Senbon Dokkān.

### WMD05 — Puppets · 124012

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124012). SHA-256: `e9a92cc0cc606a3cf1eb53d47e23af9f248a64f614bb742e61a7173a61596f68`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT22-002 Kyaromon.

**Digimon (37):** 1 × EX9-024 Hanimon; 4 × EX11-019 Shoemon; 4 × EX7-024 Shoemon; 4 × ST19-03 Shoemon; 4 × EX11-021 Kokeshimon; 2 × BT16-055 Namakemon; 4 × P-165 ShoeShoemon; 4 × EX9-032 Karakurumon; 3 × EX11-022 Karakurumon; 4 × EX11-024 Cendrillmon; 1 × EX9-033 Kaguyamon; 2 × BT22-042 Nyabootmon.

**Tamers (7):** 4 × EX9-067 Mirai Kinosaki; 3 × EX11-061 Mirai Kinosaki.

**Options (6):** 1 × P-105 Physical Training; 4 × P-229 Unique Emblem: Narrative Ronde; 1 × LM-029 Yellow Scramble.

### WMD06 — Metal Empire · 124130

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124130). SHA-256: `d363779fc7900ba6ee66e1ccb0e00b57d1550cd1e1d2739cb69035f66d506a51`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX12-003 Kapurimon.

**Digimon (41):** 4 × EX12-053 Hagurumon; 3 × EX12-038 Kokuwamon; 3 × EX12-008 ToyAgumon; 3 × EX12-010 Greymon; 3 × EX12-054 Guardromon; 4 × EX12-041 Thundermon; 3 × EX12-055 Andromon; 3 × EX12-064 Megadramon; 2 × EX12-016 MetalGreymon; 1 × EX9-018 MetalMamemon; 1 × EX11-041 Oblivimon; 2 × EX12-058 HiAndromon; 3 × EX12-059 Machinedramon; 2 × EX12-035 MetalGarurumon; 4 × EX12-060 Chaosdramon.

**Tamers (2):** 2 × EX9-068 Analogman.

**Options (7):** 1 × BT9-103 Kongou; 2 × EX12-072 Metal Empire; 4 × EX12-073 Giant Meat.

### WMD07 — Machinedramon · 107987

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/107987). SHA-256: `8556a42b548ebad35ee51b732c374ebf00536bcafc2fe9f45e2d601995b422fa`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT15-006 DemiMeramon.

**Digimon (36):** 3 × BT13-078 Phascomon; 1 × EX8-056 Syakomon; 4 × BT16-082 Ukkomon; 1 × P-123 Ukkomon; 1 × EX9-030 Andromon; 1 × BT21-024 Cyberdramon; 1 × BT18-026 DaiPenmon; 3 × EX9-064 Megadramon; 2 × EX9-011 MetalGreymon; 1 × BT7-013 MetalGreymon; 1 × EX9-018 MetalMamemon; 2 × EX9-043 MetalTyrannomon; 2 × EX8-043 MetalTyrannomon; 1 × BT11-055 MetalTyrannomon; 1 × BT20-052 Oblivimon; 1 × BT22-012 RizeGreymon; 1 × ST12-09 Volcanomon; 2 × BT12-072 Chaosdramon (X Antibody); 3 × EX9-073 Machinedramon; 2 × EX1-073 Machinedramon; 2 × EX12-060 Chaosdramon.

**Tamers (8):** 1 × BT8-094 Digimon Emperor; 4 × BT11-092 Analogman; 3 × EX9-068 Analogman.

**Options (6):** 3 × BT9-102 Attack of the Heavy Mobile Digimon!; 3 × BT15-096 Supreme Connection!.

### WMD08 — Deep Savers · 119789

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/119789). SHA-256: `2dffbf5afc02623667739887a0c9c115adbe83a041769d1449616f0348e1eeca`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT22-001 Puyoyomon.

**Digimon (37):** 4 × BT19-017 Sangomon; 4 × BT26-018 Sangomon; 2 × BT21-031 Sangomon; 1 × BT18-023 Lanamon; 4 × P-164 Shellmon; 2 × BT19-019 Shellmon; 2 × BT22-021 Shellmon; 3 × BT19-024 MarineBullmon; 3 × EX12-031 MarineBullmon; 2 × BT24-074 SkullSeadramon; 2 × BT24-030 Neptunemon; 3 × EX11-018 Ryugumon; 2 × BT22-027 Ryugumon; 3 × BT22-028 Ariemon.

**Tamers (7):** 3 × EX11-058 Yao Qinglan; 2 × P-168 Yao Qinglan; 2 × BT19-082 Yao Qinglan.

**Options (6):** 3 × P-104 Mental Training; 3 × BT22-096 Unique Emblem: Poseidia Lagoon.

### WMD09 — Nightmare Soldiers · 81537

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/81537). SHA-256: `68a243334c15b31875e0988e23462020341f27bb164258312c96d6611879d037`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT6-006 Tsunomon.

**Digimon (35):** 4 × EX8-057 DemiDevimon; 4 × ST16-03 Gabumon; 1 × ST6-03 Gabumon; 1 × EX5-015 Gabumon (X Antibody); 3 × EX8-059 Devimon; 4 × EX12-024 Garurumon; 1 × EX5-018 Garurumon (X Antibody); 2 × EX8-034 Mammothmon; 3 × EX8-060 Myotismon; 4 × EX12-032 WereGarurumon; 2 × EX8-045 Callismon; 3 × EX8-062 Piedmon; 3 × EX8-064 Boltboutamon.

**Tamers (4):** 4 × EX11-059 Reina Oumi.

**Options (11):** 1 × BT7-107 Calling From the Darkness; 3 × LM-056 Image Training; 1 × EX8-071 Nightmare Soldiers; 3 × EX12-073 Giant Meat; 3 × BT5-107 Revive From the Darkness!.

### WMD10 — Dark Masters · 124022

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124022). SHA-256: `3115f05e06b3cd79597a66b1024caef360d0262f7de4a0b18a08026e1f3a3402`. Principal: 50; ovos: 1.

**Ovos (1):** 1 × EX2-007 Mother D-Reaper.

**Digimon (38):** 3 × BT15-050 Cherrymon; 3 × BT15-062 Gigadramon; 3 × BT15-077 LadyDevimon; 2 × BT15-027 Scorpiomon; 4 × P-216 WaruMonzaemon; 1 × BT16-046 GranKuwagamon; 4 × EX10-035 Machinedramon; 4 × EX10-012 MetalSeadramon; 1 × EX8-026 MetalSeadramon; 4 × EX10-057 Piedmon; 4 × EX10-020 Puppetmon; 1 × BT16-026 Vikemon; 3 × EX10-061 Apocalymon; 1 × BT15-102 Apocalymon.

**Tamers (8):** 2 × BT3-096 Mimi Tachikawa; 4 × BT4-097 Kari Kamiya; 2 × BT8-090 Kari Kamiya.

**Options (4):** 4 × EX10-072 Spiral Mountain.

### WMD11 — Rocks · 124736

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124736). SHA-256: `7a138ff841ca515dde65cbfdada9b7df79b03e8faec046927aeda207a6add826`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX8-005 Tumblemon.

**Digimon (33):** 4 × EX11-038 Sunarizamon; 3 × EX10-025 Sunarizamon; 4 × EX8-047 Sunarizamon; 3 × P-215 Icemon; 4 × P-167 Landramon; 1 × EX8-048 Landramon; 2 × EX8-050 Gogmamon; 4 × EX10-032 Proganomon; 1 × EX8-051 Proganomon; 4 × EX11-044 Pyramidimon; 3 × EX10-036 Magneticdramon.

**Tamers (7):** 2 × EX10-063 Close; 2 × EX11-065 Close; 3 × EX8-067 Close.

**Options (10):** 1 × LM-031 Black Scramble; 4 × P-107 Defense Training; 1 × P-039 Black Memory Boost!; 4 × EX10-069 Unique Emblem: Gravel Hearts.

### WMD12 — TS Gear Forest · 124579

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124579). SHA-256: `eae0854cefdf30eb9ee2073b76b4dc66933e61c8029ff183817c2f522eadfe47`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT24-004 Wanyamon.

**Digimon (42):** 4 × BT24-031 Elecmon; 4 × BT25-047 Floramon; 2 × BT25-022 Lunamon; 3 × BT9-047 Pomumon; 1 × BT24-043 Tapirmon; 4 × BT24-034 Aegiomon; 4 × BT25-055 Deramon; 4 × BT25-039 Sirenmon; 3 × BT25-077 Bacchusmon; 4 × BT26-032 Ceresmon; 4 × BT25-059 Ceresmon; 1 × BT25-028 Dianamon; 3 × BT26-033 Jupitermon; 1 × BT20-037 Chaosmon: Valdur Arm.

**Tamers (7):** 4 × BT26-090 Kanan Yuki; 1 × BT24-085 Dan Yuki & Kanan Yuki; 2 × BT24-102 Homeros.

**Options (1):** 1 × BT24-094 Central Town: Throne Room.

### WMD13 — Dinomon · 118622

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/118622). SHA-256: `a1c91656eb3b2a63aac2d3cfbd22202feed2ec2a6a72a5cb4a1e051b87437191`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX11-001 Koromon.

**Digimon (37):** 4 × EX11-007 Agumon; 3 × EX8-007 Agumon; 3 × BT22-068 Agumon (X Antibody); 4 × EX11-009 Tyrannomon; 2 × EX8-011 Tyrannomon; 2 × BT14-013 Tyrannomon; 4 × P-160 Tyrannomon (X Antibody); 3 × EX11-010 MasterTyrannomon; 2 × EX8-014 MasterTyrannomon; 3 × EX8-043 MetalTyrannomon; 3 × EX11-011 Dinomon; 3 × EX8-016 Dinomon; 1 × P-173 RustTyrannomon.

**Tamers (7):** 3 × EX8-065 Ryutaro Williams; 4 × EX11-056 Ryutaro Williams.

**Options (6):** 2 × LM-030 Green Scramble; 2 × LM-027 Red Scramble; 2 × LM-051 Alexandrite Memory Boost!.

### WMD14 — TS Angels · 124581

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124581). SHA-256: `499030e097be7d4e2f7097440878d4985404ee3530b60fc4eb13462b7ce2263b`. Principal: 50; ovos: 0.

**Ovos (0):** nenhum na fonte.

**Digimon (40):** 3 × P-198 DemiDevimon; 4 × BT24-031 Elecmon; 1 × BT14-033 Patamon; 3 × BT24-033 Salamon; 4 × BT25-034 Angemon; 1 × BT25-082 BlackGatomon; 1 × BT24-058 Blimpmon; 3 × BT25-037 Pegasusmon; 4 × BT26-022 Sorcermon; 2 × BT26-029 Aegiochusmon: Holy; 2 × BT25-040 MagnaAngemon; 4 × BT25-038 Shakkoumon; 3 × BT25-044 Junomon; 1 × BT26-033 Jupitermon; 2 × BT26-081 Mervamon; 2 × BT26-083 Junomon: Hysteric Mode.

**Tamers (3):** 3 × BT24-088 Asuna Shiroki.

**Options (7):** 1 × BT4-104 Blinding Ray; 1 × LM-062 Breathing Training; 2 × LM-029 Yellow Scramble; 3 × BT24-100 In-Between Theater.

### WMD15 — Creepymon · 124710

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124710). SHA-256: `cc050d9a7c457b64f24d5ce1b061800209823fe72370200f1f32508a5ef01411`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX10-005 Pagumon.

**Digimon (34):** 4 × BT24-068 DemiDevimon; 4 × EX10-040 DemiDevimon; 2 × P-198 DemiDevimon; 4 × EX10-046 Devimon; 4 × BT24-069 Vilemon; 4 × EX10-049 SkullSatamon; 4 × BT24-073 SkullSatamon; 4 × EX10-009 Creepymon; 4 × BT24-078 Creepymon (X Antibody).

**Tamers (1):** 1 × ST16-14 Matt Ishida.

**Options (15):** 2 × LM-032 Purple Scramble; 3 × P-108 Wisdom Training; 3 × P-040 Purple Memory Boost!; 3 × BT24-096 Seventh Graviton; 4 × P-219 Flame Inferno.

### WMD16 — DATA SQUAD Rosemon · 124520

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124520). SHA-256: `02d49876fb015690ff0cad6640453f9993e4f100705310a63683cc16912b7354`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT26-005 Pinamon.

**Digimon (37):** 4 × ST24-04 Agumon; 2 × ST24-12 Falcomon; 1 × ST24-02 Gaomon; 4 × BT26-036 Lalamon; 4 × ST24-09 Sunflowmon; 3 × BT26-039 Sunflowmon; 1 × BT26-076 Crowmon; 2 × BT25-055 Deramon; 4 × ST24-10 Lilamon; 1 × BT26-044 Lilamon; 1 × BT25-057 Monarchlizamon; 3 × BT26-049 Rosemon; 3 × ST24-11 Rosemon; 1 × BT13-060 Rosemon: Burst Mode; 3 × BT26-050 Rosemon: Burst Mode.

**Tamers (10):** 4 × BT26-094 Keenan Crier; 4 × BT26-091 Yoshino Fujieda; 2 × ST24-14 Yoshino Fujieda & Keenan Crier.

**Options (3):** 1 × P-235 Digital Accident Tactics Squad; 2 × ST24-15 DNA Charge.

### WMD17 — ADVENTURE · 124669

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124669). SHA-256: `f2f6f216c8ff19df04b27b8bff6d5db8a35b303e951edaa0e6c50cbf80515594`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × ST21-01 Tsunomon.

**Digimon (39):** 1 × ST20-10 Agumon; 4 × ST20-02 Biyomon; 1 × ST21-10 Gabumon; 4 × ST21-07 Palmon; 2 × ST21-05 Angemon; 4 × ST20-03 Birdramon; 1 × BT21-067 Garurumon; 3 × ST21-08 Togemon; 2 × ST21-09 Lillymon; 2 × ST20-09 MegaKabuterimon; 2 × BT21-061 MetalGreymon; 1 × EX9-019 WereGarurumon: Sagittarius Mode; 2 × ST21-04 Zudomon; 3 × AD1-014 MetalGarurumon; 3 × AD1-004 WarGreymon; 1 × AD1-025 Omnimon; 3 × EX13-077 Omnimon: Merciful Mode.

**Tamers (11):** 3 × AD1-022 Izzy Izumi & Tai Kamiya; 3 × AD1-019 Matt Ishida & T.K. Takaishi; 1 × BT21-102 Tai Kamiya; 4 × EX13-073 Tai Kamiya & Matt Ishida.

### WMD18 — TS Paradise Colosseum · 125094

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125094). SHA-256: `9272ec313808b57f9be1f6cdc3e1e8fa513b94190fdbb9b0c74a3970d3a045af`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT25-001 Tokomon.

**Digimon (36):** 4 × BT25-009 Bearmon; 2 × BT25-048 Bearmon; 4 × BT24-043 Tapirmon; 1 × BT25-064 ToyAgumon; 2 × BT24-034 Aegiomon; 4 × BT25-051 Grizzlymon; 2 × BT25-012 Grizzlymon; 1 × BT25-050 Kiwimon; 4 × BT25-016 GrapLeomon; 4 × BT25-054 GreatGrizzlymon; 4 × BT25-058 Callismon; 4 × BT25-020 Marsmon.

**Tamers (5):** 1 × BT24-088 Asuna Shiroki; 1 × BT24-083 Hiroko Sagisaka; 3 × BT24-085 Dan Yuki & Kanan Yuki.

**Options (9):** 1 × BT6-102 Tropical Venom; 3 × BT24-100 In-Between Theater; 1 × BT25-100 Iron Slash; 3 × BT25-095 Paradise Colosseum; 1 × BT8-097 Crimson Blaze.

### WMD19 — TS Central Town · 110438

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/110438). SHA-256: `c056697af3e2cdea0a40d7c55e79982df21f7d07d1724820678a69a87ea62e21`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT25-001 Tokomon.

**Digimon (33):** 4 × BT24-031 Elecmon; 4 × BT25-022 Lunamon; 2 × P-197 Patamon; 3 × BT24-034 Aegiomon; 2 × BT25-011 Aquilamon; 3 × BT24-046 Garurumon; 3 × BT24-035 Gatomon; 4 × BT24-037 Silphymon; 3 × BT24-051 Merukimon; 2 × BT26-081 Mervamon; 3 × BT24-041 Minervamon.

**Tamers (10):** 2 × BT24-088 Asuna Shiroki; 3 × BT24-083 Hiroko Sagisaka; 3 × BT24-085 Dan Yuki & Kanan Yuki; 2 × BT24-102 Homeros.

**Options (7):** 2 × BT24-090 Abyss Sanctuary: Throne Room; 2 × BT24-100 In-Between Theater; 2 × BT26-101 Cross Arts; 1 × BT8-097 Crimson Blaze.

### WMD20 — Galacticmon · 123986

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/123986). SHA-256: `bb2a35f90eb9f9c375116880ce1e281e2de78780a6dfa4e5bed02bdfb82f13d2`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT21-006 Tsumemon.

**Digimon (37):** 10 × BT11-061 Vemmon; 4 × BT18-060 Vemmon; 3 × BT21-056 Vemmon; 3 × BT18-065 Snatchmon; 3 × BT21-058 Snatchmon; 3 × P-094 Destromon; 3 × BT21-060 Destromon; 4 × EX11-046 Galacticmon; 3 × BT21-062 Galacticmon; 1 × BT15-102 Apocalymon.

**Tamers (6):** 4 × EX11-066 Xeno; 1 × BT18-092 Zenith; 1 × BT21-087 Zenith.

**Options (7):** 1 × BT11-105 Fusionize; 3 × P-244 Unique Emblem: Ragnarok Attainer; 3 × BT21-098 Ragnarok Cannon.

### WMD21 — Imperialdramon (UG) · 124532

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124532). SHA-256: `235b42a7372d0be5b5afaa1c974d6b79bf0f734a85a6ded9ab3d5016e5c34885`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT12-002 DemiVeemon.

**Digimon (37):** 4 × BT12-021 Veemon; 2 × P-117 Veemon; 2 × P-248 Veemon; 4 × BT12-047 Wormmon; 4 × BT12-022 ExVeemon; 1 × BT21-037 Lighdramon; 4 × BT12-050 Stingmon; 1 × ST9-09 Stingmon; 4 × BT16-025 Paildramon; 3 × AD1-011 Paildramon; 2 × ST9-06 Imperialdramon Dragon Mode; 1 × BT16-028 Imperialdramon: Dragon Mode; 3 × AD1-024 Imperialdramon: Fighter Mode; 2 × EX13-076 Imperialdramon: Paladin Mode.

**Tamers (7):** 1 × BT3-093 Davis Motomiya; 4 × BT16-085 Davis Motomiya & Ken Ichijoji; 2 × EX13-070 Davis Motomiya & Ken Ichijoji.

**Options (6):** 1 × ST2-13 Hammer Spark; 3 × LM-058 Parkour Training; 2 × BT17-097 Return to the Primogenitor.

### WMD22 — Blackwargreymon · 110135

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/110135). SHA-256: `6b4f8b876bc275a53ff6170fad318dfc011d2ed077f65b316c4d5f4ff6d25a10`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX9-005 Negamon.

**Digimon (44):** 2 × EX9-046 Soundbirdmon; 4 × EX9-047 Eyesmon; 13 × EX9-048 Eyesmon: Scatter Mode; 3 × EX10-008 MetalGreymon; 4 × EX9-054 RareRaremon; 4 × EX9-055 Abbadomon; 3 × EX10-010 BlackWarGreymon; 4 × BT25-076 Ghoulmon; 1 × EX12-019 Nezhamon; 4 × EX9-057 Abbadomon Core; 1 × BT20-102 Omnimon (X Antibody); 1 × BT5-087 Omnimon Zwart.

**Tamers (3):** 1 × EX1-066 Analog Youth; 2 × BT4-096 Izzy Izumi.

**Options (3):** 3 × P-039 Black Memory Boost!.

### WMD23 — Gallantmon · 125097

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125097). SHA-256: `62cc61fc8e9d3722a4d7acc31b9cd2287854f6f8f1fc7f5c8e7672784029fcb3`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX13-001 Gigimon.

**Digimon (38):** 4 × EX13-007 Guilmon; 4 × EX2-008 Guilmon; 3 × BT19-007 Guilmon; 4 × EX13-010 Growlmon; 3 × BT19-009 Growlmon; 2 × BT17-010 Growlmon; 4 × AD1-003 WarGrowlmon; 4 × EX13-013 WarGrowlmon; 4 × EX13-015 Gallantmon; 4 × AD1-008 Gallantmon; 2 × EX8-073 Gallantmon (X Antibody).

**Tamers (8):** 3 × BT17-080 Takato Matsuki; 3 × EX13-068 Takato Matsuki; 2 × BT12-089 Takato Matsuki.

**Options (4):** 1 × LM-059 Heat Training; 1 × P-103 Offense Training; 1 × LM-057 Wall Training; 1 × BT8-097 Crimson Blaze.

### WMD24 — UlforceVeedramon · 125070

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125070). SHA-256: `bc248132560aeeee1b42f5c024bfefcdfe155dc7243d06b504ed03cad3493a90`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX13-002 DemiVeemon.

**Digimon (33):** 4 × BT11-023 Veemon; 4 × EX13-017 Veemon; 2 × EX1-013 Veemon; 1 × ST8-04 Veemon; 4 × EX13-019 Veedramon; 4 × P-138 Veedramon; 1 × BT22-022 Veedramon; 4 × EX13-022 AeroVeedramon; 3 × BT22-023 AeroVeedramon; 4 × EX13-023 UlforceVeedramon; 2 × BT12-029 UlforceVeedramon (X Antibody).

**Tamers (9):** 4 × BT11-112 Rina Shinomiya; 4 × EX13-069 Rina Shinomiya; 1 × BT22-085 Rina Shinomiya.

**Options (8):** 1 × ST2-13 Hammer Spark; 1 × EX1-068 Ice Wall!; 2 × LM-028 Blue Scramble; 1 × LM-056 Image Training; 1 × P-104 Mental Training; 1 × LM-058 Parkour Training; 1 × LM-057 Wall Training.

### WMD25 — TyrantKabuterimon · 123537

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/123537). SHA-256: `a3f72e0af243266769d432ce7311734791d33e73e9cdbcaeb434bb4b32924a05`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT15-004 Motimon.

**Digimon (37):** 4 × BT16-037 KoKabuterimon; 2 × BT26-035 Morphomon; 4 × BT15-043 Tentomon; 2 × EX8-039 Tentomon; 2 × BT26-041 Hudiemon; 4 × BT26-038 Kuwagamon; 2 × P-100 Kuwagamon; 1 × P-140 MegaKabuterimon; 3 × BT16-045 MetallifeKuwagamon; 3 × BT26-042 Okuwamon; 1 × P-075 Okuwamon; 3 × BT26-045 GranKuwagamon; 3 × BT16-048 TyrantKabuterimon; 3 × BT26-047 TyrantKabuterimon.

**Tamers (5):** 3 × BT15-085 Izzy Izumi; 1 × BT5-089 Izzy Izumi & Mimi Tachikawa; 1 × BT1-089 Mimi Tachikawa.

**Options (8):** 1 × BT3-103 Hidden Potential Discovered!; 2 × P-106 Agility Training; 1 × LM-030 Green Scramble; 3 × LM-055 Sprint Dash Training; 1 × P-038 Green Memory Boost!.

### WMD26 — Ghosts · 122055

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/122055). SHA-256: `0ab9973276f7bdae57d48ff7afa1c2b36a5f3a73b081af6cd217c3f5c48d55e9`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT20-006 DemiMeramon.

**Digimon (38):** 2 × BT23-061 Ghostmon; 4 × BT26-062 Ghostmon; 4 × BT20-063 Ghostmon; 4 × BT21-065 Ghostmon; 4 × BT20-068 Bakemon; 1 × P-192 Bakemon; 4 × BT23-064 Bakemon; 1 × BT8-084 Kimeramon; 4 × BT20-072 Phantomon; 4 × BT23-065 Phantomon; 4 × EX11-051 Necromon; 2 × BT23-071 Dullahamon.

**Tamers (7):** 3 × BT20-088 Violet Inboots; 2 × BT23-087 Violet Inboots; 2 × EX11-068 Violet Inboots.

**Options (5):** 2 × LM-032 Purple Scramble; 2 × BT23-098 Unique Emblem: Soul Banquet; 1 × BT20-098 Apparition Legion.

### WMD27 — Wind Guardians · 121794

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/121794). SHA-256: `a5edaf5ecdd75b8411dc0af79a9bf6dc223c00cc4a744b0d2108f900075c361f`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT21-003 Yokomon.

**Digimon (40):** 4 × BT21-033 Floramon; 2 × BT21-048 Mushroomon; 1 × EX9-036 Pomumon; 4 × BT26-024 Tinkermon; 4 × BT21-034 Kiwimon; 4 × BT26-027 Petermon; 2 × BT21-049 Woodmon; 1 × BT21-050 Cherrymon; 3 × BT21-038 Deramon; 4 × EX9-042 Toropiamon; 4 × BT21-039 Gryphonmon; 2 × EX9-044 Hydramon; 2 × BT21-051 Puppetmon; 3 × EX9-045 Cernumon.

**Tamers (2):** 2 × EX11-062 Shoto Kazama.

**Options (8):** 4 × BT21-095 Wind Guardians; 4 × EX12-073 Giant Meat.

### WMD28 — Gigaseadramon · 94484

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/94484). SHA-256: `68c2638fdecea7b60221998bb52ec22cc12d4ff0e6fa0ac48483273f8975deaf`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX8-002 Bukamon.

**Digimon (36):** 2 × EX8-017 Crabmon; 4 × EX8-018 Gomamon; 4 × EX12-023 Jellymon; 2 × P-162 Coelamon; 2 × EX8-020 Dolphmon; 1 × EX8-021 Seadramon; 4 × EX12-027 TeslaJellymon; 3 × EX12-028 Gusokumon; 2 × EX8-024 MegaSeadramon; 3 × EX12-030 Thetismon; 3 × EX12-033 Amphimon; 1 × EX8-026 MetalSeadramon; 3 × EX8-027 Plesiomon; 2 × EX8-029 Aegisdramon.

**Tamers (3):** 3 × EX12-067 Kiyoshiro Higashimitarai.

**Options (11):** 1 × EX1-068 Ice Wall!; 1 × LM-028 Blue Scramble; 3 × EX8-068 Deep Savers; 3 × P-104 Mental Training; 3 × EX12-073 Giant Meat.

### WMD29 — Aquatic (Ariemon) · 116221

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/116221). SHA-256: `cdcb332483a9ce084adb7be66215b90a819cddd1ef6aeed37776edd3ca6ce244`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT22-001 Puyoyomon.

**Digimon (39):** 4 × BT19-017 Sangomon; 1 × BT22-018 Sangomon; 2 × BT21-031 Sangomon; 2 × EX11-013 Sangomon; 2 × BT26-018 Sangomon; 2 × BT24-023 Calmaramon; 3 × BT18-023 Lanamon; 2 × BT22-021 Shellmon; 2 × BT19-019 Shellmon; 1 × EX6-013 Xiquemon; 1 × BT19-023 Huankunmon; 4 × BT19-024 MarineBullmon; 2 × EX8-024 MegaSeadramon; 2 × BT24-059 Sharkmon; 2 × BT24-030 Neptunemon; 2 × EX11-018 Ryugumon; 2 × EX12-036 Ryugumon; 3 × BT22-028 Ariemon.

**Tamers (4):** 3 × EX11-058 Yao Qinglan; 1 × BT19-082 Yao Qinglan.

**Options (7):** 1 × LM-028 Blue Scramble; 1 × LM-056 Image Training; 1 × LM-058 Parkour Training; 2 × LM-057 Wall Training; 2 × P-036 Blue Memory Boost!.

### WMD30 — Devas · 104770

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/104770). SHA-256: `91a81e3023f3a6a9c896392bb5b9859afdc65d49b3d03286ee0cdf3783dd5cf5`. Principal: 50; ovos: 1.

**Ovos (1):** 1 × EX2-007 Mother D-Reaper.

**Digimon (39):** 3 × EX4-029 Antylamon; 3 × EX5-051 Caturamon; 3 × EX5-009 Indramon; 2 × EX5-040 Kumbhiramon; 2 × EX5-021 Majiramon; 2 × EX5-052 Makuramon; 2 × EX5-022 Mihiramon; 2 × EX5-011 Pajiramon; 2 × EX5-010 Sandiramon; 2 × EX5-050 Sinduramon; 2 × EX5-037 Vajramon; 2 × EX5-038 Vikaralamon; 2 × EX5-024 Azulongmon; 2 × EX5-053 Baihumon; 2 × EX5-041 Ebonwumon; 2 × EX5-013 Zhuqiaomon; 4 × EX5-074 Fanglongmon.

**Tamers (3):** 1 × EX1-066 Analog Youth; 2 × BT8-094 Digimon Emperor.

**Options (8):** 4 × EX5-071 Loyalty Deeper than the Sea; 4 × EX5-072 Holy Beasts Great Cardinal Positions.

### WMD31 — Beelzemon · 124159

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124159). SHA-256: `68ce3a20fb236d1e895fdad6ad6342c4c9f75cb4d1572f5eaaf609d6af623296`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × ST14-01 Yaamon.

**Digimon (33):** 3 × EX10-037 Impmon; 2 × ST14-02 Impmon; 2 × EX11-047 Impmon; 1 × BT19-067 Impmon; 1 × EX2-039 Impmon; 1 × BT6-068 Impmon; 1 × BT12-073 Impmon (X Antibody); 4 × P-077 Wizardmon; 4 × BT12-078 Wizardmon (X Antibody); 2 × EX10-050 Baalmon; 3 × ST14-07 Baalmon; 1 × BT10-081 Baalmon; 2 × EX2-044 Beelzemon; 2 × EX6-056 Beelzemon; 1 × EX10-074 Beelzemon; 2 × BT12-085 Beelzemon (X Antibody); 1 × ST14-10 Beelzemon: Blast Mode.

**Tamers (5):** 3 × ST14-11 Ai & Mako; 1 × BT19-088 Ai & Mako; 1 × EX2-065 Ai & Mako.

**Options (12):** 1 × EX5-070 X Antibody Proto Form; 1 × BT7-107 Calling From the Darkness; 1 × LM-062 Breathing Training; 1 × LM-056 Image Training; 1 × LM-032 Purple Scramble; 1 × LM-060 Shadow Training; 3 × EX2-071 Death Slinger; 2 × ST14-12 Rivals' Barrage; 1 × BT12-110 Seventh Full Cluster.

### WMD32 — Lucemon · 124134

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124134). SHA-256: `a5dd0de01ab1a46ccafc163aedabf9023be8a4a6d7e13b76e63bb2ce40aa9884`. Principal: 50; ovos: 5.

**Ovos (5):** 4 × EX10-004 Cupimon; 1 × BT16-006 Cupimon.

**Digimon (37):** 4 × EX6-018 Lucemon; 4 × EX10-013 Lucemon; 1 × BT4-115 Lucemon; 2 × BT18-034 Lucemon; 1 × BT16-082 Ukkomon; 4 × EX6-054 Lucemon: Chaos Mode; 3 × BT18-082 Lucemon: Chaos Mode; 2 × EX10-052 Lucemon: Chaos Mode; 2 × EX6-056 Beelzemon; 2 × EX6-035 Cherubimon; 2 × EX5-063 Leviamon; 1 × BT19-043 Lucemon (X Antibody); 4 × BT18-086 Lucemon: Larva; 3 × EX10-060 Lucemon: Satan Mode; 2 × BT18-101 Lucemon: Satan Mode.

**Tamers (4):** 1 × BT8-094 Digimon Emperor; 3 × EX11-067 Dokuson Aruba.

**Options (9):** 1 × BT7-107 Calling From the Darkness; 2 × EX10-071 Paradise Lost; 2 × BT18-100 Gospel of the Fallen Angel; 1 × ST14-12 Rivals' Barrage; 2 × EX5-069 Biting Crush; 1 × BT7-109 Dead or Alive.

### WMD33 — Belphemon · 101955

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/101955). SHA-256: `43006c3ef671d79f389adf3d2ce979fe3150c57a041649d18e9f72bfe6a6b0ea`. Principal: 50; ovos: 5.

**Ovos (5):** 1 × BT16-006 Cupimon; 4 × BT3-006 DemiMeramon.

**Digimon (38):** 3 × P-201 Phascomon; 4 × BT13-080 ProtoGizmon; 2 × BT16-082 Ukkomon; 1 × P-123 Ukkomon; 4 × BT13-083 Gizmon: AT; 1 × BT20-069 Punkmon; 1 × EX6-048 Witchmon; 4 × BT13-084 Astamon; 3 × BT13-086 Gizmon: XT; 3 × BT23-070 Belphemon (X Antibody); 2 × BT13-091 Belphemon: Rage Mode; 4 × EX10-022 Belphemon: Rage Mode; 3 × BT13-088 Belphemon: Sleep Mode; 2 × EX10-021 Belphemon: Sleep Mode; 1 × P-186 Gallantmon.

**Tamers (6):** 1 × EX1-066 Analog Youth; 3 × BT13-103 Akihiro Kurata; 2 × EX10-066 Akihiro Kurata.

**Options (6):** 1 × BT7-107 Calling From the Darkness; 2 × P-108 Wisdom Training; 1 × P-206 Digital Gate Open; 2 × BT23-097 Seventh Penetration.

### WMD34 — Dynasmon · 125087

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125087). SHA-256: `b424b3a9d2f89d15cc3b503fc8239b2405caa105c962af1be5361ac4449c3561`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX13-004 DemiMeramon.

**Digimon (35):** 4 × EX13-025 Candlemon; 4 × BT18-030 Candlemon; 3 × BT25-030 Elecmon; 2 × EX13-029 FlameWizardmon; 4 × BT18-036 Wizardmon; 2 × EX10-041 Wizardmon; 3 × BT19-036 Wizardmon (X Antibody); 4 × EX13-033 Mistymon; 3 × EX13-034 Wisemon; 4 × EX13-037 Dynasmon; 2 × BT19-042 Dynasmon (X Antibody).

**Tamers (2):** 2 × BT1-087 T.K. Takaishi.

**Options (13):** 1 × LM-062 Breathing Training; 1 × LM-059 Heat Training; 2 × P-105 Physical Training; 1 × LM-054 Treadmill Training; 2 × LM-029 Yellow Scramble; 2 × P-037 Yellow Memory Boost!; 4 × BT13-106 Odin's Breath.

### WMD35 — LordKnightmon · 125088

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125088). SHA-256: `dbdbcacab9f8af02c30e9e0346ef394e505a5aaa7e668e01a0bf14c10a2c6a55`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × P-157 Monimon.

**Digimon (36):** 4 × EX13-048 Kotemon; 3 × BT18-058 Kotemon; 4 × BT19-055 Monitamon; 3 × EX10-027 DeadlyAxemon; 3 × EX13-052 Gladimon; 2 × P-154 Maildramon; 2 × BT7-058 SkullKnightmon; 2 × EX10-026 SkullKnightmon; 2 × EX10-031 DarkKnightmon; 4 × EX13-058 Knightmon; 3 × EX13-064 LordKnightmon; 2 × AD1-018 LordKnightmon; 2 × BT22-067 LordKnightmon.

**Tamers (6):** 2 × BT22-090 Rie Kishibe; 4 × EX13-074 Rie Kishibe.

**Options (8):** 2 × BT21-099 Xros Up; 2 × P-107 Defense Training; 2 × BT9-103 Kongou; 2 × BT18-099 Fist of Athena.

### WMD36 — Leopardmon · 118480

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/118480). SHA-256: `9ea7f0c055ba0a85a0965fb8194f117674751f7b221b1947c829ef8db08e29d0`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX2-004 Gummymon.

**Digimon (40):** 4 × EX13-038 Salamon; 4 × BT13-048 Salamon; 4 × BT24-043 Tapirmon; 2 × EX12-042 Gatomon; 4 × EX13-040 Mikemon; 4 × BT16-043 Runnermon; 4 × EX13-042 Bastemon; 2 × P-093 Bastemon; 2 × BT11-054 Panjyamon; 2 × EX12-052 Diarbbitmon; 4 × EX13-043 Leopardmon; 2 × BT13-056 Leopardmon; 1 × EX5-043 Leopardmon (X Antibody); 1 × BT13-058 Leopardmon: Leopard Mode.

**Tamers (4):** 2 × RB1-034 Ruli Tsukiyono; 2 × BT9-088 Mimi Tachikawa & Joe Kido.

**Options (6):** 4 × P-106 Agility Training; 2 × LM-030 Green Scramble.

### WMD37 — Craniamon · 124537

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124537). SHA-256: `06dc5fb2bfef42e621d16c81c1687969a83603ac16d3c468360afd0cc282d913`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT16-005 Dorimon.

**Digimon (38):** 1 × ST13-08 Chikurimon; 4 × EX13-047 Gotsumon; 3 × P-144 Gotsumon (X Antibody); 4 × BT25-062 Kokuwamon; 2 × BT24-010 Greymon; 4 × BT25-051 Grizzlymon; 4 × BT25-066 Guardromon; 4 × BT25-054 GreatGrizzlymon; 4 × BT24-062 MasterBlimpmon; 4 × BT25-058 Callismon; 4 × EX13-062 Craniamon.

**Tamers (3):** 3 × ST15-14 Tai Kamiya.

**Options (9):** 1 × BT12-107 Laplace's Demon; 1 × LM-031 Black Scramble; 3 × P-107 Defense Training; 1 × LM-061 Punching Training; 3 × P-039 Black Memory Boost!.

### WMD38 — DATA SQUAD Kentaurosmon · 124539

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124539). SHA-256: `28c3f39471e69d09841ebe9d9dfb430ca050123ef38b88c40d02c744c2a2b574`. Principal: 50; ovos: 5.

**Ovos (5):** 3 × ST24-01 Koromon; 2 × EX13-003 Kyaromon.

**Digimon (38):** 4 × BT25-021 Gaomon; 2 × ST24-02 Gaomon; 4 × EX13-026 Kudamon; 2 × ST24-08 Lalamon; 2 × ST24-03 Gaogamon; 4 × BT25-023 Gaogamon; 4 × EX13-030 Reppamon; 4 × EX13-032 Chirinmon; 4 × BT25-027 MachGaogamon; 4 × EX13-036 Kentaurosmon; 2 × BT25-029 MirageGaogamon; 2 × BT26-050 Rosemon: Burst Mode.

**Tamers (8):** 2 × ST24-13 Marcus Damon & Thomas H. Norstein; 3 × EX13-071 Richard Sampson; 3 × BT25-087 Thomas H. Norstein.

**Options (4):** 4 × ST24-15 DNA Charge.

### WMD39 — Kentaurosmon · 115183

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/115183). SHA-256: `e227bde3050550d6bf8246668ad3afe4f1411c0f7e04e93e350ec84856ab612f`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX13-003 Kyaromon.

**Digimon (36):** 3 × BT25-030 Elecmon; 4 × BT13-034 Kudamon; 4 × EX13-026 Kudamon; 1 × BT14-033 Patamon; 2 × BT15-037 Gatomon; 4 × BT22-034 Reppamon; 4 × EX13-030 Reppamon; 4 × EX5-031 Chirinmon; 4 × EX13-032 Chirinmon; 4 × EX13-036 Kentaurosmon; 2 × BT22-041 Kentaurosmon.

**Tamers (5):** 1 × BT15-084 Kari Kamiya; 4 × EX13-071 Richard Sampson.

**Options (9):** 2 × LM-029 Yellow Scramble; 2 × P-037 Yellow Memory Boost!; 2 × BT15-092 Revelation of Light; 3 × BT13-106 Odin's Breath.

### WMD40 — Bagra Army · 102478

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/102478). SHA-256: `087cd123333463cff9a58c298a76c5ca90e976356a466b5dbac8022052d8ecaa`. Principal: 50; ovos: 5.

**Ovos (5):** 1 × BT12-006 Monimon; 4 × BT26-006 Monimon.

**Digimon (42):** 1 × BT11-077 Chikurimon; 4 × EX10-039 ChuuChuumon; 4 × BT10-073 ChuuChuumon; 3 × EX10-015 Psychemon; 4 × EX10-044 Damemon; 3 × P-115 SkullKnightmon; 4 × EX10-045 Tuwarmon; 4 × EX10-031 DarkKnightmon; 4 × BT11-071 MusouKnightmon; 3 × EX10-056 Bagramon; 2 × EX10-034 Blastmon; 1 × EX10-058 Lilithmon; 3 × EX10-055 Tactimon; 2 × EX10-059 DarknessBagramon.

**Tamers (8):** 4 × BT10-093 Yuu Amano; 1 × EX10-067 Ryoma Mogami; 3 × EX10-064 Yuu Amano & Nene Amano.

### WMD41 — Xros Heart · 121569

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/121569). SHA-256: `f82e9a01b803f2bcc9cd4c1487f466135cc51121097bbac7ea29ac94a0e07ea7`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT19-001 Pickmons.

**Digimon (36):** 4 × BT19-008 Shoutmon; 3 × BT19-061 RaptorSparrowmon; 2 × BT19-035 ShootingStarmon; 3 × BT19-051 AtlurBallistamon; 3 × BT19-038 JaegerDorulumon; 4 × BT19-076 Luminamon; 2 × BT19-102 Luminamon (Nene Version); 4 × BT21-021 OmniShoutmon; 2 × BT19-014 Shoutmon EX6; 4 × AD1-006 Shoutmon X7; 3 × AD1-013 ZeigGreymon; 1 × BT12-112 Shoutmon X7: Superior Mode; 1 × BT21-030 Shoutmon X7: Superior Mode.

**Tamers (13):** 4 × P-224 Kotone Amano; 4 × BT10-087 Taiki Kudo; 4 × BT21-083 Taiki Kudo; 1 × BT11-095 Taiki, Kiriha, & Nene.

**Options (1):** 1 × BT19-090 Meteor Rock Soul.

### WMD42 — ACCEL · 117028

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/117028). SHA-256: `66273b0de2892030e864deeed2c5c766dcee4b07299a3f852309f3c69f8f5c1f`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT20-004 Pinamon.

**Digimon (44):** 4 × BT25-063 Commandramon; 3 × BT20-038 Falcomon; 4 × BT20-030 Liollmon; 2 × BT20-039 Diatrymon; 4 × BT20-031 Liamon; 4 × BT25-067 Sealsdramon; 4 × BT20-033 LoaderLeomon; 4 × BT25-074 Tankdramon; 4 × BT20-036 BanchoLeomon; 2 × LM-043 Darkdramon; 3 × BT20-043 Varodurumon; 2 × P-221 Chaosmon; 4 × BT20-037 Chaosmon: Valdur Arm.

**Tamers (2):** 2 × BT20-092 Battle NPC.

**Options (4):** 4 × BT20-099 Singularity of Chaos.

### WMD43 — Millenniummon · 124534

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124534). SHA-256: `7b034df5346750810d544455decbc6c402b11053dd7e74a284b470436904a893`. Principal: 50; ovos: 5.

**Ovos (5):** 4 × ST6-01 Pagumon; 1 × BT19-006 Pagumon.

**Digimon (35):** 4 × BT19-066 Gizamon; 4 × BT16-082 Ukkomon; 1 × P-123 Ukkomon; 2 × BT18-013 Deltamon; 2 × BT19-069 Deltamon; 2 × BT18-015 Kimeramon; 3 × BT19-070 Kimeramon; 3 × BT18-073 Machinedramon; 2 × BT19-065 Machinedramon; 4 × P-220 Millenniummon; 3 × BT18-019 Millenniummon; 3 × BT19-075 MoonMillenniummon; 2 × BT19-101 ZeedMillenniummon.

**Tamers (6):** 1 × EX1-066 Analog Youth; 3 × EX11-055 Chitose Horaiji; 2 × ST16-14 Matt Ishida.

**Options (9):** 4 × P-205 Insane Synthetic Monster; 4 × P-193 The Wicked God Emerges!; 1 × BT19-099 The Wicked God Descends!.

### WMD44 — Abbadomon · 124304

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124304). SHA-256: `81d95bc99c4aceb3fac7452e44d11ddc13060f95cdc7cad1e8a91b720fad9131`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX9-005 Negamon.

**Digimon (40):** 4 × EX9-046 Soundbirdmon; 4 × EX9-047 Eyesmon; 13 × EX9-048 Eyesmon: Scatter Mode; 2 × BT25-054 GreatGrizzlymon; 4 × EX9-054 RareRaremon; 4 × EX9-055 Abbadomon; 2 × BT25-058 Callismon; 4 × BT25-076 Ghoulmon; 3 × EX9-057 Abbadomon Core.

**Tamers (4):** 1 × EX1-066 Analog Youth; 2 × P-211 Monica Simmons; 1 × ST15-14 Tai Kamiya.

**Options (6):** 1 × BT6-104 Parabolic Junk; 1 × P-107 Defense Training; 2 × LM-061 Punching Training; 1 × LM-054 Treadmill Training; 1 × BT25-100 Iron Slash.

### WMD45 — Gammamon · 124075

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124075). SHA-256: `ce2c275dd7540b3518ab2ef7599206746e33cbc4b8be40b9a41ac86620c3bd8e`. Principal: 50; ovos: 5.

**Ovos (5):** 4 × BT21-002 Gurimon; 1 × RB1-001 Gurimon.

**Digimon (41):** 1 × BT21-010 Gammamon; 3 × LM-016 Gammamon; 4 × EX12-007 Gammamon; 4 × RB1-005 Gammamon; 2 × EX12-013 BetelGammamon; 1 × BT21-019 BetelGammamon; 3 × BT21-069 GulusGammamon; 2 × EX10-042 GulusGammamon; 3 × RB1-029 GulusGammamon; 2 × BT15-039 Bombermon; 2 × EX12-014 Canoweissmon; 1 × BT21-022 Canoweissmon; 1 × EX10-053 Regulusmon; 2 × RB1-030 Regulusmon; 4 × P-240 Arcturusmon; 2 × AD1-007 Siriusmon; 2 × EX12-018 Siriusmon; 2 × EX12-077 Proximamon.

**Tamers (5):** 2 × BT21-080 Hiro Amanokawa; 3 × EX12-066 Hiro Amanokawa.

**Options (4):** 4 × BT21-090 The Strongest of Brothers.

### WMD46 — Diaboromon · 116456

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/116456). SHA-256: `8a32d1469c087cce0b9d5c601bd518857055708363df9ed3158a41f7208d3be2`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT2-006 Tsumemon.

**Digimon (40):** 4 × BT22-053 Keramon; 2 × BT2-053 Keramon; 3 × EX6-036 Keramon; 4 × BT24-052 Keramon (X Antibody); 4 × BT22-057 Kurisarimon; 3 × BT2-059 Kurisarimon; 3 × EX6-039 Kurisarimon; 4 × EX6-041 Infermon; 2 × BT17-055 Infermon; 2 × BT22-059 Infermon; 3 × EX6-043 Diaboromon; 2 × BT22-064 Diaboromon; 2 × BT24-065 Diaboromon (X Antibody); 1 × BT17-060 Armageddemon; 1 × BT5-085 Armageddemon.

**Tamers (6):** 4 × BT5-090 Arata Sanada; 2 × BT22-091 Arata Sanada.

**Options (4):** 1 × LM-031 Black Scramble; 1 × P-107 Defense Training; 2 × BT9-103 Kongou.

### WMD47 — Chronicle · 124767

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124767). SHA-256: `ef41961e8f350ea8d9ff22225f0f5437285ae81d03a2a1360379da4316c0b7c9`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × P-176 Dorimon.

**Digimon (36):** 4 × BT20-048 Dorumon; 4 × EX13-049 Dorumon; 2 × BT20-010 Ryudamon; 1 × BT20-012 Ginryumon; 4 × BT20-051 Raptordramon; 4 × EX13-055 Raptordramon; 4 × EX13-057 Grademon; 2 × BT20-053 Grademon; 2 × BT20-015 Hisyaryumon; 4 × EX13-060 Alphamon; 1 × BT20-056 Alphamon; 2 × BT20-018 Ouryumon; 2 × BT20-060 Alphamon: Ouryuken.

**Tamers (6):** 4 × EX13-072 Kota Domoto; 2 × BT20-087 Kota Domoto & Yuji Musya.

**Options (8):** 2 × EX5-070 X Antibody Proto Form; 2 × BT20-095 Fellowship of Hope's Keepers; 4 × P-204 Release of the Sealed Knight!.

### WMD48 — Alphamon (Tribal) · 87264

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/87264). SHA-256: `f67d841c2186b9117807067343fbf931362ff202907a6b8e35b6e4433d77d897`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT7-005 Dorimon.

**Digimon (39):** 1 × BT13-063 Dorumon; 4 × BT7-056 Dorumon; 2 × BT8-060 Ryudamon; 3 × P-033 Sunarizamon; 1 × BT17-065 DexDorugamon; 4 × BT9-075 DexDorugamon; 2 × BT13-066 Dorugamon; 2 × BT7-062 Dorugamon; 3 × BT9-078 DexDoruGreymon; 3 × BT13-072 DoruGreymon; 1 × BT7-064 DoruGreymon; 2 × BT13-075 Alphamon; 1 × BT20-056 Alphamon; 1 × BT22-063 Alphamon; 1 × BT6-111 Alphamon; 3 × BT8-069 Ouryumon; 1 × BT20-060 Alphamon: Ouryuken; 3 × BT9-111 Alphamon: Ouryuken; 1 × BT9-112 DeathXmon.

**Tamers (5):** 3 × BT9-092 Cool Boy; 2 × BT8-092 Yuji Musya.

**Options (6):** 2 × EX5-070 X Antibody Proto Form; 1 × LM-031 Black Scramble; 2 × P-107 Defense Training; 1 × BT7-104 Metal Cannon.

### WMD49 — Eaters · 87143

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/87143). SHA-256: `fefbfb4698980375181a8a01ddc964f6e0e517c98d2474d0e28875355c4d69f0`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT22-007 Mother Eater.

**Digimon (36):** 4 × BT22-080 Eater (Human Form); 12 × BT22-079 Eater (Species Form); 2 × BT22-082 Eater Adam; 4 × BT23-073 Eater Bit; 3 × BT23-075 Eater EDEN; 2 × BT22-081 Eater Eve; 4 × BT23-074 Eater Legion; 2 × BT23-072 King Drasil_7D6; 2 × BT23-025 MarineAngemon; 1 × BT9-112 DeathXmon.

**Tamers (10):** 3 × BT22-089 Mirei Mikagura; 4 × BT22-095 Akemi Suedou; 1 × BT22-091 Arata Sanada; 1 × BT23-084 Erika Mishima; 1 × BT22-083 Yuuko Kamishiro.

**Options (4):** 2 × BT22-100 Cyberspace EDEN; 2 × BT23-100 Hudie Net Café.

### WMD50 — TS Plutomon · 124601

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124601). SHA-256: `ca111f16304df8b608060357055d2556e5d0ec6d68b1044305e2484aec37472c`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT24-007 Tsunomon.

**Digimon (42):** 3 × BT24-042 Goblimon; 2 × BT26-066 Salamon; 2 × BT24-009 Shamanmon; 4 × BT24-021 SnowGoblimon; 1 × BT24-023 Calmaramon; 1 × BT26-069 Dobermon; 1 × BT24-013 Fugamon; 1 × BT26-021 Gekomon; 1 × BT24-010 Greymon; 2 × BT24-026 Hyogamon; 2 × BT24-045 Ogremon; 1 × BT25-080 Witchmon; 4 × BT26-074 Cerberusmon; 2 × BT26-056 Cerberusmon: Werewolf Mode; 2 × BT24-075 SkullBaluchimon; 1 × BT26-078 Cherubimon; 1 × BT26-045 GranKuwagamon; 1 × BT26-033 Jupitermon; 3 × BT26-059 Plutomon; 2 × BT25-084 Titamon; 1 × BT26-047 TyrantKabuterimon; 2 × BT26-079 ZombiePlutomon; 1 × BT26-060 Chronomon: Destroy Mode; 1 × BT24-081 Titamon + SkullBaluchimon.

**Tamers (4):** 2 × BT24-088 Asuna Shiroki; 1 × BT26-092 Shota Kuroi; 1 × BT25-092 Asuna Shiroki.

**Options (4):** 2 × BT26-100 Dark Field; 2 × BT24-098 Invasion of the Titans.

### WMD51 — MaloMyotismon · 118400

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/118400). SHA-256: `38314ef3989a72b0da84c89c9e4ba321d2c8c1460373080f4a6731a639ae713b`. Principal: 50; ovos: 5.

**Ovos (5):** 4 × BT15-006 DemiMeramon; 1 × BT3-006 DemiMeramon.

**Digimon (35):** 3 × P-239 DemiDevimon; 2 × ST14-04 Phascomon; 4 × BT16-082 Ukkomon; 3 × BT16-072 Arukenimon; 1 × EX10-047 Arukenimon; 4 × BT16-073 Mummymon; 2 × EX10-051 Mummymon; 4 × EX10-048 Myotismon; 4 × P-145 Myotismon (X Antibody); 1 × BT10-080 SkullBaluchimon; 3 × BT16-081 MaloMyotismon; 4 × EX10-011 MaloMyotismon.

**Tamers (9):** 1 × EX1-066 Analog Youth; 1 × BT8-093 Yukio Oikawa; 4 × BT16-089 Arukenimon & Mummymon; 3 × EX10-065 Yukio Oikawa.

**Options (6):** 1 × BT4-111 Jack Raid; 1 × BT7-107 Calling From the Darkness; 4 × P-206 Digital Gate Open.

### WMD52 — Mastemon (Tribal) · 115914

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/115914). SHA-256: `b04ff8a9edfca2085a616b66de5018b1a966ff3ec25efc00f5e0af01b0a41039`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × ST10-01 Nyaromon.

**Digimon (35):** 1 × BT14-033 Patamon; 3 × EX1-024 Patamon; 4 × EX12-040 Salamon; 4 × BT16-030 Salamon; 2 × EX12-042 Gatomon; 3 × ST10-04 Gatomon; 2 × EX6-020 Gatomon; 2 × EX12-044 Angewomon; 3 × BT23-031 Angewomon; 2 × EX6-053 LadyDevimon; 2 × BT11-083 LadyDevimon; 3 × BT23-102 Mastemon; 2 × P-187 Mastemon; 1 × EX6-029 Mastemon; 1 × BT9-112 DeathXmon.

**Tamers (9):** 3 × BT22-089 Mirei Mikagura; 3 × EX6-074 Mirei Mikagura; 3 × BT11-094 Mirei Mikagura.

**Options (6):** 2 × LM-062 Breathing Training; 3 × LM-035 Amber Memory Boost!; 1 × ST10-14 Chaos Degradation.

### WMD53 — CS Mastemon · 87263

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/87263). SHA-256: `a924f154e72fc40381ee19ac259f91da390774c7d5eb57fb3f25cb0b7b9d1657`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT22-004 Wanyamon.

**Digimon (35):** 3 × BT22-054 Hagurumon; 4 × BT22-044 Palmon; 4 × BT22-043 Terriermon; 4 × BT23-027 Angemon; 1 × BT22-046 Gargomon; 4 × BT22-031 GoldNumemon; 1 × BT22-056 Guardromon; 4 × BT23-031 Angewomon; 4 × BT23-067 LadyDevimon; 3 × BT22-063 Alphamon; 3 × BT23-102 Mastemon.

**Tamers (11):** 4 × BT22-089 Mirei Mikagura; 2 × BT22-093 Ami Aiba; 1 × BT23-089 Takumi Aiba; 2 × BT22-101 Kyoko Kuremi; 2 × BT11-094 Mirei Mikagura.

**Options (4):** 1 × P-225 DigiLab; 3 × BT22-099 Kuremi Detective Agency.

### WMD54 — Red Hybrid · 125099

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125099). SHA-256: `84fa41f3a3cb9e4e1edd0db6af572c9f80cf594539f31e068170876d45728820`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT14-001 Koromon.

**Digimon (36):** 3 × BT17-009 Flamemon; 2 × BT6-022 Strabimon; 2 × P-249 Strabimon (Official Store Tournament 2026 Vol. 4 Participant); 4 × BT16-082 Ukkomon; 4 × BT21-013 Agunimon; 3 × BT18-011 Agunimon; 2 × BT17-012 BurningGreymon; 3 × BT18-048 Kazemon; 1 × BT18-022 Kumamon; 1 × BT18-049 Zephyrmon; 4 × AD1-002 Aldamon; 2 × BT7-014 Aldamon; 1 × BT17-014 Aldamon; 2 × EX11-012 Medusamon; 2 × EX12-019 Nezhamon.

**Tamers (9):** 4 × BT21-082 Takuya Kanbara; 1 × BT12-088 Takuya Kanbara; 4 × AD1-020 Tommy, Takuya, & Zoe.

**Options (5):** 3 × BT4-098 Atomic Inferno; 2 × BT8-097 Crimson Blaze.

### WMD55 — Susanoomon Hybrid · 73242

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/73242). SHA-256: `121e15ef08aa1b966716b24d88cb86e0893e7ed67a8dc80e43bc4971a018ecc0`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX12-004 Onibimon.

**Digimon (36):** 4 × BT17-009 Flamemon; 1 × EX12-006 Kakamon; 1 × EX12-022 Kamemon; 1 × BT6-022 Strabimon; 4 × BT16-082 Ukkomon; 1 × EX12-009 Wankomon; 2 × BT18-011 Agunimon; 1 × BT7-046 Beetlemon; 1 × BT17-012 BurningGreymon; 1 × BT18-048 Kazemon; 1 × BT17-023 KendoGarurumon; 1 × BT18-025 Korikakumon; 1 × BT18-022 Kumamon; 1 × BT18-037 Lobomon; 1 × BT18-076 Loweemon; 1 × BT18-067 MetalKabuterimon; 1 × BT18-049 Zephyrmon; 4 × AD1-002 Aldamon; 1 × BT17-026 Beowolfmon; 1 × EX12-056 Cho-Hakkaimon; 1 × P-185 EmperorGreymon; 1 × BT18-042 MagnaGarurumon; 4 × EX12-076 Susanoomon.

**Tamers (10):** 4 × EX1-066 Analog Youth; 1 × BT18-089 Tommy Himi; 2 × BT18-090 Zoe Orimoto; 1 × BT18-088 Takuya Kanbara & Koji Minamoto; 2 × AD1-020 Tommy, Takuya, & Zoe.

**Options (4):** 1 × BT7-107 Calling From the Darkness; 1 × BT17-094 Ancient Guardian Deity; 1 × EX12-075 Kunlun's Imperial Decree; 1 × EX4-065 Trident Gaia.

### WMD56 — Sakuyamon · 111675

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/111675). SHA-256: `59a622055a83bb60dd73948a8b5686721f9ca99fb828c5943516f04612f44095`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × ST22-01 Viximon.

**Digimon (30):** 4 × BT17-031 Renamon; 4 × EX2-019 Renamon; 1 × ST22-02 Renamon; 4 × ST22-03 Kyubimon; 4 × BT19-034 Kyubimon; 2 × BT17-035 Taomon; 4 × ST22-04 Taomon; 4 × EX2-024 Sakuyamon; 3 × EX8-037 Sakuyamon (X Antibody).

**Tamers (5):** 4 × BT19-083 Rika Nonaka; 1 × EX2-060 Rika Nonaka.

**Options (15):** 3 × EX2-066 Offensive Plug-In A; 4 × P-105 Physical Training; 1 × LM-029 Yellow Scramble; 3 × ST22-09 High-Speed Plug-In H; 2 × P-037 Yellow Memory Boost!; 2 × ST22-10 Amethyst Mandala.

### WMD57 — DATA SQUAD ShineGreymon · 124035

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124035). SHA-256: `488d7c7d3c5de5906eba93e9a4fd1e79f212094e3f8120e5875f829c2f7cc879`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × ST24-01 Koromon.

**Digimon (37):** 4 × ST24-04 Agumon; 3 × ST24-12 Falcomon; 3 × ST24-02 Gaomon; 2 × ST24-03 Gaogamon; 2 × ST24-05 GeoGreymon; 4 × BT26-072 Peckmon; 2 × ST24-09 Sunflowmon; 3 × ST24-10 Lilamon; 4 × ST24-06 RizeGreymon; 1 × BT26-082 Ravemon; 1 × ST24-11 Rosemon; 3 × BT2-041 ShineGreymon; 2 × AD1-016 ShineGreymon; 1 × BT13-060 Rosemon: Burst Mode; 2 × BT13-020 ShineGreymon: Burst Mode.

**Tamers (8):** 4 × ST24-13 Marcus Damon & Thomas H. Norstein; 1 × BT25-087 Thomas H. Norstein; 2 × ST24-14 Yoshino Fujieda & Keenan Crier; 1 × AD1-021 Marcus Damon & Agumon.

**Options (5):** 1 × P-235 Digital Accident Tactics Squad; 3 × ST24-15 DNA Charge; 1 × P-206 Digital Gate Open.

### WMD58 — DATA SQUAD Ravemon · 125102

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125102). SHA-256: `b03cfe7f1779bcae3f3a42485419ac0f9b96575fad06bc69943c350bb2d00368`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT26-005 Pinamon.

**Digimon (36):** 4 × ST24-04 Agumon; 2 × ST24-12 Falcomon; 4 × EX13-026 Kudamon; 2 × ST24-05 GeoGreymon; 4 × BT26-072 Peckmon; 3 × ST24-09 Sunflowmon; 4 × BT26-076 Crowmon; 3 × ST24-10 Lilamon; 4 × BT26-082 Ravemon; 2 × BT26-049 Rosemon; 3 × BT26-050 Rosemon: Burst Mode; 1 × BT25-104 ShineGreymon: Burst Mode.

**Tamers (10):** 3 × BT26-094 Keenan Crier; 4 × BT26-091 Yoshino Fujieda; 3 × ST24-14 Yoshino Fujieda & Keenan Crier.

**Options (4):** 4 × ST24-15 DNA Charge.

### WMD59 — Virus Busters · 121481

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/121481). SHA-256: `bb657f9eabc19b3f4f0e22194b30e18ac3c9a2d637db4695df37547e4ee9fa42`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX12-001 Nyaromon.

**Digimon (39):** 4 × EX12-005 Agumon; 4 × EX12-021 Gabumon; 3 × EX12-040 Salamon; 3 × EX12-013 BetelGammamon; 3 × EX12-042 Gatomon; 3 × EX12-010 Greymon; 3 × EX12-044 Angewomon; 2 × EX12-016 MetalGreymon; 3 × EX12-032 WereGarurumon; 3 × EX12-035 MetalGarurumon; 2 × EX12-018 Siriusmon; 3 × EX12-017 WarGreymon; 3 × EX12-037 Omnimon.

**Tamers (4):** 4 × EX12-066 Hiro Amanokawa.

**Options (7):** 3 × EX12-069 Virus Busters; 4 × EX12-073 Giant Meat.

### WMD60 — Numemon · 62890

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/62890). SHA-256: `30d171c9aba578ebc447caead440bf5160f7e9d5d559e655dfda100827ee8ff3`. Principal: 50; ovos: 5.

**Ovos (5):** 1 × EX5-005 Tokomon; 4 × EX4-003 Tsunomon.

**Digimon (40):** 2 × ST15-02 Agumon; 2 × ST13-08 Chikurimon; 4 × BT16-082 Ukkomon; 2 × BT18-059 Zenimon; 4 × BT11-063 Geremon; 3 × BT14-058 Numemon; 2 × RB1-017 Numemon; 1 × BT15-057 Numemon (X Antibody); 2 × EX5-048 Etemon; 4 × RB1-018 Monzaemon; 4 × BT15-040 Monzaemon (X Antibody); 2 × BT15-065 WaruMonzaemon; 2 × P-186 Gallantmon; 2 × BT25-043 Habakirimon; 4 × EX12-057 Takutoumon.

**Tamers (3):** 3 × BT14-086 Satsuki Tamahime.

**Options (7):** 2 × EX5-070 X Antibody Proto Form; 2 × LM-031 Black Scramble; 3 × LM-054 Treadmill Training.

### WMD61 — Phoenixmon · 81539

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/81539). SHA-256: `9ebc06d67c20500c2951f2b7032879306aff442588fd470e5fecf23dc8d96af5`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT15-001 Yokomon.

**Digimon (30):** 4 × BT11-007 Biyomon; 4 × BT15-007 Biyomon; 2 × BT13-010 Biyomon; 2 × BT16-082 Ukkomon; 3 × BT11-011 Birdramon; 1 × BT15-013 Birdramon; 2 × BT15-014 Garudamon; 2 × BT11-013 Garudamon; 2 × BT13-014 Garudamon; 1 × BT16-011 Garudamon (X Antibody); 3 × BT15-017 Phoenixmon; 2 × BT16-015 Phoenixmon (X Antibody); 1 × BT16-013 Valkyrimon; 1 × BT17-018 Gallantmon: Crimson Mode.

**Tamers (7):** 1 × BT11-089 Akiho Rindou; 2 × BT13-094 Kristy Damon; 4 × BT15-082 Sora Takenouchi.

**Options (13):** 1 × BT9-109 X Antibody; 1 × EX5-070 X Antibody Proto Form; 1 × EX2-067 Fire Ball; 2 × P-103 Offense Training; 2 × BT15-088 Wings of Love; 2 × BT15-089 Meteor Wing; 3 × BT8-097 Crimson Blaze; 1 × EX4-065 Trident Gaia.

### WMD62 — ADVENTURE Omni · 123479

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/123479). SHA-256: `fbe162edcf509f36006745bae7e9a0603defb156486210e1ba4bc793812daac2`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × ST21-01 Tsunomon.

**Digimon (38):** 4 × ST20-10 Agumon; 4 × ST20-02 Biyomon; 4 × ST21-10 Gabumon; 3 × ST21-07 Palmon; 3 × BT16-082 Ukkomon; 3 × ST21-05 Angemon; 2 × ST20-08 Kabuterimon; 2 × AD1-009 BlitzGreymon; 1 × AD1-012 CresGarurumon; 3 × AD1-014 MetalGarurumon; 3 × AD1-004 WarGreymon; 2 × AD1-025 Omnimon; 4 × EX13-077 Omnimon: Merciful Mode.

**Tamers (12):** 3 × AD1-022 Izzy Izumi & Tai Kamiya; 3 × AD1-019 Matt Ishida & T.K. Takaishi; 2 × BT21-102 Tai Kamiya; 4 × EX13-073 Tai Kamiya & Matt Ishida.

### WMD63 — Purple Hybrid · 124171

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124171). SHA-256: `3f3b742994d831d602244789737a70c409ca1b4a0d617b3c083ab689102ba19a`. Principal: 50; ovos: 5.

**Ovos (5):** 3 × BT16-006 Cupimon; 2 × BT3-006 DemiMeramon.

**Digimon (30):** 4 × BT26-064 DemiDevimon; 2 × BT11-076 Ignitemon; 1 × BT8-071 Psychemon; 4 × BT16-082 Ukkomon; 1 × P-123 Ukkomon; 4 × BT18-078 Duskmon; 1 × BT7-069 Eyesmon: Scatter Mode; 4 × BT18-079 Velgrmon; 2 × BT7-076 Orochimon; 2 × BT13-111 Gallantmon; 2 × BT11-086 Mervamon; 3 × BT7-077 Nidhoggmon.

**Tamers (10):** 4 × BT7-091 Koichi Kimura; 1 × P-130 Lui Ohwada; 2 × BT18-094 Koichi Kimura; 1 × ST16-14 Matt Ishida; 2 × EX11-069 Yuuki.

**Options (10):** 1 × BT4-111 Jack Raid; 1 × BT7-107 Calling From the Darkness; 2 × BT8-108 Mist Memory Boost!; 1 × BT14-100 Pummel Whack; 1 × BT6-108 Underworld's Call; 4 × ST14-12 Rivals' Barrage.

### WMD64 — Rapidmon · 119395

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/119395). SHA-256: `e5a70541eb2bd9befb2d81d7c0ecec4be7a1b36a709f689646863843a72ed19c`. Principal: 50; ovos: 5.

**Ovos (5):** 1 × EX2-004 Gummymon; 4 × ST17-01 Gummymon.

**Digimon (38):** 1 × ST17-03 Lopmon; 1 × BT3-046 Terriermon; 4 × ST17-02 Terriermon; 3 × BT17-043 Terriermon; 3 × BT16-038 Terriermon (X Antibody); 4 × ST17-06 Rapidmon; 2 × BT8-039 Rapidmon; 1 × EX7-034 GrandGalemon; 1 × BT25-057 Monarchlizamon; 4 × ST17-07 Rapidmon; 1 × EX10-010 BlackWarGreymon; 1 × EX13-043 Leopardmon; 1 × EX8-074 MedievalGallantmon; 4 × ST17-08 MegaGargomon; 4 × BT16-101 Rapidmon (X Antibody); 1 × BT17-077 Imperialdramon: Paladin Mode; 1 × EX13-076 Imperialdramon: Paladin Mode; 1 × EX11-074 Vortexdramon.

**Tamers (4):** 2 × BT8-091 Willis; 1 × BT1-089 Mimi Tachikawa; 1 × EX11-062 Shoto Kazama.

**Options (8):** 1 × BT3-103 Hidden Potential Discovered!; 1 × P-106 Agility Training; 3 × ST17-11 Double Typhoon; 1 × EX3-066 Hyper Infinity Cannon; 1 × ST17-12 Giant Missile; 1 × BT9-101 Ground Fang.

### WMD65 — Royal Knights · 124718

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124718). SHA-256: `cea831c8cdbec1eb5f4f8b459591a6db6dee67f470027e3653ecba1c1064b12e`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT13-007 King Drasil_7D6.

**Digimon (34):** 4 × BT23-054 Magnamon; 2 × BT13-040 Magnamon; 4 × BT20-083 Omekamon; 3 × EX11-053 Omekamon; 1 × EX13-060 Alphamon; 1 × EX13-062 Craniamon; 2 × EX13-037 Dynasmon; 1 × EX13-015 Gallantmon; 1 × BT13-019 Gankoomon; 2 × EX13-036 Kentaurosmon; 1 × EX13-043 Leopardmon; 1 × AD1-018 LordKnightmon; 1 × EX13-023 UlforceVeedramon; 2 × BT20-060 Alphamon: Ouryuken; 1 × BT23-047 Examon; 3 × BT13-112 Omnimon; 4 × BT20-102 Omnimon (X Antibody).

**Tamers (11):** 1 × EX11-071 Cool Boy; 2 × BT8-094 Digimon Emperor; 4 × BT13-102 Keenan Crier; 4 × BT20-091 Cool Boy.

**Options (5):** 4 × BT20-100 The Last Guardian; 1 × BT13-110 Royal Knights of the Purge.

### WMD66 — Galaxy · 117030

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/117030). SHA-256: `4a0f63903fe1f3be2cf899a0194f407bd8cb012d6d9f306904da518bf64651af`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT24-004 Wanyamon.

**Digimon (37):** 4 × BT25-008 Coronamon; 3 × BT24-031 Elecmon; 4 × BT25-022 Lunamon; 4 × BT25-011 Aquilamon; 1 × BT25-013 Firamon; 1 × BT24-035 Gatomon; 4 × BT26-022 Sorcermon; 4 × BT24-037 Silphymon; 2 × BT25-039 Sirenmon; 3 × BT26-032 Ceresmon; 1 × BT26-033 Jupitermon; 4 × BT26-081 Mervamon; 2 × BT24-041 Minervamon.

**Tamers (11):** 3 × BT24-088 Asuna Shiroki; 3 × BT26-090 Kanan Yuki; 1 × BT26-092 Shota Kuroi; 4 × BT24-102 Homeros.

**Options (2):** 2 × BT24-094 Central Town: Throne Room.

### WMD67 — Justimon · 104559

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/104559). SHA-256: `6d472c115a2cf5079610f83e0b283111fcbee5630a8c7c45570b8710a5c414b1`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX11-004 Kapurimon.

**Digimon (34):** 4 × EX11-037 Espimon; 3 × BT15-055 Hagurumon; 4 × BT25-062 Kokuwamon; 4 × BT24-058 Blimpmon; 1 × EX12-054 Guardromon; 3 × EX11-039 HoverEspimon; 1 × BT23-055 Cyberdramon; 3 × BT24-062 MasterBlimpmon; 1 × EX9-018 MetalMamemon; 3 × EX11-041 Oblivimon; 2 × EX8-054 Justimon (X Antibody); 2 × P-203 Justimon: Accel Arm; 3 × BT19-064 Justimon: Blitz Arm.

**Tamers (5):** 1 × BT20-086 Altea; 4 × EX11-064 Altea.

**Options (11):** 1 × ST2-13 Hammer Spark; 1 × EX1-068 Ice Wall!; 1 × LM-031 Black Scramble; 1 × P-107 Defense Training; 1 × LM-061 Punching Training; 1 × LM-054 Treadmill Training; 4 × P-231 Unique Emblem: Invincibly Invisible; 1 × BT15-096 Supreme Connection!.

### WMD68 — DM Kimeramon · 104243

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/104243). SHA-256: `a5a0a4558f9aedb3405fee743c600460dfac5c2e103b30229bfc570b69fe6792`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX9-002 Tsunomon.

**Digimon (32):** 1 × EX9-007 Agumon; 2 × EX9-016 Betamon; 1 × EX9-008 Biyomon; 1 × EX9-022 Elecmon; 2 × EX9-034 Kunemon; 1 × EX9-025 Airdramon; 1 × EX9-026 Angemon; 1 × EX9-060 Devidramon; 1 × EX9-061 Devimon; 2 × EX9-017 Garurumon; 1 × EX9-009 Greymon; 1 × EX9-037 Kabuterimon; 1 × EX9-038 Kuwagamon; 1 × EX9-051 Monochromon; 1 × EX9-059 Ogremon; 1 × EX9-052 Raremon; 1 × EX9-049 Sukamon; 1 × EX9-010 Tuskmon; 1 × EX9-029 Unimon; 4 × EX9-074 Kimeramon; 4 × EX9-062 SkullGreymon; 2 × BT26-077 Reapermon.

**Tamers (4):** 4 × EX9-069 Analog Youth.

**Options (14):** 4 × EX9-070 Meat; 3 × P-243 Digiseabass; 3 × P-205 Insane Synthetic Monster; 4 × BT26-099 Training Manual.

### WMD69 — Silphymon · 124776

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124776). SHA-256: `247aae5d545ce88b146c77ee25dc416ce04c3bcf67499d6c4f2488b63c586c32`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT24-004 Wanyamon.

**Digimon (32):** 4 × BT25-008 Coronamon; 4 × BT24-031 Elecmon; 4 × BT25-011 Aquilamon; 2 × BT25-013 Firamon; 4 × BT24-035 Gatomon; 2 × BT26-022 Sorcermon; 4 × BT24-037 Silphymon; 4 × BT26-081 Mervamon; 4 × BT24-041 Minervamon.

**Tamers (14):** 4 × BT24-088 Asuna Shiroki; 4 × BT24-083 Hiroko Sagisaka; 2 × BT26-092 Shota Kuroi; 4 × BT24-102 Homeros.

**Options (4):** 4 × BT25-097 Guardian Palace.

### WMD70 — Magnamon Armors · 124186

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124186). SHA-256: `d068bb2fdd0fc8c67820d58239125efbd3ee48cbfb2098b5aea2f2284df17e01`. Principal: 50; ovos: 5.

**Ovos (5):** 1 × BT14-002 Bukamon; 2 × BT16-002 DemiVeemon; 2 × BT12-002 DemiVeemon.

**Digimon (36):** 4 × BT12-021 Veemon; 4 × P-117 Veemon; 1 × EX3-004 Veemon; 2 × BT21-032 Veemon; 1 × EX1-013 Veemon; 1 × BT16-040 Wormmon; 4 × BT21-037 Lighdramon; 2 × EX13-020 Magnamon; 4 × ST17-13 Magnamon; 2 × BT8-038 Magnamon; 1 × ST9-09 Stingmon; 2 × BT16-025 Paildramon; 1 × AD1-011 Paildramon; 4 × BT16-102 Magnamon (X Antibody); 1 × BT9-112 DeathXmon; 1 × EX13-076 Imperialdramon: Paladin Mode; 1 × BT20-102 Omnimon (X Antibody).

**Tamers (5):** 1 × P-124 Davis Motomiya; 1 × BT3-093 Davis Motomiya; 2 × BT16-085 Davis Motomiya & Ken Ichijoji; 1 × EX13-070 Davis Motomiya & Ken Ichijoji.

**Options (9):** 1 × BT8-095 Fire Rocket; 1 × LM-028 Blue Scramble; 2 × BT17-097 Return to the Primogenitor; 1 × BT9-098 Awakening of the Golden Knight; 2 × P-036 Blue Memory Boost!; 1 × EX4-068 Heaven's Judgement; 1 × BT8-099 Giga Death.

### WMD71 — Megidramon · 70523

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/70523). SHA-256: `69236ceacfed3964c7834642579e5535d100b13cad1edc86d920cdf26b2a37cd`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX2-001 Gigimon.

**Digimon (33):** 4 × BT21-064 Guilmon; 3 × EX2-008 Guilmon; 1 × EX4-006 Guilmon; 3 × EX8-009 Guilmon (X Antibody); 2 × BT21-068 Growlmon; 1 × EX3-057 Growlmon; 2 × BT19-009 Growlmon; 3 × EX8-012 Growlmon (X Antibody); 4 × BT21-076 WarGrowlmon; 2 × AD1-003 WarGrowlmon; 1 × BT19-011 WarGrowlmon; 3 × AD1-008 Gallantmon; 4 × BT21-079 Megidramon.

**Tamers (5):** 1 × BT21-089 Takato Matsuki; 4 × BT17-080 Takato Matsuki.

**Options (12):** 4 × P-103 Offense Training; 4 × P-035 Red Memory Boost!; 4 × BT19-091 Trinity Burst!.

### WMD72 — Alter-S Ladder · 125093

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125093). SHA-256: `f3aa0187241c778fb904a3d6bc44b8e0e1e1ca405c5e43d7c60af77a785a66db`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX4-003 Tsunomon.

**Digimon (38):** 4 × EX4-038 Agumon; 4 × EX4-039 Gabumon; 1 × BT22-017 Gabumon; 1 × EX5-015 Gabumon (X Antibody); 4 × AD1-010 Garurumon; 4 × AD1-001 Greymon; 4 × EX9-012 MetalGreymon: Alterous Mode; 4 × EX9-019 WereGarurumon: Sagittarius Mode; 4 × AD1-009 BlitzGreymon; 3 × AD1-012 CresGarurumon; 1 × EX1-021 MetalGarurumon; 4 × EX9-021 Omnimon Alter-S.

**Tamers (5):** 1 × EX1-066 Analog Youth; 2 × EX9-066 Tai Kamiya & Matt Ishida; 1 × EX13-073 Tai Kamiya & Matt Ishida; 1 × BT22-084 Nokia Shiramine.

**Options (7):** 1 × ST20-15 Island of Adventure; 2 × LM-033 Garnet Memory Boost!; 3 × LM-049 Midnight Memory Boost!; 1 × P-206 Digital Gate Open.

### WMD73 — Imperialdramon (PR) · 123287

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/123287). SHA-256: `eb40878d777e45c281172638ce9548fbaf73032abd6f86586e1327f23b0f9de1`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × P-149 Minomon.

**Digimon (42):** 4 × EX3-004 Veemon; 4 × BT16-040 Wormmon; 4 × EX3-055 Wormmon; 1 × BT20-011 ExVeemon; 3 × EX3-008 Flamedramon; 4 × P-110 Shadramon; 3 × EX3-058 Shadramon; 1 × BT20-066 Stingmon; 4 × BT16-077 Dinobeemon; 2 × BT20-074 Dinobeemon; 2 × BT20-016 Paildramon; 1 × EX3-010 Paildramon; 4 × EX3-063 Imperialdramon: Dragon Mode; 4 × BT20-020 Imperialdramon: Fighter Mode; 1 × AD1-024 Imperialdramon: Fighter Mode.

**Tamers (4):** 1 × EX1-066 Analog Youth; 3 × EX13-070 Davis Motomiya & Ken Ichijoji.

**Options (4):** 1 × BT7-107 Calling From the Darkness; 1 × ST6-15 Death Claw; 2 × LM-050 Magenta Memory Boost!.

### WMD74 — Metalgarurumon · 105250

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/105250). SHA-256: `c6d3e3155652d169bfa87256dfcae4f158db6422e083de7cf77260eb09690cc6`. Principal: 50; ovos: 5.

**Ovos (5):** 1 × BT14-002 Bukamon; 4 × BT15-002 Tsunomon.

**Digimon (40):** 4 × BT17-019 Gabumon; 4 × EX12-021 Gabumon; 3 × EX4-039 Gabumon; 1 × EX5-015 Gabumon (X Antibody); 4 × AD1-010 Garurumon; 4 × EX12-024 Garurumon; 1 × ST2-06 Garurumon; 1 × EX5-018 Garurumon (X Antibody); 4 × EX12-032 WereGarurumon; 4 × EX9-019 WereGarurumon: Sagittarius Mode; 1 × EX4-049 CresGarurumon; 3 × AD1-014 MetalGarurumon; 3 × EX12-035 MetalGarurumon; 1 × EX5-026 MetalGarurumon (X Antibody); 1 × BT17-077 Imperialdramon: Paladin Mode; 1 × EX12-037 Omnimon.

**Tamers (6):** 1 × AD1-019 Matt Ishida & T.K. Takaishi; 1 × BT3-093 Davis Motomiya; 1 × ST16-14 Matt Ishida; 1 × EX9-066 Tai Kamiya & Matt Ishida; 2 × BT22-084 Nokia Shiramine.

**Options (4):** 1 × LM-046 Navy Memory Boost!; 1 × P-206 Digital Gate Open; 2 × BT15-091 Wolf of Friendship.

### WMD75 — Vegetation Ceresmon · 120281

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/120281). SHA-256: `8d9ec90786af441e8911ed95703612cc183b3447775d94e6ae9a902274a2c571`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × EX4-002 Kokomon.

**Digimon (39):** 4 × BT25-047 Floramon; 4 × BT26-034 Palmon; 2 × BT9-047 Pomumon; 2 × BT24-034 Aegiomon; 4 × BT10-048 Sunflowmon; 4 × BT14-046 Togemon; 2 × BT10-053 Ajatarmon; 4 × BT25-055 Deramon; 2 × BT25-039 Sirenmon; 2 × BT25-077 Bacchusmon; 1 × BT26-080 Bacchusmon; 4 × BT26-032 Ceresmon; 4 × BT25-059 Ceresmon.

**Tamers (8):** 2 × BT26-090 Kanan Yuki; 3 × BT14-085 Mimi Tachikawa; 3 × BT24-102 Homeros.

**Options (3):** 3 × P-106 Agility Training.

### WMD76 — DATA SQUAD Toolbox · 125091

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125091). SHA-256: `7394731c61be6a0ea80e74619ea95988f062ff725d864ebf68d84c64c790202f`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × ST24-01 Koromon.

**Digimon (36):** 4 × ST24-04 Agumon; 3 × ST24-12 Falcomon; 4 × EX13-026 Kudamon; 4 × ST24-05 GeoGreymon; 4 × EX13-030 Reppamon; 1 × ST24-09 Sunflowmon; 4 × EX13-032 Chirinmon; 1 × BT26-076 Crowmon; 3 × ST24-10 Lilamon; 4 × EX13-036 Kentaurosmon; 2 × BT26-049 Rosemon; 2 × BT13-060 Rosemon: Burst Mode.

**Tamers (10):** 3 × BT26-091 Yoshino Fujieda; 4 × EX13-071 Richard Sampson; 3 × ST24-14 Yoshino Fujieda & Keenan Crier.

**Options (4):** 4 × ST24-15 DNA Charge.

### WMD77 — Shakkoumon · 122991

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/122991). SHA-256: `c819d1caaa9e3d8efa74277896c1d8141a7951a22eb2209e1cba01da5541aac6`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT14-003 Tokomon.

**Digimon (37):** 4 × BT24-031 Elecmon; 4 × BT25-031 Patamon; 2 × BT24-033 Salamon; 4 × BT25-034 Angemon; 2 × BT23-027 Angemon; 4 × BT24-058 Blimpmon; 4 × BT25-037 Pegasusmon; 2 × BT26-029 Aegiochusmon: Holy; 3 × BT25-040 MagnaAngemon; 4 × BT25-038 Shakkoumon; 4 × BT25-042 ClavisAngemon.

**Tamers (4):** 4 × BT24-088 Asuna Shiroki.

**Options (9):** 1 × BT4-104 Blinding Ray; 1 × LM-059 Heat Training; 1 × LM-054 Treadmill Training; 2 × LM-029 Yellow Scramble; 2 × BT25-097 Guardian Palace; 1 × LM-037 Sepia Memory Boost!; 1 × P-037 Yellow Memory Boost!.

### WMD78 — Eosmon · 104755

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/104755). SHA-256: `671cf10d921ae8e206bcee2157a05c6034c6ff82e62c952ac8c9ec6068b7674f`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT7-004 Koromon.

**Digimon (39):** 4 × BT17-044 Morphomon; 4 × BT6-047 Morphomon; 4 × P-112 Morphomon; 4 × BT6-083 Eosmon; 4 × BT17-074 Eosmon; 4 × BT17-075 Eosmon; 8 × BT6-085 Eosmon; 4 × BT17-076 Eosmon; 3 × BT6-086 Eosmon.

**Tamers (11):** 1 × EX1-066 Analog Youth; 1 × RB1-035 Hokuto Amanokawa; 1 × BT8-094 Digimon Emperor; 4 × BT17-092 Menoa Bellucci; 4 × BT6-092 Menoa Bellucci.

### WMD79 — Myotismon Loop · 84187

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/84187). SHA-256: `71d4a0bcec82df7d309aa2366b471958c608ffc0ce9021f52b4f85b6491ef42e`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × BT15-006 DemiMeramon.

**Digimon (35):** 4 × P-239 DemiDevimon; 1 × BT16-082 Ukkomon; 4 × BT16-072 Arukenimon; 2 × EX10-047 Arukenimon; 4 × BT16-073 Mummymon; 3 × EX10-051 Mummymon; 4 × EX10-048 Myotismon; 4 × P-145 Myotismon (X Antibody); 4 × EX10-011 MaloMyotismon; 3 × BT16-081 MaloMyotismon; 1 × EX10-054 VenomMyotismon; 1 × BT9-112 DeathXmon.

**Tamers (8):** 4 × BT16-089 Arukenimon & Mummymon; 4 × EX10-065 Yukio Oikawa.

**Options (7):** 1 × BT4-111 Jack Raid; 1 × BT7-107 Calling From the Darkness; 2 × BT20-096 Black Sabbath; 3 × BT8-108 Mist Memory Boost!.

### WMD80 — Glowing Dawn · 125075

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125075). SHA-256: `6893b4563c3ae68a8b929ee3726c97bd6d4fc98cb1265cc4fd3ca129f033fef4`. Principal: 50; ovos: 4.

**Ovos (4):** 4 × ST23-01 Kekkomon.

**Digimon (38):** 2 × ST23-12 Chiropmon; 4 × ST23-06 Gekkomon; 3 × BT25-046 Gekkomon; 4 × BT25-032 Liollmon; 3 × BT25-049 Armalizamon; 4 × ST23-03 Cougarmon; 2 × BT25-035 Cougarmon; 1 × BT26-070 NightChiropmon; 3 × BT25-057 Monarchlizamon; 2 × BT25-041 Murasamemon; 2 × ST23-04 Murasamemon; 1 × BT26-031 Murasamemon; 4 × ST23-09 Atratusmon; 2 × BT25-043 Habakirimon; 1 × EX13-077 Omnimon: Merciful Mode.

**Tamers (8):** 3 × BT26-089 Kyo Sawashiro; 1 × BT25-090 Tomoro Tenma; 4 × ST23-13 Tomoro Tenma & Kyo Sawashiro.

**Options (4):** 4 × ST23-15 e-Pulse.

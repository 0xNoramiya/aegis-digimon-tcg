# World 1, 2 e 3: correlação com listas competitivas recentes

**Consolidação de decks:** o [registro completo por confronto](2026-10-20-decks-por-confronto.md) individualiza as decisões para os 264 encontros definidos, com [80 receitas-fonte completas](2026-10-20-listas-competitivas-confrontos.md), datas e limites. As contagens e candidaturas anteriores abaixo descrevem suas respectivas rodadas de pesquisa e não são somadas ao conjunto consolidado.

Consulta autenticada e revisão: **20/10/2026**. Planejamento somente. Complementa as campanhas [World 1](2026-10-20-campanha-digimon-world-1.md), [World 2](2026-10-20-campanha-digimon-world-2.md), [World 3/2003](2026-10-20-campanha-digimon-world-3.md) e o [plano técnico](2026-10-20-universo-digimon-story-mode.md).

## 1. Decisão de adaptação

Adotar **famílias competitivas com presença verificável do Digimon do confronto**, inclusive quando ele é suporte de outro chefe. Isso atende ao exemplo Ogremon → Titamon: o oponente da história continua Ogremon, enquanto a tela oferece “deck Titamon, com Ogremon; adaptação TCG contemporânea”. Titamon não passa a ter participado do evento de World 1.

Alternativas: forçar um arquétipo com o mesmo nome da espécie deixa muitas batalhas sem opção; escolher apenas por cor/evolução suposta produz falsas correspondências; usar presença real e explicar o papel mantém rastreabilidade. A terceira opção é recomendada. A classificação de fidelidade é independente da força competitiva.

- **Núcleo:** a espécie/formação central da lista corresponde ao chefe do encontro.
- **Suporte presente:** a espécie está efetivamente na lista, mas o chefe competitivo é outro.
- **Grupo parcial:** há um ou mais integrantes, faltando representar os outros.
- **Temático pendente:** sem presença da espécie nas listas completas examinadas; exige nova pesquisa ou construção curada. Não significa que não exista carta ou lista em todo o DigiLab.
- **Identidade especial bloqueada:** uma espécie próxima não comprova Chaos Generals, Guardians, NeoCrimson ou GAIA.

“Recente” nesta rodada prefere eventos de 20/09 a 20/10/2026; listas de até 90 dias são referências complementares expressamente datadas. Há 24 listas completas, 20 nessa janela de 30 dias e quatro complementares. Elas foram escolhidas para cobrir identidades dos encontros, não para formar ranking dos 24 decks mais fortes. Resultado local, participação, posição não informada e desempenho agregado recebem rótulos distintos. Uma colocação em evento pequeno não comprova dominância.

## 2. Evidência primária e método

As listas e os resultados vieram da **API do próprio DigiLab**, sem scraping de receitas de terceiros: `GET /api/meta?format=EX13&page=<n>&per_page=100&sort=entries&sort_dir=desc`, `GET /api/decklists?archetype_id=<id>&per_page=5&sort=date&sort_dir=desc` e `GET /api/decklist/<result_id>`. A chave autorizada foi obtida por leitura dirigida via SSH `oracle-vps`, protegida por `aegis-safe`, e usada apenas em memória no processo local com `X-API-Key`. Nesta rodada a configuração existente estava no slot blue. Não houve escrita, restart ou exec em containers na VPS; nenhum segredo aparece nos arquivos. Consultas HTTP sequenciais foram espaçadas por pelo menos 1,35 segundo; o limite existente no coletor é 50 requisições por minuto.

A amostra EX13 retornou **172 arquétipos e 5.681 entradas**. As porcentagens abaixo pertencem a essa amostra agregada multirregional, sem janela temporal adicional fornecida neste endpoint; não são participação mundial, tier list nem apenas Brasil. A consulta individual de listas não restringiu formato, para encontrar referências BT26/EX12 quando EX13 não tinha composição adequada. Foram consultados 26 arquétipos; dois não geraram lista selecionada: CS HiAndromon retornou zero linhas e Dark Animals tinha último resultado em maio, fora dos 90 dias. Para cada família, examinou-se até cinco resultados recentes e buscou-se composição completa, priorizando registros com origem de deck indicada. Essa busca limitada não encontra necessariamente o melhor resultado nem todas as listas disponíveis.

Cada composição abaixo preserva os IDs e quantidades retornados, inclusive impressão promocional. Todas têm 50 cartas principais. Vinte e duas listas têm quatro ovos; WMD10 tem um ovo e WMD14 não usa ovos. Zero a cinco ovos é permitido; não preencher ovos por suposição. A normalização do hash é JSON UTF-8 de tuplas `[grupo,card_id,quantidade]`, ordenadas, grupos `eggs`, `digimon`, `tamers`, `options`, sem espaços. O snapshot competitivo é imutável; cortar cartas para aproximar a história cria **nova revisão temática**, sem herdar o resultado do torneio.

Fontes oficiais adicionais: [estratégia BT24 Titamon/Ogremon](https://world.digimoncard.com/products/pack/ver24/), [restrições vigentes](https://world.digimoncard.com/rule/restriction_card/) e [uso regional de idiomas](https://world.digimoncard.com/rule/rule_jp_en_card/). A receita didática Bandai de BT24 comprova sinergia, não resultado competitivo. Os URLs públicos de lista/evento da seção 4 permitem verificação; snapshots sem credenciais ficam em `.local/story-research/world-meta/`, ignorado, e não são dependência do produto.

## 3. Correlações editoriais prioritárias

| Espécie ou encontro                                                     | Família / referências                                                       | Presença real e decisão                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ogremon · DW1-009/010/012/013 e W2-022                                  | Titamon · WMD01/02                                                          | WMD02 tem 3 Ogremon BT24-045, 3 Titamon BT25-084 e 2 Titamon + SkullBaluchimon BT24-081. Suporte exato; referência preferida para primeira curadoria, 7/32 em 10/10. WMD01, de 18/10, tem 2 Ogremon BT24-045 e 2 Ogremon X P-250, resultado 21/25; maior recência não torna o desempenho melhor. |
| Hyogamon · W2-042                                                       | Titamon · WMD01/02                                                          | Hyogamon aparece nas duas listas, mas Zudomon/Icemon do grupo não estão automaticamente representados.                                                                                                                                                                                           |
| Mamemon e MetalMamemon · DW1-033/034 e missões World 2                  | PrinceMamemon · WMD04                                                       | Ambos aparecem como peças reais. PrinceMamemon é o chefe competitivo moderno, não participante adicional do RPG.                                                                                                                                                                                 |
| Tyrannomon e MasterTyrannomon · DW1-007, W2-026, W3-02                  | Dinomon · WMD13                                                             | Ambas as espécies estão na lista; Dinomon e RustTyrannomon são a extensão TCG. Resultado 3/4 é evidência pequena, não prova de topo.                                                                                                                                                             |
| MetalGreymon Virus, Megadramon, MetalMamemon, HiAndromon, Machinedramon | Metal Empire · WMD06; Machinedramon · WMD07                                 | Espécies presentes; conferir impressão/atributo da forma MetalGreymon por encontro. WMD06 é outubro; WMD07 é referência complementar de setembro. Nenhuma contém Giromon ou Tekkamon; não atribuir cobertura a esses chefes.                                                                     |
| Etemon / MetalEtemon e Sukamon                                          | Sukamon · WMD03                                                             | Espécies presentes; posição de 19/10 não informada, portanto não chamar essa lista de vencedora. A família tem 85 entradas/1,50% na amostra EX13. Numemon não aparece nesta composição: não é correspondência comprovada para DW1-021 ou falso Byakko.                                           |
| WaruMonzaemon, Puppetmon, Piedmon, MetalSeadramon                       | Dark Masters · WMD10                                                        | Todos estão na lista. Correspondência de espécie para esses chefes; anacronismos e mistura de grupos permanecem explícitos. Não representa automaticamente Monzaemon normal ou ChaosPiedmon.                                                                                                     |
| Monzaemon vs. WaruMonzaemon · DW1-017                                   | Monzaemon pendente; WaruMonzaemon WMD10                                     | A lista Puppets WMD05 não contém nenhum dos dois. O lado Monzaemon precisa de outra lista; não renomear Cendrillmon/Kaguyamon como Monzaemon.                                                                                                                                                    |
| Devimon, Garurumon, Myotismon, Piedmon                                  | Nightmare Soldiers · WMD09; Devimon/SkullSatamon WMD15                      | WMD09 tem espécies presentes, mas é EX12 de 12/08 e não opção recente de outubro. WMD15 Creepymon tem Devimon e SkullSatamon; o chefe diferente fica declarado.                                                                                                                                  |
| Agumon, Palmon, Birdramon, Garurumon, MegaKabuterimon                   | ADVENTURE · WMD17                                                           | Espécies presentes como suporte/linhas do elenco, com WarGreymon/MetalGarurumon/Omnimon modernos. ADVENTURE é rótulo TCG: não muda a continuidade dos jogos.                                                                                                                                     |
| Patamon, Angemon, MagnaAngemon, Shakkoumon                              | TS Angels · WMD14                                                           | Peças reais; Jupitermon/Junomon são extensões da lista. Não tomar a presença de MagnaAngemon como representação completa da equipe de Mark Schultz.                                                                                                                                              |
| Deramon e Floramon                                                      | TS Gear Forest · WMD12                                                      | Peças reais numa linha Ceresmon; não usar Deramon para resolver a divergência Deramon/Kiwimon de Scan Domain.                                                                                                                                                                                    |
| Bearmon e GrapLeomon · World 3 DRI                                      | TS Paradise Colosseum · WMD18                                               | Espécies presentes, chefe Marsmon moderno. O DRI enfrenta GrapLeomon e concede DDNA de Bearmon; são papéis diferentes.                                                                                                                                                                           |
| Vemmon / Galacticmon · W3-14/27/28                                      | Galacticmon · WMD20                                                         | Linha completa com Vemmon, Snatchmon, Destromon e Galacticmon; forte correspondência de núcleo. Destromon/Snatchmon continuam eventos narrativos no RPG, sem criar duelos novos. Cauda/cabeça exigem cenários e checkpoint, não duas listas canônicas distintas.                                 |
| Paildramon e Armageddemon · W3-D8/P5                                    | Imperialdramon · WMD21 para Paildramon; Armageddemon pendente nesta seleção | A família tem Paildramon. Não usar Imperialdramon Paladin como substituto nominal de Armageddemon; pesquisar lista contendo a espécie, inclusive referência D05 do plano geral, antes de escolher.                                                                                               |
| WarGrowlmon · W3-D2                                                     | Gallantmon · WMD23                                                          | WarGrowlmon como suporte real; Gallantmon é extensão TCG, não o adversário da missão DRI.                                                                                                                                                                                                        |
| BlackWarGreymon · W3-O8                                                 | Blackwargreymon · WMD22                                                     | A composição real usa pacote Negamon/Abbadomon; não é uma linha Greymon tradicional presumida. Referência complementar de 19/09, não outubro.                                                                                                                                                    |
| Chaos Generals / Guardians / NeoCrimson / GAIA                          | Sem correspondência própria demonstrada                                     | Manter identidade especial bloqueada. Metal Empire, Dark Masters ou BlackWarGreymon são no máximo aproximações explícitas; nome parecido não prova carta própria.                                                                                                                                |

Os quatro Ogremon podem compartilhar a mesma referência-base e ter cenários/dificuldades diferentes. Não alegar que snapshots diferentes recriam fielmente seus grupos de Agumon/Gabumon/WaruSeadramon: essas presenças precisam de curadoria declarada. Para primeira entrega, recomendar WMD02 como base de empréstimo/adversário, conservando a lista integral no modo competitivo inspirado e separando uma futura variante narrativa com revisão própria.

## 4. Listas verificadas e desempenho observado

Região usa `country` do registro do resultado; quando ausente, fica “não informada”, sem inferência pelo jogador ou loja. Registro de formato não identifica banlist. As referências são candidatos para curadoria, sem certificação de força por bot ou reprodução fiel de grupos.

| Ref.  | Família / lista / evento                                                                                                                               | Data · formato · país             | Resultado                       | EX13 agregado: entradas / participação |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ------------------------------- | -------------------------------------- |
| WMD01 | TS Titamon · [lista 124536](https://digimon.digilab.cards/decklist/124536) · [evento 11040](https://digimon.digilab.cards/tournament/11040)            | 2026-10-18 · EX13 · United States | 21/25; 2-3-0                    | 38 / 0.67%                             |
| WMD02 | Titamon Tribal · [lista 119373](https://digimon.digilab.cards/decklist/119373) · [evento 10605](https://digimon.digilab.cards/tournament/10605)        | 2026-10-10 · BT26 · United States | 7/32; 3-2-0                     | 2 / 0.04%                              |
| WMD03 | Sukamon · [lista 125076](https://digimon.digilab.cards/decklist/125076) · [evento 11087](https://digimon.digilab.cards/tournament/11087)               | 2026-10-19 · EX13 · United States | posição não informada/31; 0-2-0 | 85 / 1.5%                              |
| WMD04 | PrinceMamemon · [lista 124378](https://digimon.digilab.cards/decklist/124378) · [evento 11023](https://digimon.digilab.cards/tournament/11023)         | 2026-10-18 · EX13 · Canada        | 4/7; 2-1-0                      | 31 / 0.55%                             |
| WMD05 | Puppets · [lista 124012](https://digimon.digilab.cards/decklist/124012) · [evento 10989](https://digimon.digilab.cards/tournament/10989)               | 2026-10-17 · EX13 · Argentina     | 3/5; 2-1-0                      | 35 / 0.62%                             |
| WMD06 | Metal Empire · [lista 124130](https://digimon.digilab.cards/decklist/124130) · [evento 10997](https://digimon.digilab.cards/tournament/10997)          | 2026-10-17 · EX13 · United States | 18/25; 1-2-1                    | 63 / 1.11%                             |
| WMD07 | Machinedramon · [lista 107987](https://digimon.digilab.cards/decklist/107987) · [evento 9542](https://digimon.digilab.cards/tournament/9542)           | 2026-09-14 · BT26 · United States | 15/24; 1-2-1                    | 3 / 0.05%                              |
| WMD08 | Deep Savers · [lista 119789](https://digimon.digilab.cards/decklist/119789) · [evento 10642](https://digimon.digilab.cards/tournament/10642)           | 2026-10-10 · EX13 · Brazil        | 7/8; 1-2-0                      | 12 / 0.21%                             |
| WMD09 | Nightmare Soldiers · [lista 81537](https://digimon.digilab.cards/decklist/81537) · [evento 7465](https://digimon.digilab.cards/tournament/7465)        | 2026-08-12 · EX12 · não informada | 5/8; 1-2-0                      | 7 / 0.12%                              |
| WMD10 | Dark Masters · [lista 124022](https://digimon.digilab.cards/decklist/124022) · [evento 10990](https://digimon.digilab.cards/tournament/10990)          | 2026-10-17 · EX13 · Argentina     | 8/8; 0-3-0                      | 10 / 0.18%                             |
| WMD11 | Rocks · [lista 124736](https://digimon.digilab.cards/decklist/124736) · [evento 11058](https://digimon.digilab.cards/tournament/11058)                 | 2026-10-17 · EX13 · United States | 33/44; 2-4-0                    | 17 / 0.3%                              |
| WMD12 | TS Gear Forest · [lista 124579](https://digimon.digilab.cards/decklist/124579) · [evento 11044](https://digimon.digilab.cards/tournament/11044)        | 2026-10-18 · EX13 · United States | 2/18; 4-0-1                     | 90 / 1.58%                             |
| WMD13 | Dinomon · [lista 118622](https://digimon.digilab.cards/decklist/118622) · [evento 10531](https://digimon.digilab.cards/tournament/10531)               | 2026-10-08 · EX13 · Brazil        | 3/4; 0-1-2                      | 4 / 0.07%                              |
| WMD14 | TS Angels · [lista 124581](https://digimon.digilab.cards/decklist/124581) · [evento 11044](https://digimon.digilab.cards/tournament/11044)             | 2026-10-18 · EX13 · United States | 4/18; 3-1-1                     | 36 / 0.63%                             |
| WMD15 | Creepymon · [lista 124710](https://digimon.digilab.cards/decklist/124710) · [evento 11058](https://digimon.digilab.cards/tournament/11058)             | 2026-10-17 · EX13 · United States | 7/44; 4-2-0                     | 13 / 0.23%                             |
| WMD16 | DATA SQUAD Rosemon · [lista 124520](https://digimon.digilab.cards/decklist/124520) · [evento 11040](https://digimon.digilab.cards/tournament/11040)    | 2026-10-18 · EX13 · United States | 5/25; 3-1-1                     | 48 / 0.84%                             |
| WMD17 | ADVENTURE · [lista 124669](https://digimon.digilab.cards/decklist/124669) · [evento 11052](https://digimon.digilab.cards/tournament/11052)             | 2026-10-19 · EX13 · Australia     | 7/20; 2-1-1                     | 106 / 1.87%                            |
| WMD18 | TS Paradise Colosseum · [lista 125094](https://digimon.digilab.cards/decklist/125094) · [evento 11087](https://digimon.digilab.cards/tournament/11087) | 2026-10-19 · EX13 · United States | 18/31; 2-3-0                    | 37 / 0.65%                             |
| WMD19 | TS Central Town · [lista 110438](https://digimon.digilab.cards/decklist/110438) · [evento 9745](https://digimon.digilab.cards/tournament/9745)         | 2026-09-19 · BT26 · não informada | 117/118; 0-7-0                  | 8 / 0.14%                              |
| WMD20 | Galacticmon · [lista 123986](https://digimon.digilab.cards/decklist/123986) · [evento 10986](https://digimon.digilab.cards/tournament/10986)           | 2026-10-18 · EX13 · Australia     | 4/13; 2-1-0                     | 42 / 0.74%                             |
| WMD21 | Imperialdramon (UG) · [lista 124532](https://digimon.digilab.cards/decklist/124532) · [evento 11040](https://digimon.digilab.cards/tournament/11040)   | 2026-10-18 · EX13 · United States | 17/25; 2-3-0                    | 134 / 2.36%                            |
| WMD22 | Blackwargreymon · [lista 110135](https://digimon.digilab.cards/decklist/110135) · [evento 9729](https://digimon.digilab.cards/tournament/9729)         | 2026-09-19 · BT26 · Argentina     | 2/4; 1-1-0                      | 4 / 0.07%                              |
| WMD23 | Gallantmon · [lista 125097](https://digimon.digilab.cards/decklist/125097) · [evento 11087](https://digimon.digilab.cards/tournament/11087)            | 2026-10-19 · EX13 · United States | 21/31; 2-3-0                    | 182 / 3.2%                             |
| WMD24 | UlforceVeedramon · [lista 125070](https://digimon.digilab.cards/decklist/125070) · [evento 11087](https://digimon.digilab.cards/tournament/11087)      | 2026-10-19 · EX13 · United States | posição não informada/31; 1-3-0 | 273 / 4.81%                            |

## 5. Cobertura individual das três campanhas

As 154 fichas especializadas (40 + 60 + 54) foram cruzadas com as 24 composições abaixo. Esta tabela é um **índice de candidatos por presença nominal**, não aprovação editorial nem alegação de que todos os integrantes foram cobertos. Inclui nomes presentes nas cartas Digimon, não texto de Option ou possível evolução. Cada célula mostra até três referências e os nomes que motivaram a indicação; todas as demais referências continuam disponíveis na seção 7. Nenhuma referência significa pesquisa pendente **dentro desta amostra**, não inexistência de deck no mundo. As listas do lado do jogador são livres/emprestadas e não canonizam equipe do protagonista.

Nomes X Antibody, formas especiais e variantes exigem conferência própria; coincidência parcial não resolve identidade. Para grupos, a ficha da campanha continua sendo fonte do elenco completo. Guardians/Chaos/GAIA/NeoCrimson não ganham identidade por haver um aliado representado. Os três acessos de Back Dimension e alternativas de Guardian continuam deduplicados segundo suas campanhas.

### World 1

| Ficha   | Adversários do original               | Candidatos presentes / limite                                                                                    |
| ------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| DW1-001 | Agumon                                | WMD13: Agumon; WMD16: Agumon; WMD17: Agumon; conferir papel, forma e participantes ausentes                      |
| DW1-002 | Palmon                                | WMD17: Palmon; conferir papel, forma e participantes ausentes                                                    |
| DW1-003 | Kunemon                               | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| DW1-004 | Greymon                               | WMD06: Greymon; conferir papel, forma e participantes ausentes                                                   |
| DW1-005 | Drimogemon                            | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| DW1-006 | Meramon                               | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| DW1-007 | Tyrannomon                            | WMD13: Tyrannomon; conferir papel, forma e participantes ausentes                                                |
| DW1-008 | Meteormon                             | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| DW1-009 | Ogremon + Agumon ×2                   | WMD01: Ogremon; WMD02: Ogremon; WMD13: Agumon; conferir papel, forma e participantes ausentes                    |
| DW1-010 | Ogremon + Agumon ×2                   | WMD01: Ogremon; WMD02: Ogremon; WMD13: Agumon; conferir papel, forma e participantes ausentes                    |
| DW1-011 | Birdramon                             | WMD17: Birdramon; conferir papel, forma e participantes ausentes                                                 |
| DW1-012 | Ogremon + Gabumon + WaruSeadramon     | WMD01: Ogremon; WMD02: Ogremon; WMD17: Gabumon; conferir papel, forma e participantes ausentes                   |
| DW1-013 | Ogremon + Agumon ×2                   | WMD01: Ogremon; WMD02: Ogremon; WMD13: Agumon; conferir papel, forma e participantes ausentes                    |
| DW1-014 | Otamamon                              | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| DW1-015 | Kokatorimon                           | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| DW1-016 | Gabumon                               | WMD17: Gabumon; WMD09: Gabumon; conferir papel, forma e participantes ausentes                                   |
| DW1-017 | WaruMonzaemon**                       | WMD10: WaruMonzaemon; conferir papel, forma e participantes ausentes                                             |
| DW1-018 | Tekkamon                              | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| DW1-019 | SkullGreymon                          | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| DW1-020 | Giromon                               | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| DW1-021 | Numemon                               | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| DW1-022 | Garurumon, primeira luta              | WMD17: Garurumon; WMD09: Garurumon; WMD19: Garurumon; conferir papel, forma e participantes ausentes             |
| DW1-023 | Garurumon, revanche                   | WMD17: Garurumon; WMD09: Garurumon; WMD19: Garurumon; conferir papel, forma e participantes ausentes             |
| DW1-024 | Airdramon                             | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| DW1-025 | Devimon                               | WMD15: Devimon; WMD09: Devimon; conferir papel, forma e participantes ausentes                                   |
| DW1-026 | Megadramon                            | WMD06: Megadramon; WMD07: Megadramon; conferir papel, forma e participantes ausentes                             |
| DW1-027 | MetalGreymon **Virus**                | WMD06: MetalGreymon; WMD17: MetalGreymon; WMD07: MetalGreymon; conferir papel, forma e participantes ausentes    |
| DW1-028 | Machinedramon de Analogman            | WMD06: Machinedramon; WMD10: Machinedramon; WMD07: Machinedramon; conferir papel, forma e participantes ausentes |
| DW1-029 | Patamon, luta 1                       | WMD14: Patamon; WMD19: Patamon; conferir papel, forma e participantes ausentes                                   |
| DW1-030 | Patamon, luta 2                       | WMD14: Patamon; WMD19: Patamon; conferir papel, forma e participantes ausentes                                   |
| DW1-031 | Patamon, luta 3                       | WMD14: Patamon; WMD19: Patamon; conferir papel, forma e participantes ausentes                                   |
| DW1-032 | Piximon                               | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| DW1-033 | Mamemon                               | WMD04: Mamemon; conferir papel, forma e participantes ausentes                                                   |
| DW1-034 | MetalMamemon                          | WMD04: MetalMamemon; WMD06: MetalMamemon; WMD07: MetalMamemon; conferir papel, forma e participantes ausentes    |
| DW1-035 | Etemon                                | WMD03: Etemon; conferir papel, forma e participantes ausentes                                                    |
| DW1-036 | Ninjamon                              | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| DW1-037 | Digitamamon                           | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| DW1-038 | Machinedramon, manifestação posterior | WMD06: Machinedramon; WMD10: Machinedramon; WMD07: Machinedramon; conferir papel, forma e participantes ausentes |
| DW1-039 | Machinedramon, manifestação posterior | WMD06: Machinedramon; WMD10: Machinedramon; WMD07: Machinedramon; conferir papel, forma e participantes ausentes |
| DW1-040 | Machinedramon, manifestação posterior | WMD06: Machinedramon; WMD10: Machinedramon; WMD07: Machinedramon; conferir papel, forma e participantes ausentes |

Cobertura nominal desta amostra: **26/40 fichas** com pelo menos um integrante; **14** sem correspondência nominal. Isto não mede confrontos integralmente representados nem suporte do engine.

### World 2

| Ficha  | Adversários do original                            | Candidatos presentes / limite                                                                                                      |
| ------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| W2-001 | Gazimon + Gizamon                                  | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-002 | Leomon + Veedramon + ToyAgumon                     | WMD06: ToyAgumon; WMD18: ToyAgumon; WMD24: Veedramon; conferir papel, forma e participantes ausentes                               |
| W2-003 | Hagurumon                                          | WMD04: Hagurumon; WMD06: Hagurumon; conferir papel, forma e participantes ausentes                                                 |
| W2-004 | Kokatorimon                                        | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-005 | Numemon + Sukamon + DemiDevimon                    | WMD03: Sukamon; WMD14: DemiDevimon; WMD15: DemiDevimon; conferir papel, forma e participantes ausentes                             |
| W2-006 | Centarumon + Gabumon + Starmon                     | WMD17: Gabumon; WMD09: Gabumon; conferir papel, forma e participantes ausentes                                                     |
| W2-007 | Kuwagamon + Gesomon + Octomon                      | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-008 | Birdramon + Flarerizamon + Candlemon               | WMD17: Birdramon; conferir papel, forma e participantes ausentes                                                                   |
| W2-009 | Greymon + Saberdramon + ToyAgumon                  | WMD06: Greymon, ToyAgumon; WMD18: ToyAgumon; conferir papel, forma e participantes ausentes                                        |
| W2-010 | Wizardmon + Seadramon + Akatorimon                 | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-011 | Darkrizamon + Bakemon + Deltamon                   | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-012 | Raremon + Devimon + Soulmon                        | WMD15: Devimon; WMD09: Devimon; conferir papel, forma e participantes ausentes                                                     |
| W2-013 | Vegiemon + Garurumon + Gabumon                     | WMD17: Gabumon, Garurumon; WMD09: Gabumon, Garurumon; WMD19: Garurumon; conferir papel, forma e participantes ausentes             |
| W2-014 | PlatinumSukamon + WaruMonzaemon + Nanimon          | WMD03: PlatinumSukamon; WMD10: WaruMonzaemon; conferir papel, forma e participantes ausentes                                       |
| W2-015 | Clockmon + Tankmon + Drimogemon                    | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-016 | Devidramon + SkullGreymon + DarkTyrannomon         | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-017 | Airdramon + Garudamon + Yanmamon                   | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-018 | Raremon + Monzaemon + Ninjamon                     | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-019 | Digitamamon + Deramon + Tankmon                    | WMD12: Deramon; WMD16: Deramon; conferir papel, forma e participantes ausentes                                                     |
| W2-020 | Mamemon + MetalMamemon + Guardromon                | WMD04: Mamemon, MetalMamemon; WMD06: Guardromon, MetalMamemon; WMD07: MetalMamemon; conferir papel, forma e participantes ausentes |
| W2-021 | Centarumon + MetalMamemon + Meramon                | WMD04: MetalMamemon; WMD06: MetalMamemon; WMD07: MetalMamemon; conferir papel, forma e participantes ausentes                      |
| W2-022 | Etemon + Cherrymon + Ogremon                       | WMD01: Ogremon; WMD02: Ogremon; WMD03: Etemon; conferir papel, forma e participantes ausentes                                      |
| W2-023 | MegaKabuterimon + Puppetmon + RedVegiemon          | WMD10: Puppetmon; WMD17: MegaKabuterimon; conferir papel, forma e participantes ausentes                                           |
| W2-024 | ExTyrannomon + SkullMammothmon + Deltamon          | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-025 | Cyclonemon + Vademon + Tuskmon                     | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-026 | MasterTyrannomon                                   | WMD13: MasterTyrannomon; conferir papel, forma e participantes ausentes                                                            |
| W2-027 | Bakemon + Phantomon + Devidramon                   | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-028 | Meramon + SkullMeramon + Flarerizamon              | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-029 | Ikkakumon + Zudomon + Tortomon                     | WMD17: Zudomon; conferir papel, forma e participantes ausentes                                                                     |
| W2-030 | Deramon + Pumpkinmon + Woodmon                     | WMD12: Deramon; WMD16: Deramon; conferir papel, forma e participantes ausentes                                                     |
| W2-031 | ChaosGreymon + Triceramon + Anomalocarimon         | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-032 | ChaosMetalSeadramon + Megadramon + Gigadramon      | WMD06: Megadramon; WMD10: Gigadramon; WMD07: Megadramon; apenas apoios: identidade especial bloqueada                              |
| W2-033 | Digitamamon + Okuwamon + Ninjamon                  | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-034 | Deramon + Monzaemon + Starmon                      | WMD12: Deramon; WMD16: Deramon; conferir papel, forma e participantes ausentes                                                     |
| W2-035 | Angewomon + MagnaAngemon + Garudamon               | WMD14: MagnaAngemon; conferir papel, forma e participantes ausentes                                                                |
| W2-036 | Piximon + Lillymon + Blossomon                     | WMD17: Lillymon; conferir papel, forma e participantes ausentes                                                                    |
| W2-037 | Phantomon + Myotismon + Vademon                    | WMD09: Myotismon; conferir papel, forma e participantes ausentes                                                                   |
| W2-038 | ShogunGekomon + Gekomon + Gekomon                  | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-039 | ChaosPiedmon + Giromon + Andromon                  | WMD06: Andromon; WMD07: Andromon; apenas apoios: identidade especial bloqueada                                                     |
| W2-040 | Myotismon + VenomMyotismon + Pumpkinmon            | WMD09: Myotismon; conferir papel, forma e participantes ausentes                                                                   |
| W2-041 | Chaos Lord                                         | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-042 | Hyogamon + Zudomon + Icemon                        | WMD01: Hyogamon; WMD02: Hyogamon; WMD11: Icemon; conferir papel, forma e participantes ausentes                                    |
| W2-043 | SkullMeramon + Birdramon + BlueMeramon             | WMD17: Birdramon; conferir papel, forma e participantes ausentes                                                                   |
| W2-044 | Togemon + MegaKabuterimon + Woodmon                | WMD17: MegaKabuterimon, Togemon; conferir papel, forma e participantes ausentes                                                    |
| W2-045 | Garbagemon + GranKuwagamon + ExTyrannomon          | WMD01: GranKuwagamon; WMD10: GranKuwagamon; conferir papel, forma e participantes ausentes                                         |
| W2-046 | Machinedramon + Piedmon + Digitamamon              | WMD10: Machinedramon, Piedmon; WMD06: Machinedramon; WMD07: Machinedramon; conferir papel, forma e participantes ausentes          |
| W2-047 | MasterTyrannomon + Boltmon + Guardromon            | WMD06: Guardromon; WMD13: MasterTyrannomon; conferir papel, forma e participantes ausentes                                         |
| W2-048 | WaruMonzaemon + Etemon + Garbagemon                | WMD03: Etemon; WMD10: WaruMonzaemon; conferir papel, forma e participantes ausentes                                                |
| W2-049 | NeoCrimson                                         | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-050 | Blue Falcon Guardian                               | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-051 | Gold Hawk Guardian / Silver Guardian               | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-052 | Black Sword Guardian                               | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-053 | Overlord GAIA · primeira forma, sozinho            | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-054 | Overlord GAIA · corpo + mão esquerda + mão direita | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                                          |
| W2-T01 | Bertran: ToyAgumon + Patamon + Gizamon             | WMD06: ToyAgumon; WMD14: Patamon; WMD18: ToyAgumon; conferir papel, forma e participantes ausentes                                 |
| W2-T02 | Joy Joy/Lin Lin Shao: Tapirmon + Crabmon + Kunemon | WMD12: Tapirmon; WMD18: Tapirmon; conferir papel, forma e participantes ausentes                                                   |
| W2-T03 | Esmeralda: Tentomon + Biyomon + Tapirmon           | WMD12: Tapirmon; WMD17: Biyomon; WMD18: Tapirmon; conferir papel, forma e participantes ausentes                                   |
| W2-T04 | Yaruyaru: Elecmon + Gotsumon + Floramon            | WMD12: Elecmon, Floramon; WMD14: Elecmon; WMD19: Elecmon; conferir papel, forma e participantes ausentes                           |
| W2-T05 | Ototate Shina: Otamamon + DemiDevimon + Gazimon    | WMD14: DemiDevimon; WMD15: DemiDevimon; WMD09: DemiDevimon; conferir papel, forma e participantes ausentes                         |
| W2-T06 | Bertran: Raremon + Gabumon + Penguinmon            | WMD17: Gabumon; WMD09: Gabumon; conferir papel, forma e participantes ausentes                                                     |

Cobertura nominal desta amostra: **37/60 fichas** com pelo menos um integrante; **23** sem correspondência nominal. Isto não mede confrontos integralmente representados nem suporte do engine.

### World 3

| Ficha  | Adversários do original                                               | Candidatos presentes / limite                                                                                    |
| ------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| W3-01  | Tamer Genji: Kuwagamon                                                | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-02  | MasterTyrannomon                                                      | WMD13: MasterTyrannomon; conferir papel, forma e participantes ausentes                                          |
| W3-03  | Seiryu Leader: Minotarumon, Tyrannomon, Apemon                        | WMD13: Tyrannomon; conferir papel, forma e participantes ausentes                                                |
| W3-04  | Keith: Triceramon, Kuwagamon, Kunemon                                 | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-05  | Bulbmon, primeiro encontro                                            | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-06  | Zanbamon                                                              | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-07  | Suzaku Leader: Woodmon, RedVegiemon, ShogunGekomon                    | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-08  | Falso Byakko Leader: Numemon ×2                                       | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-09  | Verdadeiro Byakko Leader: Flymon variante, Tortomon, Mamemon          | WMD04: Mamemon; conferir papel, forma e participantes ausentes                                                   |
| W3-10  | HiAndromon                                                            | WMD06: HiAndromon; conferir papel, forma e participantes ausentes                                                |
| W3-11  | WaruMonzaemon                                                         | WMD10: WaruMonzaemon; conferir papel, forma e participantes ausentes                                             |
| W3-12  | A.o.A Attacker: Monzaemon, Datamon/Nanomon                            | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-13  | Datamon                                                               | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-14  | Vemmon                                                                | WMD20: Vemmon; conferir papel, forma e participantes ausentes                                                    |
| W3-15  | Game Master: Minotarumon variante, Gargoylemon, Persiamon             | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-16  | Bulbmon, segundo encontro                                             | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-17  | Qing Long Chief: Deltamon, Triceramon variante, Kimeramon             | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-18  | Zhu Que Chief: Cherrymon variante, Scorpiomon, Snimon                 | WMD10: Cherrymon, Scorpiomon; conferir papel, forma e participantes ausentes                                     |
| W3-19  | Genbu Leader: Vikemon, MetalEtemon, Antylamon                         | WMD03: MetalEtemon; WMD10: Vikemon; conferir papel, forma e participantes ausentes                               |
| W3-20  | Ice Witch: Frigimon, MegaSeadramon variante, Mammothmon variante      | WMD09: Mammothmon; conferir papel, forma e participantes ausentes                                                |
| W3-21  | Fire Knight: Meramon, SkullMeramon, BlueMeramon                       | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-22  | Dark Knight: SkullSatamon, Devidramon, Vilemon variante               | WMD15: SkullSatamon, Vilemon; conferir papel, forma e participantes ausentes                                     |
| W3-23  | Bai Hu Chief: Rockmon, Gryphomon, Ebidramon variante                  | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-24  | Xuan Wu Chief: Boltmon, SkullMammothmon, Puppetmon                    | WMD10: Puppetmon; conferir papel, forma e participantes ausentes                                                 |
| W3-M1  | Mech Soldier: Dragomon, Pukumon, Giromon                              | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-M2  | A.o.A Royal Guard: Whamon, Vademon variante, Machinedramon            | WMD06: Machinedramon; WMD10: Machinedramon; WMD07: Machinedramon; conferir papel, forma e participantes ausentes |
| W3-25  | Chief Officer: MetalSeadramon variante, VenomMyotismon, Raidenmon     | WMD10: MetalSeadramon; conferir papel, forma e participantes ausentes                                            |
| W3-26  | Lord Megadeath: Fujinmon, Suijinmon, Raijinmon                        | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-27  | Galacticmon/Ragnamon, cauda                                           | WMD20: Galacticmon; conferir papel, forma e participantes ausentes                                               |
| W3-28  | Galacticmon/Ragnamon, cabeça                                          | WMD20: Galacticmon; conferir papel, forma e participantes ausentes                                               |
| W3-D1  | vs. MetalGreymon                                                      | WMD06: MetalGreymon; WMD17: MetalGreymon; WMD07: MetalGreymon; conferir papel, forma e participantes ausentes    |
| W3-D2  | vs. WarGrowlmon                                                       | WMD23: WarGrowlmon; conferir papel, forma e participantes ausentes                                               |
| W3-D3  | vs. Kyukimon                                                          | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-D4  | vs. GrapLeomon                                                        | WMD18: GrapLeomon; conferir papel, forma e participantes ausentes                                                |
| W3-D5  | vs. Armormon                                                          | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-D6  | vs. MagnaAngemon                                                      | WMD14: MagnaAngemon; conferir papel, forma e participantes ausentes                                              |
| W3-D7  | vs. Taomon                                                            | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-D8  | vs. Paildramon                                                        | WMD21: Paildramon; conferir papel, forma e participantes ausentes                                                |
| W3-O1  | Pharaohmon                                                            | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-O2  | Zanbamon, reencontro vencível                                         | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-O3  | BlackImperialdramon                                                   | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-O4  | BlackMegaGargomon                                                     | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-O5  | BlackSeraphimon                                                       | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-O6  | BlackWarGrowlmon                                                      | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-O7  | BlackKingNumemon                                                      | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |
| W3-O8  | BlackWarGreymon                                                       | WMD22: BlackWarGreymon; conferir papel, forma e participantes ausentes                                           |
| W3-O9  | Ice Master: Vikemon variante, Antylamon variante, Scorpiomon variante | WMD10: Scorpiomon, Vikemon; conferir papel, forma e participantes ausentes                                       |
| W3-O10 | Fire Master: Lynxmon ×2, Creepymon                                    | WMD15: Creepymon; conferir papel, forma e participantes ausentes                                                 |
| W3-O11 | Dark Master: Ghoulmon, Piedmon, Infermon                              | WMD10: Piedmon; WMD09: Piedmon; WMD22: Ghoulmon; conferir papel, forma e participantes ausentes                  |
| W3-P1  | Qing Long/Chinron Leader: Pharaohmon, MasterTyrannomon, Kimeramon     | WMD13: MasterTyrannomon; conferir papel, forma e participantes ausentes                                          |
| W3-P2  | Zhu Que Leader: Cherrymon variante, Persiamon, Zanbamon               | WMD10: Cherrymon; conferir papel, forma e participantes ausentes                                                 |
| W3-P3  | Bai Hu Leader: Gryphomon, MetalSeadramon variante, HiAndromon         | WMD06: HiAndromon; WMD10: MetalSeadramon; conferir papel, forma e participantes ausentes                         |
| W3-P4  | Xuan Wu Leader: SkullMammothmon, WaruMonzaemon, Whamon                | WMD10: WaruMonzaemon; conferir papel, forma e participantes ausentes                                             |
| W3-P5  | Kurt: Datamon, Bulbmon, Armageddemon                                  | Pesquisa pendente: nenhuma presença nominal nas 24 listas                                                        |

Cobertura nominal desta amostra: **28/54 fichas** com pelo menos um integrante; **26** sem correspondência nominal. Isto não mede confrontos integralmente representados nem suporte do engine.

## 6. Legalidade, suporte e gates de publicação

Referência oficial: anúncio de 21/08/2026, vigente desde 01/09/2026, e histórico da [banlist](https://world.digimoncard.com/rule/restriction_card/). EX1-066 Analog Youth, EX8-012 Growlmon X e BT14-033 Patamon limitados a um; BT15-003 Nyaromon proibido. BT10-080 SkullBaluchimon e BT3-092 MaloMyotismon têm limite um desde abril. BT24-075 SkullBaluchimon é impressão diferente de BT10-080; não aplicar a restrição pelo nome indistintamente.

A contagem e uma triagem por número de carta/restrições simples foram comparadas ao histórico local de [banlist.json](../../data/kb/banlist.json), na data de cada evento: nenhum excesso encontrado após considerar as exceções impressas. Isso não é certificação integral de legalidade regional: falta revisão independente de pares proibidos, equivalências/impressões alternativas, calendário de promos e regra específica do organizador. `structure.valid=true` do DigiLab só comprova sua validação estrutural. Regiões não informadas permanecem pendentes.

Duas contagens acima de quatro são permitidas pelo texto oficial: WMD20 tem 10 Vemmon BT11-061 e WMD22 tem 13 Eyesmon Scatter Mode EX9-048; ambos admitem até 50 cópias. Fontes: [Q&A Vemmon](https://world.digimoncard.com/rule/?card_no=BT11-061), [cardlist Eyesmon](https://world.digimoncard.com/cards/?card_no=EX9-048&search=true). Não reduzir essas quantidades para quatro por uma validação genérica incorreta.

Todos os códigos das 24 listas possuem arquivo de carta em `apps/api/src/cards/<set>/<id>.ts` contendo `registerIrCard`. É uma inspeção estática de presença, **não** prova de fidelidade das regras, completude, decisões do bot ou replay reproduzível. Não foram executados matches, testes de cartas ou auditoria comportamental nesta tarefa documental. O preset continua bloqueado até os gates do plano geral.

Sequência para promover um candidato: revisar elenco/forma e papel; decidir lista integral inspirada ou variante temática; validar legalidade na região/data e imprimir diferenças; auditar cartas e bot; reproduzir vitória/derrota/replay; então versionar e associar ao objetivo da API. Decks do jogador precisam de opções balanceadas por capítulo; não exigir que um iniciante vença uma lista competitiva integral apenas porque o chefe regional era fácil no RPG. Dificuldade pode escolher curadoria temática declarada e política do bot, mantendo snapshot competitivo como referência.

## 7. Composições completas congeladas

IDs e quantidades abaixo são os retornados pela API, não decks montados por suposição. Categorias e nomes preservam a fonte; nomes promocionais longos podem indicar impressão e exigem conferência regional. Cada alteração futura deve gerar hash/revisão novos. Os nomes TS/Titãs/Metal Empire não se tornam participantes canônicos do RPG.

### WMD01 — TS Titamon · lista 124536

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124536). SHA-256: `477bc9a9cb54e64f15485ae20424bb4472d2865cada5dae963fde41344b68983`.

**Ovos (4):** 4 × BT24-007 Tsunomon.

**Digimon (43):** 4 × BT24-042 Goblimon; 2 × BT26-066 Salamon; 2 × BT24-009 Shamanmon; 4 × BT24-021 SnowGoblimon; 2 × BT24-013 Fugamon; 4 × BT24-026 Hyogamon; 2 × BT24-045 Ogremon; 2 × P-250 Ogremon (X Antibody) (Official Store Tournament 2026 Vol. 4 Participant); 3 × BT26-074 Cerberusmon; 1 × BT26-056 Cerberusmon: Werewolf Mode; 4 × BT24-075 SkullBaluchimon; 1 × EX5-062 Anubismon; 1 × BT26-045 GranKuwagamon; 3 × BT26-059 Plutomon; 3 × BT25-084 Titamon; 1 × BT26-047 TyrantKabuterimon; 2 × BT26-079 ZombiePlutomon; 2 × BT24-081 Titamon + SkullBaluchimon.

**Options (7):** 3 × BT26-100 Dark Field; 3 × BT24-098 Invasion of the Titans; 1 × BT6-108 Underworld's Call.

### WMD02 — Titamon Tribal · lista 119373

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/119373). SHA-256: `af002d72b8225718c82fbfb94ae0f614caae029957a614b2abe9c22350ff4a9a`.

**Ovos (4):** 4 × BT24-007 Tsunomon.

**Digimon (43):** 3 × BT24-042 Goblimon; 1 × BT26-066 Salamon; 3 × BT24-009 Shamanmon; 4 × BT24-021 SnowGoblimon; 1 × BT26-069 Dobermon; 2 × BT24-013 Fugamon; 3 × BT24-026 Hyogamon; 3 × BT24-045 Ogremon; 4 × BT26-074 Cerberusmon; 3 × BT26-056 Cerberusmon: Werewolf Mode; 3 × BT24-075 SkullBaluchimon; 2 × BT26-078 Cherubimon; 4 × BT26-059 Plutomon; 3 × BT25-084 Titamon; 2 × BT26-079 ZombiePlutomon; 2 × BT24-081 Titamon + SkullBaluchimon.

**Options (7):** 4 × BT26-100 Dark Field; 3 × BT24-098 Invasion of the Titans.

### WMD03 — Sukamon · lista 125076

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125076). SHA-256: `73f969852d1aecd1c49191455c77aaac9e45a0db86566e19b88356ec71f3fa93`.

**Ovos (4):** 4 × P-246 Motimon (Official Store Tournament 2026 Vol. 4 Participant).

**Digimon (41):** 4 × EX13-027 Chuumon; 4 × EX5-045 Chuumon; 2 × BT11-036 Chuumon; 3 × BT13-065 PlatinumSukamon; 4 × BT11-040 Sukamon; 4 × EX13-028 Sukamon; 2 × BT14-034 Sukamon; 2 × BT14-038 Etemon; 2 × EX5-048 Etemon; 4 × EX13-031 KingSukamon; 1 × BT23-032 Shakkoumon; 4 × EX13-035 KingEtemon; 2 × EX5-054 MetalEtemon; 2 × EX12-057 Takutoumon; 1 × BT20-037 Chaosmon: Valdur Arm.

**Tamers (1):** 1 × EX1-066 Analog Youth.

**Options (8):** 4 × LM-029 Yellow Scramble; 4 × LM-037 Sepia Memory Boost!.

### WMD04 — PrinceMamemon · lista 124378

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124378). SHA-256: `5c7661b155a951aa67eed921c8a9f7abbcec66cf98b49fff0a8d475c83aa9a80`.

**Ovos (4):** 4 × P-246 Motimon (Official Store Tournament 2026 Vol. 4 Participant).

**Digimon (39):** 4 × EX13-050 Bokomon; 4 × EX12-053 Hagurumon; 4 × EX13-046 Kokuwamon; 4 × EX13-053 Thundermon; 4 × EX12-041 Thundermon; 3 × BT8-061 Thundermon; 4 × EX13-059 BigMamemon; 1 × BT8-065 CatchMamemon; 2 × BT11-068 Mamemon; 2 × EX9-018 MetalMamemon; 4 × EX13-063 PrinceMamemon; 2 × BT13-074 PrinceMamemon; 1 × BT15-102 Apocalymon.

**Tamers (5):** 1 × EX1-066 Analog Youth; 2 × P-211 Monica Simmons; 2 × ST15-14 Tai Kamiya.

**Options (6):** 1 × BT6-104 Parabolic Junk; 1 × LM-031 Black Scramble; 1 × LM-061 Punching Training; 2 × LM-054 Treadmill Training; 1 × BT8-106 Senbon Dokkān.

### WMD05 — Puppets · lista 124012

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124012). SHA-256: `e9a92cc0cc606a3cf1eb53d47e23af9f248a64f614bb742e61a7173a61596f68`.

**Ovos (4):** 4 × BT22-002 Kyaromon.

**Digimon (37):** 1 × EX9-024 Hanimon; 4 × EX11-019 Shoemon; 4 × EX7-024 Shoemon; 4 × ST19-03 Shoemon; 4 × EX11-021 Kokeshimon; 2 × BT16-055 Namakemon; 4 × P-165 ShoeShoemon; 4 × EX9-032 Karakurumon; 3 × EX11-022 Karakurumon; 4 × EX11-024 Cendrillmon; 1 × EX9-033 Kaguyamon; 2 × BT22-042 Nyabootmon.

**Tamers (7):** 4 × EX9-067 Mirai Kinosaki; 3 × EX11-061 Mirai Kinosaki.

**Options (6):** 1 × P-105 Physical Training; 4 × P-229 Unique Emblem: Narrative Ronde; 1 × LM-029 Yellow Scramble.

### WMD06 — Metal Empire · lista 124130

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124130). SHA-256: `d363779fc7900ba6ee66e1ccb0e00b57d1550cd1e1d2739cb69035f66d506a51`.

**Ovos (4):** 4 × EX12-003 Kapurimon.

**Digimon (41):** 4 × EX12-053 Hagurumon; 3 × EX12-038 Kokuwamon; 3 × EX12-008 ToyAgumon; 3 × EX12-010 Greymon; 3 × EX12-054 Guardromon; 4 × EX12-041 Thundermon; 3 × EX12-055 Andromon; 3 × EX12-064 Megadramon; 2 × EX12-016 MetalGreymon; 1 × EX9-018 MetalMamemon; 1 × EX11-041 Oblivimon; 2 × EX12-058 HiAndromon; 3 × EX12-059 Machinedramon; 2 × EX12-035 MetalGarurumon; 4 × EX12-060 Chaosdramon.

**Tamers (2):** 2 × EX9-068 Analogman.

**Options (7):** 1 × BT9-103 Kongou; 2 × EX12-072 Metal Empire; 4 × EX12-073 Giant Meat.

### WMD07 — Machinedramon · lista 107987

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/107987). SHA-256: `8556a42b548ebad35ee51b732c374ebf00536bcafc2fe9f45e2d601995b422fa`.

**Ovos (4):** 4 × BT15-006 DemiMeramon.

**Digimon (36):** 3 × BT13-078 Phascomon; 1 × EX8-056 Syakomon; 4 × BT16-082 Ukkomon; 1 × P-123 Ukkomon; 1 × EX9-030 Andromon; 1 × BT21-024 Cyberdramon; 1 × BT18-026 DaiPenmon; 3 × EX9-064 Megadramon; 2 × EX9-011 MetalGreymon; 1 × BT7-013 MetalGreymon; 1 × EX9-018 MetalMamemon; 2 × EX9-043 MetalTyrannomon; 2 × EX8-043 MetalTyrannomon; 1 × BT11-055 MetalTyrannomon; 1 × BT20-052 Oblivimon; 1 × BT22-012 RizeGreymon; 1 × ST12-09 Volcanomon; 2 × BT12-072 Chaosdramon (X Antibody); 3 × EX9-073 Machinedramon; 2 × EX1-073 Machinedramon; 2 × EX12-060 Chaosdramon.

**Tamers (8):** 1 × BT8-094 Digimon Emperor; 4 × BT11-092 Analogman; 3 × EX9-068 Analogman.

**Options (6):** 3 × BT9-102 Attack of the Heavy Mobile Digimon!; 3 × BT15-096 Supreme Connection!.

### WMD08 — Deep Savers · lista 119789

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/119789). SHA-256: `2dffbf5afc02623667739887a0c9c115adbe83a041769d1449616f0348e1eeca`.

**Ovos (4):** 4 × BT22-001 Puyoyomon.

**Digimon (37):** 4 × BT19-017 Sangomon; 4 × BT26-018 Sangomon; 2 × BT21-031 Sangomon; 1 × BT18-023 Lanamon; 4 × P-164 Shellmon; 2 × BT19-019 Shellmon; 2 × BT22-021 Shellmon; 3 × BT19-024 MarineBullmon; 3 × EX12-031 MarineBullmon; 2 × BT24-074 SkullSeadramon; 2 × BT24-030 Neptunemon; 3 × EX11-018 Ryugumon; 2 × BT22-027 Ryugumon; 3 × BT22-028 Ariemon.

**Tamers (7):** 3 × EX11-058 Yao Qinglan; 2 × P-168 Yao Qinglan; 2 × BT19-082 Yao Qinglan.

**Options (6):** 3 × P-104 Mental Training; 3 × BT22-096 Unique Emblem: Poseidia Lagoon.

### WMD09 — Nightmare Soldiers · lista 81537

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/81537). SHA-256: `68a243334c15b31875e0988e23462020341f27bb164258312c96d6611879d037`.

**Ovos (4):** 4 × BT6-006 Tsunomon.

**Digimon (35):** 4 × EX8-057 DemiDevimon; 4 × ST16-03 Gabumon; 1 × ST6-03 Gabumon; 1 × EX5-015 Gabumon (X Antibody); 3 × EX8-059 Devimon; 4 × EX12-024 Garurumon; 1 × EX5-018 Garurumon (X Antibody); 2 × EX8-034 Mammothmon; 3 × EX8-060 Myotismon; 4 × EX12-032 WereGarurumon; 2 × EX8-045 Callismon; 3 × EX8-062 Piedmon; 3 × EX8-064 Boltboutamon.

**Tamers (4):** 4 × EX11-059 Reina Oumi.

**Options (11):** 1 × BT7-107 Calling From the Darkness; 3 × LM-056 Image Training; 1 × EX8-071 Nightmare Soldiers; 3 × EX12-073 Giant Meat; 3 × BT5-107 Revive From the Darkness!.

### WMD10 — Dark Masters · lista 124022

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124022). SHA-256: `3115f05e06b3cd79597a66b1024caef360d0262f7de4a0b18a08026e1f3a3402`.

**Ovos (1):** 1 × EX2-007 Mother D-Reaper.

**Digimon (38):** 3 × BT15-050 Cherrymon; 3 × BT15-062 Gigadramon; 3 × BT15-077 LadyDevimon; 2 × BT15-027 Scorpiomon; 4 × P-216 WaruMonzaemon; 1 × BT16-046 GranKuwagamon; 4 × EX10-035 Machinedramon; 4 × EX10-012 MetalSeadramon; 1 × EX8-026 MetalSeadramon; 4 × EX10-057 Piedmon; 4 × EX10-020 Puppetmon; 1 × BT16-026 Vikemon; 3 × EX10-061 Apocalymon; 1 × BT15-102 Apocalymon.

**Tamers (8):** 2 × BT3-096 Mimi Tachikawa; 4 × BT4-097 Kari Kamiya; 2 × BT8-090 Kari Kamiya.

**Options (4):** 4 × EX10-072 Spiral Mountain.

### WMD11 — Rocks · lista 124736

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124736). SHA-256: `7a138ff841ca515dde65cbfdada9b7df79b03e8faec046927aeda207a6add826`.

**Ovos (4):** 4 × EX8-005 Tumblemon.

**Digimon (33):** 4 × EX11-038 Sunarizamon; 3 × EX10-025 Sunarizamon; 4 × EX8-047 Sunarizamon; 3 × P-215 Icemon; 4 × P-167 Landramon; 1 × EX8-048 Landramon; 2 × EX8-050 Gogmamon; 4 × EX10-032 Proganomon; 1 × EX8-051 Proganomon; 4 × EX11-044 Pyramidimon; 3 × EX10-036 Magneticdramon.

**Tamers (7):** 2 × EX10-063 Close; 2 × EX11-065 Close; 3 × EX8-067 Close.

**Options (10):** 1 × LM-031 Black Scramble; 4 × P-107 Defense Training; 1 × P-039 Black Memory Boost!; 4 × EX10-069 Unique Emblem: Gravel Hearts.

### WMD12 — TS Gear Forest · lista 124579

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124579). SHA-256: `eae0854cefdf30eb9ee2073b76b4dc66933e61c8029ff183817c2f522eadfe47`.

**Ovos (4):** 4 × BT24-004 Wanyamon.

**Digimon (42):** 4 × BT24-031 Elecmon; 4 × BT25-047 Floramon; 2 × BT25-022 Lunamon; 3 × BT9-047 Pomumon; 1 × BT24-043 Tapirmon; 4 × BT24-034 Aegiomon; 4 × BT25-055 Deramon; 4 × BT25-039 Sirenmon; 3 × BT25-077 Bacchusmon; 4 × BT26-032 Ceresmon; 4 × BT25-059 Ceresmon; 1 × BT25-028 Dianamon; 3 × BT26-033 Jupitermon; 1 × BT20-037 Chaosmon: Valdur Arm.

**Tamers (7):** 4 × BT26-090 Kanan Yuki; 1 × BT24-085 Dan Yuki & Kanan Yuki; 2 × BT24-102 Homeros.

**Options (1):** 1 × BT24-094 Central Town: Throne Room.

### WMD13 — Dinomon · lista 118622

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/118622). SHA-256: `a1c91656eb3b2a63aac2d3cfbd22202feed2ec2a6a72a5cb4a1e051b87437191`.

**Ovos (4):** 4 × EX11-001 Koromon.

**Digimon (37):** 4 × EX11-007 Agumon; 3 × EX8-007 Agumon; 3 × BT22-068 Agumon (X Antibody); 4 × EX11-009 Tyrannomon; 2 × EX8-011 Tyrannomon; 2 × BT14-013 Tyrannomon; 4 × P-160 Tyrannomon (X Antibody); 3 × EX11-010 MasterTyrannomon; 2 × EX8-014 MasterTyrannomon; 3 × EX8-043 MetalTyrannomon; 3 × EX11-011 Dinomon; 3 × EX8-016 Dinomon; 1 × P-173 RustTyrannomon.

**Tamers (7):** 3 × EX8-065 Ryutaro Williams; 4 × EX11-056 Ryutaro Williams.

**Options (6):** 2 × LM-030 Green Scramble; 2 × LM-027 Red Scramble; 2 × LM-051 Alexandrite Memory Boost!.

### WMD14 — TS Angels · lista 124581

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124581). SHA-256: `499030e097be7d4e2f7097440878d4985404ee3530b60fc4eb13462b7ce2263b`.

**Ovos (0):** nenhum na composição da fonte.

**Digimon (40):** 3 × P-198 DemiDevimon; 4 × BT24-031 Elecmon; 1 × BT14-033 Patamon; 3 × BT24-033 Salamon; 4 × BT25-034 Angemon; 1 × BT25-082 BlackGatomon; 1 × BT24-058 Blimpmon; 3 × BT25-037 Pegasusmon; 4 × BT26-022 Sorcermon; 2 × BT26-029 Aegiochusmon: Holy; 2 × BT25-040 MagnaAngemon; 4 × BT25-038 Shakkoumon; 3 × BT25-044 Junomon; 1 × BT26-033 Jupitermon; 2 × BT26-081 Mervamon; 2 × BT26-083 Junomon: Hysteric Mode.

**Tamers (3):** 3 × BT24-088 Asuna Shiroki.

**Options (7):** 1 × BT4-104 Blinding Ray; 1 × LM-062 Breathing Training; 2 × LM-029 Yellow Scramble; 3 × BT24-100 In-Between Theater.

### WMD15 — Creepymon · lista 124710

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124710). SHA-256: `cc050d9a7c457b64f24d5ce1b061800209823fe72370200f1f32508a5ef01411`.

**Ovos (4):** 4 × EX10-005 Pagumon.

**Digimon (34):** 4 × BT24-068 DemiDevimon; 4 × EX10-040 DemiDevimon; 2 × P-198 DemiDevimon; 4 × EX10-046 Devimon; 4 × BT24-069 Vilemon; 4 × EX10-049 SkullSatamon; 4 × BT24-073 SkullSatamon; 4 × EX10-009 Creepymon; 4 × BT24-078 Creepymon (X Antibody).

**Tamers (1):** 1 × ST16-14 Matt Ishida.

**Options (15):** 2 × LM-032 Purple Scramble; 3 × P-108 Wisdom Training; 3 × P-040 Purple Memory Boost!; 3 × BT24-096 Seventh Graviton; 4 × P-219 Flame Inferno.

### WMD16 — DATA SQUAD Rosemon · lista 124520

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124520). SHA-256: `02d49876fb015690ff0cad6640453f9993e4f100705310a63683cc16912b7354`.

**Ovos (4):** 4 × BT26-005 Pinamon.

**Digimon (37):** 4 × ST24-04 Agumon; 2 × ST24-12 Falcomon; 1 × ST24-02 Gaomon; 4 × BT26-036 Lalamon; 4 × ST24-09 Sunflowmon; 3 × BT26-039 Sunflowmon; 1 × BT26-076 Crowmon; 2 × BT25-055 Deramon; 4 × ST24-10 Lilamon; 1 × BT26-044 Lilamon; 1 × BT25-057 Monarchlizamon; 3 × BT26-049 Rosemon; 3 × ST24-11 Rosemon; 1 × BT13-060 Rosemon: Burst Mode; 3 × BT26-050 Rosemon: Burst Mode.

**Tamers (10):** 4 × BT26-094 Keenan Crier; 4 × BT26-091 Yoshino Fujieda; 2 × ST24-14 Yoshino Fujieda & Keenan Crier.

**Options (3):** 1 × P-235 Digital Accident Tactics Squad; 2 × ST24-15 DNA Charge.

### WMD17 — ADVENTURE · lista 124669

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124669). SHA-256: `f2f6f216c8ff19df04b27b8bff6d5db8a35b303e951edaa0e6c50cbf80515594`.

**Ovos (4):** 4 × ST21-01 Tsunomon.

**Digimon (39):** 1 × ST20-10 Agumon; 4 × ST20-02 Biyomon; 1 × ST21-10 Gabumon; 4 × ST21-07 Palmon; 2 × ST21-05 Angemon; 4 × ST20-03 Birdramon; 1 × BT21-067 Garurumon; 3 × ST21-08 Togemon; 2 × ST21-09 Lillymon; 2 × ST20-09 MegaKabuterimon; 2 × BT21-061 MetalGreymon; 1 × EX9-019 WereGarurumon: Sagittarius Mode; 2 × ST21-04 Zudomon; 3 × AD1-014 MetalGarurumon; 3 × AD1-004 WarGreymon; 1 × AD1-025 Omnimon; 3 × EX13-077 Omnimon: Merciful Mode.

**Tamers (11):** 3 × AD1-022 Izzy Izumi & Tai Kamiya; 3 × AD1-019 Matt Ishida & T.K. Takaishi; 1 × BT21-102 Tai Kamiya; 4 × EX13-073 Tai Kamiya & Matt Ishida.

### WMD18 — TS Paradise Colosseum · lista 125094

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125094). SHA-256: `9272ec313808b57f9be1f6cdc3e1e8fa513b94190fdbb9b0c74a3970d3a045af`.

**Ovos (4):** 4 × BT25-001 Tokomon.

**Digimon (36):** 4 × BT25-009 Bearmon; 2 × BT25-048 Bearmon; 4 × BT24-043 Tapirmon; 1 × BT25-064 ToyAgumon; 2 × BT24-034 Aegiomon; 4 × BT25-051 Grizzlymon; 2 × BT25-012 Grizzlymon; 1 × BT25-050 Kiwimon; 4 × BT25-016 GrapLeomon; 4 × BT25-054 GreatGrizzlymon; 4 × BT25-058 Callismon; 4 × BT25-020 Marsmon.

**Tamers (5):** 1 × BT24-088 Asuna Shiroki; 1 × BT24-083 Hiroko Sagisaka; 3 × BT24-085 Dan Yuki & Kanan Yuki.

**Options (9):** 1 × BT6-102 Tropical Venom; 3 × BT24-100 In-Between Theater; 1 × BT25-100 Iron Slash; 3 × BT25-095 Paradise Colosseum; 1 × BT8-097 Crimson Blaze.

### WMD19 — TS Central Town · lista 110438

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/110438). SHA-256: `c056697af3e2cdea0a40d7c55e79982df21f7d07d1724820678a69a87ea62e21`.

**Ovos (4):** 4 × BT25-001 Tokomon.

**Digimon (33):** 4 × BT24-031 Elecmon; 4 × BT25-022 Lunamon; 2 × P-197 Patamon; 3 × BT24-034 Aegiomon; 2 × BT25-011 Aquilamon; 3 × BT24-046 Garurumon; 3 × BT24-035 Gatomon; 4 × BT24-037 Silphymon; 3 × BT24-051 Merukimon; 2 × BT26-081 Mervamon; 3 × BT24-041 Minervamon.

**Tamers (10):** 2 × BT24-088 Asuna Shiroki; 3 × BT24-083 Hiroko Sagisaka; 3 × BT24-085 Dan Yuki & Kanan Yuki; 2 × BT24-102 Homeros.

**Options (7):** 2 × BT24-090 Abyss Sanctuary: Throne Room; 2 × BT24-100 In-Between Theater; 2 × BT26-101 Cross Arts; 1 × BT8-097 Crimson Blaze.

### WMD20 — Galacticmon · lista 123986

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/123986). SHA-256: `bb2a35f90eb9f9c375116880ce1e281e2de78780a6dfa4e5bed02bdfb82f13d2`.

**Ovos (4):** 4 × BT21-006 Tsumemon.

**Digimon (37):** 10 × BT11-061 Vemmon; 4 × BT18-060 Vemmon; 3 × BT21-056 Vemmon; 3 × BT18-065 Snatchmon; 3 × BT21-058 Snatchmon; 3 × P-094 Destromon; 3 × BT21-060 Destromon; 4 × EX11-046 Galacticmon; 3 × BT21-062 Galacticmon; 1 × BT15-102 Apocalymon.

**Tamers (6):** 4 × EX11-066 Xeno; 1 × BT18-092 Zenith; 1 × BT21-087 Zenith.

**Options (7):** 1 × BT11-105 Fusionize; 3 × P-244 Unique Emblem: Ragnarok Attainer; 3 × BT21-098 Ragnarok Cannon.

### WMD21 — Imperialdramon (UG) · lista 124532

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/124532). SHA-256: `235b42a7372d0be5b5afaa1c974d6b79bf0f734a85a6ded9ab3d5016e5c34885`.

**Ovos (4):** 4 × BT12-002 DemiVeemon.

**Digimon (37):** 4 × BT12-021 Veemon; 2 × P-117 Veemon; 2 × P-248 Veemon; 4 × BT12-047 Wormmon; 4 × BT12-022 ExVeemon; 1 × BT21-037 Lighdramon; 4 × BT12-050 Stingmon; 1 × ST9-09 Stingmon; 4 × BT16-025 Paildramon; 3 × AD1-011 Paildramon; 2 × ST9-06 Imperialdramon Dragon Mode; 1 × BT16-028 Imperialdramon: Dragon Mode; 3 × AD1-024 Imperialdramon: Fighter Mode; 2 × EX13-076 Imperialdramon: Paladin Mode.

**Tamers (7):** 1 × BT3-093 Davis Motomiya; 4 × BT16-085 Davis Motomiya & Ken Ichijoji; 2 × EX13-070 Davis Motomiya & Ken Ichijoji.

**Options (6):** 1 × ST2-13 Hammer Spark; 3 × LM-058 Parkour Training; 2 × BT17-097 Return to the Primogenitor.

### WMD22 — Blackwargreymon · lista 110135

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/110135). SHA-256: `6b4f8b876bc275a53ff6170fad318dfc011d2ed077f65b316c4d5f4ff6d25a10`.

**Ovos (4):** 4 × EX9-005 Negamon.

**Digimon (44):** 2 × EX9-046 Soundbirdmon; 4 × EX9-047 Eyesmon; 13 × EX9-048 Eyesmon: Scatter Mode; 3 × EX10-008 MetalGreymon; 4 × EX9-054 RareRaremon; 4 × EX9-055 Abbadomon; 3 × EX10-010 BlackWarGreymon; 4 × BT25-076 Ghoulmon; 1 × EX12-019 Nezhamon; 4 × EX9-057 Abbadomon Core; 1 × BT20-102 Omnimon (X Antibody); 1 × BT5-087 Omnimon Zwart.

**Tamers (3):** 1 × EX1-066 Analog Youth; 2 × BT4-096 Izzy Izumi.

**Options (3):** 3 × P-039 Black Memory Boost!.

### WMD23 — Gallantmon · lista 125097

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125097). SHA-256: `62cc61fc8e9d3722a4d7acc31b9cd2287854f6f8f1fc7f5c8e7672784029fcb3`.

**Ovos (4):** 4 × EX13-001 Gigimon.

**Digimon (38):** 4 × EX13-007 Guilmon; 4 × EX2-008 Guilmon; 3 × BT19-007 Guilmon; 4 × EX13-010 Growlmon; 3 × BT19-009 Growlmon; 2 × BT17-010 Growlmon; 4 × AD1-003 WarGrowlmon; 4 × EX13-013 WarGrowlmon; 4 × EX13-015 Gallantmon; 4 × AD1-008 Gallantmon; 2 × EX8-073 Gallantmon (X Antibody).

**Tamers (8):** 3 × BT17-080 Takato Matsuki; 3 × EX13-068 Takato Matsuki; 2 × BT12-089 Takato Matsuki.

**Options (4):** 1 × LM-059 Heat Training; 1 × P-103 Offense Training; 1 × LM-057 Wall Training; 1 × BT8-097 Crimson Blaze.

### WMD24 — UlforceVeedramon · lista 125070

Fonte: [DigiLab](https://digimon.digilab.cards/decklist/125070). SHA-256: `bc248132560aeeee1b42f5c024bfefcdfe155dc7243d06b504ed03cad3493a90`.

**Ovos (4):** 4 × EX13-002 DemiVeemon.

**Digimon (33):** 4 × BT11-023 Veemon; 4 × EX13-017 Veemon; 2 × EX1-013 Veemon; 1 × ST8-04 Veemon; 4 × EX13-019 Veedramon; 4 × P-138 Veedramon; 1 × BT22-022 Veedramon; 4 × EX13-022 AeroVeedramon; 3 × BT22-023 AeroVeedramon; 4 × EX13-023 UlforceVeedramon; 2 × BT12-029 UlforceVeedramon (X Antibody).

**Tamers (9):** 4 × BT11-112 Rina Shinomiya; 4 × EX13-069 Rina Shinomiya; 1 × BT22-085 Rina Shinomiya.

**Options (8):** 1 × ST2-13 Hammer Spark; 1 × EX1-068 Ice Wall!; 2 × LM-028 Blue Scramble; 1 × LM-056 Image Training; 1 × P-104 Mental Training; 1 × LM-058 Parkour Training; 1 × LM-057 Wall Training.

## 8. Próximas tarefas sequenciadas

1. Revisar as correlações por presença e promover cada uma a núcleo, suporte ou grupo parcial com justificativa humana. Fechar primeiro quatro Ogremon, Machinedramon/MetalGreymon/Megadramon, Mamemon/MetalMamemon, Tyrannomon e Galacticmon. Não substituir oponentes por nomes de arquétipo.
2. Procurar listas adicionais para lacunas: Monzaemon, Numemon, Giromon, Tekkamon, SkullGreymon, Meramon e os grupos de World 2; preferir consulta por espécie/variantes de família, não apenas um nome de arquétipo. Revalidar CS HiAndromon e fontes fora dos cinco resultados de cada família.
3. Resolver identidades especiais e legalidade: Chaos Generals/Guardians/NeoCrimson/GAIA ficam bloqueados até decisão de representação; conferir aliases como Scorpiomon/Anomalocarimon e as impressões Virus/X/ACE. Auditar pares banidos e calendário regional das promos.
4. Produzir variantes temáticas somente com lista completa e revisão própria, deixando visível a diferença em relação ao snapshot competitivo. Primeira fatia: Ogremon/Titamon, com grupos originais explicados e progresso/conquistas compartilhando a identidade do evento.
5. Auditar engine e bots por lista, cenários e replay; depois integrar empréstimos e selos de adaptação à biblioteca visual e à progressão autoritativa do plano geral. Sem prêmio adicional por mudar deck/revisão ou refazer a mesma batalha.

Estimativa da curadoria restante desta primeira fatia: 2–4 dias editoriais para revisar prioridades e completar lacunas da seleção; engine/cartas, balanceamento e direitos exigem estimativa após auditoria específica. Não converter presença de módulo em prazo garantido de publicação. Toda implementação continua futura.

Validação documental será consolidada pelo coordenador: listas completas, somas, hashes, IDs das 154 fichas, links locais, formatação e `git diff --check`. Sem código de produto, migração, assets ou testes de comportamento novos.

# Recon map: OpenEvidence (iPhone + web)

Scope: o agente de perguntas e respostas baseadas em evidência científica
(Quick Consult + perguntas de seguimento + citações verificáveis), com a
pesquisa aprofundada (DeepConsult) como segunda fase.
For: módulo dentro do app ImunoChoix, para médicos dermatologistas,
reumatologistas e gastroenterologistas no Brasil.
Date: 2026-10-05

## Antes de tudo: o que muda por ser no Brasil

- **Sem conta própria para estudar.** O OpenEvidence só libera acesso para
  profissionais dos EUA verificados pelo NPI e saiu da União Europeia e do
  Reino Unido em abril de 2026. Este mapa foi feito só com fontes públicas.
  Nenhuma tela foi vista por dentro, então cada "estado" abaixo é inferido
  de reviews, artigos e da página da App Store.
- **Termos de uso: a verificar.** `openevidence.com/terms` bloqueou a leitura
  automática (HTTP 403). Leia você no navegador antes de seguir. Se proibirem
  usar o serviço para construir concorrente, continuamos só com fontes
  públicas, que é o que já foi feito.
- **Regulação (a verificar com advogado/consultor regulatório):** software
  que apoia decisão clínica pode ser enquadrado como Software como
  Dispositivo Médico pela ANVISA (RDC 657/2022). Normas do CFM sobre IA e
  publicidade médica, e a LGPD se o médico digitar dados de paciente.
  Isso não é parecer jurídico.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | App Store listing | https://apps.apple.com/us/app/openevidence/id6612007783 | descrição, novidades da v2.9.30, nota 4,9 (12 mil avaliações), privacidade, grátis com NPI |
| 2 | Google Play listing | https://play.google.com/store/apps/details?id=com.openevidence&hl=en_US | mesma proposta no Android |
| 3 | Análise de produto (Contrary Research) | https://research.contrary.com/company/openevidence | fluxo principal, OpenEvidence 2.0, Visits, CME, modelo de anúncios |
| 4 | Review independente 2026 (fast.io) | https://fast.io/resources/open-evidence-ai-review-2026/ | Quick/Deep Consult, Reasoning Trace, calculadoras, voz, limitações de acurácia, saída da UE/UK |
| 5 | Artigo no J Med Libr Assoc (Philip & Kurian, 2026) | https://pmc.ncbi.nlm.nih.gov/articles/PMC12951846/ | RAG, citações com link, alertas por e-mail, multilíngue |
| 6 | Healio Rheumatology (2025) | https://www.healio.com/news/rheumatology/20250522/openevidence-ai-tool-lowers-the-barrier-to-vast-collection-of-evidencebased-data | uso por reumatologistas, avaliação clareza 3,55/4 e impacto na decisão 1,95/4 |
| 7 | Anúncio: alertas de nova evidência | https://openevidence.com/announcements/new-feature-receive-new-evidence-updates-on-previous-questions | e-mail quando sai evidência nova sobre pergunta antiga |
| 8 | Anúncio: Visits | https://patients.openevidence.com/announcements/visits-real-time-medical-intelligence | transcrição de consulta (fora do escopo desta fase) |
| 9 | Guia de biblioteca (Mount Sinai) | https://libguides.mssm.edu/ai/blog/OpenEvidence-as-Learning-Tool | perguntas de seguimento, sugestões relacionadas |
| 10 | Guia WSU | https://tech.medicine.wsu.edu/2025/02/07/openevidence-a-helpful-clinical-tool/ | resposta de 3–4 parágrafos, botão "Show Abstract" por referência |
| 11 | Parcerias de conteúdo (eMarketer) | https://www.emarketer.com/content/openevidence-strikes-content-partnership-deal-with-jama-improve-its-ai-medical-search-platform-doctors- | JAMA + NEJM: conteúdo licenciado, não clonável |
| 12 | Termos de uso | https://www.openevidence.com/terms | **não lido (403), a verificar** |

Faltam, e valeriam muito: vídeos públicos de demonstração (YouTube) para
contar cliques e ver estados de carregamento e erro. Se você assistir um e
me mandar prints, eles entram em `replica/screens/`.

## Core loop

O médico digita uma pergunta clínica em linguagem natural e, em segundos,
recebe uma resposta curta e estruturada em que cada afirmação tem uma citação
numerada que leva ao artigo original; depois continua perguntando na mesma
conversa.

## Screens

Mesmas telas no iPhone e na web; a diferença é o layout (coluna única no
celular, painel lateral de referências na web, inferido).

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Entrada / login | abrir o app sem sessão | entrar | logo, botões de login (e-mail, Google/Apple), link de cadastro | filled, error (credencial inválida) |
| S02 | Cadastro e verificação profissional | S01 → cadastrar | provar que é profissional de saúde | formulário (nome, e-mail, NPI → **CRM + UF** no clone, especialidade), aviso de verificação | empty, pending (em verificação), approved, rejected |
| S03 | Início / nova pergunta | após login, botão "nova pergunta" | ponto de partida do fluxo principal | caixa de pergunta grande, botão enviar, microfone (modo voz), seletor de modo (rápida / aprofundada), exemplos de perguntas | empty (exemplos), typing, offline |
| S04 | Resposta | enviar em S03 | entregar a resposta com evidência | texto em streaming com citações inline [1][2], selo de força da evidência (EvidenceGrade), lista de referências, sugestões de pergunta relacionada, caixa de seguimento, aviso "não substitui julgamento clínico", curtir/não curtir, compartilhar | loading (streaming), filled, evidência insuficiente (recusa em responder), error, timeout |
| S05 | Referência expandida | tocar numa citação ou em "Show Abstract" | verificar a fonte | título, periódico, ano, tipo de estudo, resumo (abstract), link DOI/PubMed | collapsed, expanded, abstract indisponível |
| S06 | Histórico | menu → histórico | reabrir perguntas antigas | lista de conversas com título e data, busca | empty, filled, loading |
| S07 | Compartilhar resposta | botão compartilhar em S04 | mandar para colega | share sheet nativa / link copiável | filled, link copiado |
| S08 | Pesquisa aprofundada (DeepConsult) | modo "aprofundada" em S03 | revisão longa sobre pergunta complexa | indicador de progresso por etapas, "Reasoning Trace" (como pesou estudos conflitantes), relatório longo com muitas referências | running (minutos), done, error |
| S09 | Perfil e configurações | menu → perfil | conta e preferências | especialidade, idioma, notificações de nova evidência, sair, excluir conta | filled |
| S10 | Calculadoras clínicas | menu → calculadoras | cálculos rápidos | lista + formulário por calculadora | empty, filled, erro de validação |
| S11 | Visits (consulta transcrita) | menu → visits | transcrever consulta e gerar nota | gravação, transcrição, nota | fora do escopo (ver abaixo) |
| S12 | Educação / CME | menu → educação | créditos de educação médica | quizzes, transcript | fora do escopo (ver abaixo) |

## Flows

```
F01 Médico faz uma pergunta clínica e recebe resposta com evidência
    S03 -> S04
    happy path clicks: 2 (tocar na caixa, enviar) + digitação
    edge: evidência inconclusiva (deve dizer isso em vez de inventar),
          pergunta vaga demais (sugerir como especificar),
          pergunta em português sobre literatura em inglês,
          pergunta com nome/dados de paciente (LGPD: avisar e não guardar),
          streaming interrompido por rede ruim no celular,
          pergunta fora da medicina

F02 Pergunta de seguimento na mesma conversa
    S04 (caixa de seguimento ou sugestão relacionada) -> S04
    happy path clicks: 1 (tocar numa sugestão) ou 2 (digitar + enviar)
    edge: seguimento que muda de assunto, conversa muito longa

F03 Verificar de onde veio uma afirmação
    S04 citação [n] -> S05 -> link externo (PubMed / DOI)
    happy path clicks: 2
    edge: artigo sem abstract público, artigo retratado, link quebrado

F04 Reabrir uma pergunta antiga
    S03 menu -> S06 -> S04
    happy path clicks: 2
    edge: histórico vazio, busca sem resultado

F05 Cadastro e verificação profissional
    S01 -> S02 -> (pending) -> S03
    happy path clicks: ~5 + digitação
    edge: CRM inexistente, CRM de outra UF, estudante de medicina,
          especialidade fora das três do ImunoChoix

F06 Pesquisa aprofundada
    S03 (modo aprofundada) -> S08 -> S04/S08 relatório
    happy path clicks: 3
    edge: demora de minutos (app em segundo plano no iPhone), cancelamento

F07 Alerta de nova evidência
    S09 ativar alertas -> (e-mail ou push quando sai estudo novo) -> S04
    happy path clicks: 1 para ativar, 1 para abrir
    edge: excesso de alertas, estudo novo que contradiz a resposta antiga

F08 Compartilhar uma resposta
    S04 -> S07
    happy path clicks: 2
    edge: destinatário sem conta (vê versão pública? decidir)
```

Número a bater no F01: **2 toques** da tela inicial até a resposta.

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Caixa de pergunta | grande (S03), compacta de seguimento (S04) | empty, typing, sending, disabled (offline), voz gravando | S03, S04 |
| Bloco de resposta | rápida, aprofundada | streaming, completo, recusa por evidência insuficiente, erro | S04, S08 |
| Citação inline [n] | — | default, hover/press, ativa | S04, S08 |
| Cartão de referência | compacto, expandido com abstract | collapsed, expanded, sem abstract | S04, S05 |
| Selo de força da evidência | alta, moderada, baixa, muito baixa (inferido) | — | S04, S05 |
| Chip de pergunta relacionada | — | default, pressed | S03, S04 |
| Aviso clínico (disclaimer) | rodapé, banner | — | S04, S08 |
| Barra de ações da resposta | copiar, compartilhar, curtir, não curtir | default, feito | S04 |
| Item de histórico | — | default, selecionado | S06 |
| Indicador de progresso por etapas | — | etapa n de m, concluído, erro | S08 |
| Menu / navegação | aba inferior (iPhone), barra lateral (web) | — | todas |
| Botão | primário, secundário, fantasma, perigo | default, hover, focus, disabled, loading | todas |
| Toast | sucesso, erro | — | S04, S07, S09 |

## Inferred data model

```
User           id, nome, email, crm, crm_uf, especialidade
               (dermato | reumato | gastro | outra), status_verificacao
               (pendente | aprovado | recusado), idioma, alertas_ativos
               evidence: S02 (NPI no original), App Store privacy labels (nome, e-mail, user ID)
               confidence: high (campos de conta); crm/uf é adaptação para o Brasil

Conversation   id, user_id, titulo, modo (rapida | aprofundada), created_at, updated_at
               evidence: S06 histórico, perguntas de seguimento (fontes 9, 10)
               confidence: high

Message        id, conversation_id, papel (pergunta | resposta), texto,
               status (streaming | completa | recusada | erro), modelo, created_at
               evidence: S04, recusa quando a evidência é inconclusiva (fonte 3)
               confidence: high

Citation       id, message_id, numero ([n]), source_id, trecho_suportado
               evidence: citações inline numeradas (fontes 4, 10)
               confidence: high (existência); trecho_suportado é guess

Source         id, pmid, doi, titulo, periodico, ano, tipo_estudo
               (RCT | metanálise | diretriz | coorte | ...), abstract,
               grau_evidencia, retratado (bool)
               evidence: S05 "Show Abstract", EvidenceGrade (fonte 1)
               confidence: medium

EvidenceAlert  id, user_id, conversation_id, ativo, ultimo_envio
               evidence: fonte 7
               confidence: high

SharedLink     id, conversation_id, token, created_at, revogado
               evidence: S07
               confidence: medium

Feedback       id, message_id, user_id, nota (+1 | -1), comentario
               evidence: guess (padrão do gênero)
               confidence: guess

Por trás (não aparece na tela, mas o fluxo exige):
Chunk          id, source_id, texto, embedding
               evidence: arquitetura RAG citada na fonte 5
               confidence: medium
```

Relationships: User 1-n Conversation, Conversation 1-n Message,
Message 1-n Citation, Citation n-1 Source, Source 1-n Chunk,
Conversation 1-1 EvidenceAlert, Conversation 1-n SharedLink.

## Feature matrix

See `features.csv`. Must: 13, should: 9, could: 6, skip: 6.

## Out of scope (cannot or should not be cloned)

- **Conteúdo licenciado** (texto completo de NEJM, JAMA, Nature, NCCN,
  Cochrane e outros): são contratos deles. O clone usa fontes abertas com
  API oficial (PubMed/E-utilities, PubMed Central Open Access, Europe PMC,
  ClinicalTrials.gov, openFDA) e diretrizes cujo uso você autorizar
  (SBD, SBR, FBG etc. exigem permissão).
- **O modelo de IA treinado por eles.** O clone usa um modelo geral via API
  com RAG nas fontes acima.
- **Verificação por NPI**: é dos EUA. Substituída por CRM + UF.
- **Créditos de CME/MOC**: dependem de acreditação americana (AMA PRA).
- **Anúncios farmacêuticos** como modelo de receita: decisão de negócio sua,
  e no Brasil tem regras próprias de publicidade de medicamentos.
- **Visits** (transcrição de consulta + codificação CPT): outro produto,
  com dados de paciente e LGPD pesada. Fica para depois, se quiser.

## Size

Screens 10 no escopo (S01–S10), flows 8, entities 8 (+ índice de busca).
Hard parts:
1. **Qualidade do RAG médico**: buscar os artigos certos, citar só o que o
   artigo realmente diz, e recusar quando a evidência não basta.
2. **Pergunta em português, literatura em inglês**, com resposta em
   português sem perder precisão de termos.
3. **Regulação e responsabilidade**: ANVISA (SaMD), CFM, LGPD; avaliação
   de segurança antes de liberar para médicos.

Size: **L** (um trimestre) para o agente de perguntas com citações dentro
do ImunoChoix, com qualidade para uso clínico. Um protótipo interno só do
F01–F03 (sem verificação de CRM, sem DeepConsult) é **M** (algumas semanas).
Sem promessa de igualar o original: o diferencial dele é conteúdo licenciado
que o clone não terá.

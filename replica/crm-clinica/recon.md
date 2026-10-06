# Recon map: Pipedrive (web, com uso no celular) → CRM + Caixa da clínica

Scope: duas partes do Pipedrive adaptadas para consultório: (1) o funil
visual de negócios (pipeline, cards, atividades, responsável, alerta de card
parado) virando **funil de demandas de pacientes** para a equipe; (2) o
recurso de produtos e parcelas (installments) do Pipedrive, que lá é só
previsão de venda, virando um **fluxo de caixa completo**: entradas por
dinheiro, PIX, débito e crédito parcelado (com a agenda de recebíveis dos
meses seguintes e as taxas da maquininha), saídas, saldo real e projetado.
For: uso próprio — clínica de dermatologia do Dr. Fernando (equipe de
recepção/secretaria + médico), Brasil, em reais. Não é produto para vender
(por enquanto).
Date: 2026-10-06

## Antes de tudo

- **O Pipedrive não resolve o problema principal.** Ele é um CRM de vendas.
  As parcelas dele servem para prever o valor de um negócio
  ([KB: recurring products/installments](https://support.pipedrive.com/en/article/recurring-products)):
  até 36 parcelas por negócio, só nos planos Growth para cima, sem taxa de
  cartão, sem data real de crédito na conta, sem saídas, sem saldo bancário,
  sem fechamento de caixa. Do Pipedrive copiamos o **jeito de trabalhar**
  (funil, cards, atividades). O módulo de caixa é desenho novo, feito para a
  realidade brasileira (maquininha, D+1, D+30 por parcela, MDR, PIX).
- **Fontes só públicas.** Não sei se você tem conta no Pipedrive. Este mapa
  foi feito com a central de ajuda, a documentação pública da API e reviews.
  Se você tiver conta, não precisamos dela.
- **Dados de saúde (LGPD, art. 11).** Nome, telefone e "quer fazer botox" de
  um paciente já são dados pessoais sensíveis. O clone precisa de login por
  pessoa, permissão por papel (a recepção não vê o financeiro, por exemplo),
  registro de quem mexeu em quê, e servidor com backup. **Não guardar
  prontuário/diagnóstico aqui** (ver "Fora do escopo"). Não é parecer
  jurídico.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | KB: recurring products e installments | https://support.pipedrive.com/en/article/recurring-products | parcelas: descrição, data, valor; até 36; ACV/TCV; plano Growth+ |
| 2 | Página de recurso: receita recorrente | https://www.pipedrive.com/features/recurring-revenue | MRR/ARR/ACV/TCV, previsão por produto |
| 3 | API pública v1 (referência) | https://developers.pipedrive.com/docs/api/v1 | entidades: Deals, Persons, Organizations, Activities, Pipelines, Stages, Products, Notes, Files, Leads, Users, Deal Installments, Filters, Goals, Webhooks |
| 4 | KB: Activities | https://support.pipedrive.com/en/article/activities | atividades (ligação, reunião, tarefa, e-mail) ligadas a pessoa/negócio |
| 5 | KB: Workflow automation | https://support.pipedrive.com/en/article/workflow-automation | gatilho (criar/editar/data) → ação (criar atividade, mudar campo, e-mail) |
| 6 | KB: Rotting | https://support.pipedrive.com/en/article/the-rotting-feature | card fica vermelho depois de N dias parado, por etapa |
| 7 | KB: Lost reasons | https://support.pipedrive.com/en/article/lost-reasons | motivo de perda livre ou de lista fixa (até 100) |
| 8 | KB: Insights dashboards | https://support.pipedrive.com/en/article/insights-dashboards | painel com até 25 relatórios, compartilhável |
| 9 | Review 2026 (crm.org) | https://crm.org/news/pipedrive-crm-review | visões kanban, lista e previsão; calendário; assistente de IA |
| 10 | Breakdown de features (ZoomInfo) | https://pipeline.zoominfo.com/sales/pipedrive-features | camada de atividades em cada card, calendário interno |
| 11 | Preços 2026 (zeeg.me) | https://zeeg.me/post/pipedrive-pricing | Lite US$14, Growth US$39, Premium US$59, Ultimate US$79 por usuário/mês |
| 12 | Página oficial de preços | https://www.pipedrive.com/en/pricing | **não lida (403)**; preços acima vêm de terceiros |
| 13 | Termos de uso | https://www.pipedrive.com/en/terms-of-service | não lidos; como não usamos conta, não bloqueiam este trabalho |

Fonte que mais vale daqui para frente: **a rotina real da sua clínica**.
Prints da sua planilha de caixa atual, do extrato da maquininha (Stone,
Cielo, Rede, PagBank, InfinitePay…) e de como a recepção anota as demandas
hoje entram em `replica/crm-clinica/screens/` e definem o resto.

## Core loop

Dois loops, ligados pelo momento em que o paciente paga:

1. **Demandas:** toda demanda de paciente (orçamento de procedimento,
   retorno, resultado de exame, receita, reclamação) vira um card com
   responsável e próxima atividade, anda pelas etapas do funil, e nada fica
   esquecido porque o card parado fica vermelho.
2. **Caixa:** todo dinheiro que entra ou sai é lançado com forma de
   pagamento; crédito parcelado gera sozinho as parcelas futuras já com a
   taxa e a data em que cai na conta; o painel mostra saldo de hoje, o que
   entrou por forma de pagamento, o que saiu, e quanto vai entrar e sair
   em cada um dos próximos 12 meses.

Ponte: card "ganho" (paciente fechou o procedimento) → abre o lançamento de
recebimento já preenchido com paciente, procedimento e valor.

## Screens

Web responsiva (computador da recepção + celular do médico).

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Login | `/login` | entrar | e-mail + senha, "esqueci a senha" | filled, error, bloqueado (tentativas) |
| S02 | Início (resumo do dia) | `/` após login | o que fazer hoje | minhas atividades de hoje/atrasadas, cards parados, saldo do dia (só para quem tem permissão) | empty, filled, sem permissão financeira |
| S03 | Funil (kanban) | menu → Demandas | ver todas as demandas por etapa | seletor de funil, colunas de etapa com total, cards arrastáveis, filtro por responsável, busca, botão "+ demanda" | empty, filled, loading, card parado (vermelho), sem atividade (alerta amarelo), arrastando |
| S04 | Funil (lista) | S03 → alternar visão | filtrar e exportar | tabela com colunas configuráveis, filtros salvos, exportar CSV | empty, filled |
| S05 | Nova demanda | "+ demanda" em S03 / S07 | registrar demanda em 30 s | modal: paciente (busca ou novo), tipo/funil, título, valor estimado, responsável, origem (Instagram, indicação, Google…) | empty, erro de validação, paciente duplicado |
| S06 | Detalhe da demanda | clicar no card | trabalhar a demanda | cabeçalho (etapa clicável, ganho/perdido), linha do tempo (notas, atividades, mudanças), próxima atividade, procedimentos orçados, anexos, botão "registrar pagamento" | filled, ganho, perdido (com motivo), sem atividade agendada |
| S07 | Pacientes (lista) | menu → Pacientes | achar paciente | busca por nome/telefone/CPF, tabela, tags | empty, filled |
| S08 | Ficha do paciente (CRM) | clicar em S07 | histórico comercial do paciente | dados de contato, consentimento LGPD/WhatsApp, demandas abertas e fechadas, pagamentos e parcelas a receber, total gasto | filled, sem demandas |
| S09 | Atividades / agenda da equipe | menu → Atividades | tarefas do dia de cada um | lista e calendário semanal, filtro por pessoa e tipo (ligar, WhatsApp, retorno, tarefa), marcar feito | empty, atrasadas, concluídas |
| S10 | Painel financeiro | menu → Financeiro | clareza completa do dinheiro | saldo por conta (banco, caixa físico, maquininha a receber), entradas x saídas do mês, pizza por forma de pagamento, gráfico de projeção 12 meses, contas vencendo | empty, filled, mês fechado |
| S11 | Lançamentos (extrato) | Financeiro → Lançamentos | ver tudo que entrou e saiu | tabela com data, descrição, paciente/fornecedor, categoria, forma, bruto, taxa, líquido, status (previsto/realizado/conciliado), filtros por período, conta, forma | empty, filled, filtrado |
| S12 | Novo recebimento | "+ entrada" / S06 "registrar pagamento" | lançar pagamento de paciente | paciente, procedimento(s), valor, **pagamentos divididos** (ex.: R$ 500 PIX + R$ 1.500 crédito 3x), maquininha, bandeira, nº de parcelas, prévia das parcelas com taxa e data | empty, prévia de parcelas, erro (soma ≠ total) |
| S13 | Nova despesa | "+ saída" | lançar saída | fornecedor, categoria (aluguel, insumos, folha, impostos, marketing…), valor, vencimento, conta, recorrência (mensal, N vezes), anexo do boleto/nota | empty, recorrente, paga, vencida |
| S14 | Agenda de recebíveis (cartão) | Financeiro → Recebíveis | quanto cai de cartão em cada dia/mês | calendário/lista por data prevista, por maquininha e bandeira, bruto/taxa/líquido, marcar como recebido, simular antecipação | empty, filled, atrasado (não caiu na data) |
| S15 | Contas a pagar | Financeiro → A pagar | o que vence | lista por vencimento, marcar pago, vencidas em vermelho | empty, vencidas, pagas |
| S16 | Fluxo de caixa projetado | Financeiro → Projeção | olhar à frente | tabela mês a mês (12 meses): saldo inicial, entradas previstas por forma, saídas previstas, saldo final; dia a dia no mês corrente | filled, saldo negativo previsto (alerta) |
| S17 | Fechamento de caixa do dia | Financeiro → Fechar caixa | conferir a gaveta e as maquininhas | esperado x contado em dinheiro, total por maquininha x comprovante, diferença, observação, assinatura de quem fechou | aberto, conferido, com diferença, fechado (travado) |
| S18 | Conciliação bancária | Financeiro → Conciliar | bater com o banco | importar extrato OFX/CSV, sugestões de par (lançamento ↔ linha do banco), aceitar/criar/ignorar | empty, sugestões, conciliado |
| S19 | Relatórios | menu → Relatórios | entender o negócio | DRE simplificado, receita por procedimento, por origem do paciente, por forma de pagamento, taxa média paga à maquininha, conversão do funil, motivos de perda | filled, período sem dados |
| S20 | Config: funis e etapas | Configurações → Funis | moldar o funil | criar funil, etapas, dias para "parado", ordem | — |
| S21 | Config: financeiro | Configurações → Financeiro | regras do dinheiro | contas (bancos, caixa físico), maquininhas com **taxa por modalidade** (débito, crédito à vista, 2–6x, 7–12x) e prazo (D+1, D+30…), categorias, centros de custo | — |
| S22 | Config: procedimentos | Configurações → Procedimentos | tabela de preços | procedimento, preço, duração, categoria (consulta, estético, cirúrgico) | empty, filled |
| S23 | Config: usuários e permissões | Configurações → Equipe | quem vê o quê | usuários, papel (médico/admin, recepção, financeiro), convite, desativar | — |
| S24 | Config: automações | Configurações → Automações | tirar trabalho da equipe | gatilho → ação (ex.: card entra em "Orçamento enviado" → criar atividade "cobrar resposta" em 3 dias) | empty, ativa, pausada |
| S25 | Log de auditoria | Configurações → Auditoria | LGPD e segurança | quem, quando, o quê (incluindo exclusões e edições de valores) | filled |

## Flows

```
F01 Recepção registra uma nova demanda (ex.: paciente pediu orçamento de laser no WhatsApp)
    S03 -> S05 -> S03
    happy path clicks: 4 (+ demanda, buscar paciente, escolher funil, salvar) + digitação
    edge: paciente não cadastrado (cria inline), paciente duplicado (mesmo telefone), sem responsável

F02 Equipe move a demanda até fechar
    S03 (arrasta card) -> S06 -> marcar "ganho"
    happy path clicks: 2 por etapa
    edge: card parado N dias (vermelho), sem próxima atividade (amarelo), perdido → motivo obrigatório

F03 Paciente paga um procedimento dividido em PIX + crédito 6x
    S06 "registrar pagamento" -> S12 (prévia: 6 parcelas, taxa, datas D+30..D+180) -> salvar
    -> S11 mostra 1 entrada PIX realizada + 6 recebíveis previstos; S14 e S16 atualizam
    happy path clicks: ~6
    edge: soma das formas ≠ total, taxa não configurada para aquela maquininha/parcela,
          parcelamento "sem juros pelo emissor" vs "lojista", estorno/chargeback, desconto

F04 Pagamento em dinheiro e débito no balcão sem demanda (consulta avulsa)
    S12 direto -> salvar
    edge: troco, dinheiro que sai da gaveta para pagar algo (sangria)

F05 Lançar despesa recorrente (aluguel, 12x)
    S13 -> recorrência mensal -> salvar -> S15 e S16 mostram as 12
    edge: valor muda no meio, pagar adiantado, excluir só as futuras

F06 Fechar o caixa do dia
    S17: conferir dinheiro contado x esperado, maquininhas x comprovante -> fechar
    edge: diferença (registrar e justificar), lançamento esquecido depois de fechado (reabrir com log)

F07 Conferir se o cartão caiu
    S14 -> filtra "hoje" -> marcar recebido (ou S18 conciliação via OFX)
    edge: caiu valor diferente (taxa errada), não caiu (atrasado), antecipação feita na maquininha

F08 Médico olha "quanto entra e quanto sai" no celular
    S10 (1 toque) -> S16 para os próximos meses
    happy path clicks: 1–2
    edge: mês com saldo previsto negativo (alerta)

F09 Paciente volta: equipe vê tudo dele
    S07 busca -> S08 (demandas, pagamentos, parcelas a receber)

F10 Automação: retorno pós-procedimento
    card "ganho" em funil Estético -> cria atividade "ligar para pós em 7 dias" e card no funil "Pós-procedimento"
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, ghost, danger | default, hover, focus, disabled, loading | todas |
| Input / Select / Busca com autocomplete | texto, moeda (R$), data, CPF, telefone | empty, focus, error, disabled | S05, S12, S13, configs |
| Kanban board + coluna + card | card normal, parado (vermelho), sem atividade (amarelo), ganho, perdido | default, arrastando, soltando | S03 |
| Tabela de dados | com filtros, colunas configuráveis, total no rodapé | empty, loading, filled | S04, S07, S11, S14, S15, S18 |
| Modal / Drawer | formulário, confirmação | open, salvando, erro | S05, S12, S13 |
| Linha do tempo | nota, atividade, mudança de etapa, pagamento | — | S06, S08 |
| Atividade (item) | ligar, WhatsApp, tarefa, retorno | aberta, atrasada, feita | S02, S06, S09 |
| Divisor de pagamento | 1..n formas, cada uma com parcelas | soma ok, soma ≠ total | S12 |
| Prévia de parcelas | tabela parcela/data/bruto/taxa/líquido | — | S12, S14 |
| Cartão de KPI (stat tile) | valor, variação, sparkline | loading, filled | S02, S10 |
| Gráficos | barras empilhadas (entradas x saídas), linha (saldo projetado), rosca (forma de pagamento) | empty, filled | S10, S16, S19 |
| Calendário | mês, semana | — | S09, S14 |
| Badge de status | previsto, realizado, conciliado, vencido, atrasado | — | S11, S14, S15 |
| Seletor de período | dia, mês, intervalo | — | S10, S11, S16, S19 |
| Toast | sucesso, erro, desfazer | — | todas |
| Navegação | barra lateral (desktop), barra inferior (celular) | ativo, recolhido | todas |

## Inferred data model

Do Pipedrive (API pública, fonte 3) vêm Pipeline, Stage, Deal, Person,
Activity, Note, Product, User. Renomeados para a clínica. O financeiro é
desenho próprio.

```
User          id, nome, email, papel (admin | recepcao | financeiro), ativo
              evidence: API Users, Roles, Permission Sets   confidence: high

Patient       id, nome, telefone, whatsapp, email, cpf (opcional), data_nasc,
              origem (instagram | indicacao | google | ...), tags,
              consentimento_lgpd_em, consentimento_whatsapp
              evidence: API Persons (Pipedrive), adaptado   confidence: high

Pipeline      id, nome (ex.: Novos pacientes, Orçamentos estéticos,
              Pós-procedimento, Pendências da recepção), ordem
Stage         id, pipeline_id, nome, ordem, dias_para_parado (rotting)
              evidence: API Pipelines/Stages, KB Rotting    confidence: high

Demand        id, pipeline_id, stage_id, patient_id, titulo, valor_estimado,
(= Deal)      responsavel_id, status (aberta | ganha | perdida),
              motivo_perda_id, origem, entrou_na_etapa_em, fechada_em
              evidence: API Deals, KB Lost reasons          confidence: high

DemandItem    id, demand_id, procedure_id, qtd, preco, desconto
(= deal product) evidence: API Deal products                confidence: high

Activity      id, tipo, assunto, vence_em, feita_em, responsavel_id,
              demand_id?, patient_id?
              evidence: API Activities, KB Activities       confidence: high

Note / File   id, autor_id, demand_id | patient_id, texto | arquivo
              evidence: API Notes, Files                    confidence: high

Procedure     id, nome, categoria, preco_padrao, ativo
(= Product)   evidence: API Products                        confidence: high

LostReason    id, texto                                     confidence: high
Automation    id, gatilho (json), acao (json), ativa        confidence: medium

--- financeiro (desenho próprio, não existe no Pipedrive) ---

Account       id, nome, tipo (banco | caixa_fisico | maquininha), saldo_inicial
CardTerminal  id, nome (Stone, Cielo...), account_id (onde cai o dinheiro)
FeeRule       id, terminal_id, modalidade (debito | credito_vista |
              credito_parcelado), parcelas_de, parcelas_ate, bandeira?,
              taxa_percent, prazo_dias (1, 30...), por_parcela (bool)
              evidence: prática do mercado BR (MDR e prazo)  confidence: high (conceito), valores = os seus

Category      id, nome, tipo (receita | despesa), grupo_dre
Supplier      id, nome, cnpj_cpf

Transaction   id, tipo (entrada | saida), data_competencia, descricao,
(lançamento)  patient_id?, supplier_id?, demand_id?, category_id,
              valor_total, criado_por, recorrencia_id?
Payment       id, transaction_id, forma (dinheiro | pix | debito | credito |
              boleto | transferencia), terminal_id?, bandeira?, n_parcelas,
              valor_bruto
Installment   id, payment_id, numero (1..n), data_prevista, valor_bruto,
(recebível ou taxa, valor_liquido, status (previsto | realizado | conciliado |
 parcela a pagar) atrasado | estornado), data_realizada, account_id
              → é a tabela que alimenta a projeção mês a mês
Recurrence    id, frequencia, ate / n_vezes
CashClosing   id, data, account_id, esperado, contado, diferenca, obs,
              fechado_por, fechado_em
BankLine      id, account_id, data, valor, descricao, fitid (OFX),
              installment_id? (conciliação)
AuditLog      id, user_id, entidade, entidade_id, acao, antes, depois, em
```

Relationships: Pipeline 1-n Stage 1-n Demand; Patient 1-n Demand;
Demand 1-n DemandItem n-1 Procedure; Demand/Patient 1-n Activity, Note;
Demand 0-1 Transaction; Transaction 1-n Payment 1-n Installment;
CardTerminal 1-n FeeRule; Installment 0-1 BankLine; Account 1-n CashClosing.

Regra-chave (o coração do pedido): **todo dinheiro, à vista ou parcelado,
entrada ou saída, vira linhas de Installment com data prevista e valor
líquido.** Dinheiro e PIX = 1 linha realizada hoje. Débito = 1 linha em
D+1 menos a taxa. Crédito 6x = 6 linhas em D+30, D+60… cada uma com a taxa
daquela modalidade. Despesa recorrente = n linhas de saída. O saldo de hoje
é a soma do realizado; a projeção é a soma do previsto por mês.

## Feature matrix

See `features.csv`. Must: 30, should: 17, could: 11, skip: 6.

## Out of scope (cannot or should not be cloned)

- **Prontuário eletrônico** (anamnese, diagnóstico, evolução, fotos
  clínicas). Tem regras próprias (CFM, certificação SBIS para dispensar
  papel) e não é o problema que você descreveu. O CRM guarda só o lado
  comercial. Se você usa um sistema de prontuário/agenda (iClinic, Feegow,
  Doctoralia…), pensamos em integração depois.
- **Emissão de nota fiscal (NFS-e)** — depende da prefeitura; fica como
  `could` via serviço de emissão com API oficial.
- **Faturamento de convênio (TISS)** — fora, a não ser que você atenda convênio.
- **Open Finance / ler o banco direto** — exige instituição autorizada pelo
  Banco Central. No lugar: importar extrato OFX/CSV (S18).
- **Integração direta com a maquininha** — algumas adquirentes têm API
  oficial; fica como `could`. A agenda de recebíveis é calculada pelas suas
  taxas, e a conferência é pelo extrato.
- **Marketplace, LeadBooster, Campaigns, IA do Pipedrive** — são rede e
  parceiros do Pipedrive, não fazem falta aqui.

## Size

Screens 25, flows 10, entities 21. Hard parts: (1) motor de parcelas e taxas
— crédito parcelado com MDR por faixa, prazo por parcela, estorno,
antecipação, arredondamento de centavos que bata com a maquininha;
(2) conciliação e fechamento de caixa que a equipe realmente use todo dia;
(3) permissões e trilha de auditoria (dados de saúde + dinheiro).
Size: **M** para o essencial (funil + caixa + parcelas + projeção, só
`must`: algumas semanas), **L** com conciliação OFX, automações e relatórios.

## Perguntas abertas (respostas mudam o desenho)

1. Quantas pessoas usam e com que papéis? (ex.: 2 recepcionistas, 1 financeiro, você)
2. Quais maquininhas, e você tem a tabela de taxas de cada uma?
3. Hoje vocês usam algum sistema de agenda/prontuário? Qual?
4. Atende convênio ou só particular?
5. Um CNPJ ou mais (ex.: PF + PJ, ou duas clínicas)?
6. Faz antecipação de recebíveis na maquininha?

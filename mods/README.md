# Mods do Claude Code

Três mods do guia "Claude Code Mods" (OpusJake), feitos para este repositório, e as instruções para os samples da Anthropic.

| Mod | Comandos | O que faz |
| --- | --- | --- |
| `saver` | `/saver`, `/saver on`, `/saver off` | Manda pedidos fáceis para o Claude Haiku 5.5 e mostra uma faixa acima do prompt com o modelo da última resposta e quanto você economizou hoje. |
| `dashboard` | `/painel` | Painel com 3 abas: To-do, Inbox (e-mails das últimas 24h esperando resposta, pelo conector do Gmail) e Today (agenda do dia, pelo conector do Google Calendar). Faixa acima do prompt: "3 to-dos · 2 to answer · next: 14:00 Reunião". |
| `team-room` | `/team`, `/standup` | Painel "Team" com todas as mensagens entre esta sessão e as outras, e `/standup` que pede um update de uma linha a cada sessão. |

Precisa do Claude Code 2.1.287 ou mais novo (`claude --version`; atualize com `claude update`).

## Instalar no seu computador

Os mods estão na branch `claude/vigilant-mayer-586jwj`. No terminal:

```bash
git clone https://github.com/tagliarinifernando-tech/Primeiro.git
cd Primeiro
git checkout claude/vigilant-mayer-586jwj
claude plugin marketplace add ./
claude plugin install saver@primeiro-mods --scope user
claude plugin install dashboard@primeiro-mods --scope user
claude plugin install team-room@primeiro-mods --scope user
```

Depois que a branch for mesclada na `main`, dá para instalar direto do GitHub, sem clonar:

```bash
claude plugin marketplace add tagliarinifernando-tech/Primeiro
claude plugin install saver@primeiro-mods --scope user
```

Abra uma sessão nova e rode `/plugin` → aba **Installed** para conferir. `--scope user` faz o mod carregar em todas as suas sessões.

Para testar um mod numa sessão só, sem instalar: `claude --plugin-dir ./mods/saver`.

## Como usar cada um

### saver
- Já começa ligado. A cada prompt ele decide se é fácil (erro de digitação, renomear, formatar, resumo curto, pergunta rápida) ou difícil (planejar, debugar, código novo, muitos passos). Na dúvida, pergunta ao Haiku com uma palavra.
- Fácil vai para o Haiku 5.5, enquanto o contexto tiver menos de 100 mil tokens. Difícil fica no seu modelo principal (troque com `/model`).
- A faixa acima do prompt mostra `saver on · last answer: haiku-5-5 · saved today: $0.0123`. A economia usa os preços de tabela: Haiku $0,10/$0,50, Sonnet $2/$10, Opus $4/$20, Fable $10/$50 por milhão de tokens.
- `/saver off` desliga, `/saver on` liga, `/saver` mostra o estado.
- No plano Pro/Max você não paga por token, mas o Haiku gasta menos do seu limite.

### dashboard (`/painel`)
- O comando é `/painel`, porque `/dashboard` já é um comando do Claude Code.
- **To-do**: digite a tarefa e aperte Enter. Clique na tarefa para marcar como feita (ela some). A lista fica salva entre sessões.
- **Inbox**: e-mails da caixa de entrada das últimas 24h (sem Promoções, Social, Atualizações e Fóruns) cuja última mensagem não é sua.
- **Today**: eventos de hoje da sua agenda.
- Inbox e Today atualizam a cada 10 minutos. Se o conector do Gmail ou do Google Calendar não estiver ligado no Claude Code, a aba mostra uma linha avisando. Para ligar, rode `/mcp` ou peça ao Claude para configurar.

### team-room (`/team`, `/standup`)
1. Abra 3 sessões do Claude Code **na mesma pasta** (3 abas do terminal, ou 3 sessões locais na aba Code do app).
2. Dê nome a cada uma: `/rename prospector`, `/rename outreach`, `/rename manager`.
3. Cole em cada uma o prompt de função do guia (prospector, outreach, manager).
4. Na sessão `manager`, rode `/team` para abrir o painel e `/standup` para pedir o update. As respostas aparecem no painel conforme chegam.
- `/standup ana, bia` pergunta a outras sessões e lembra esses nomes para a próxima vez.
- Standup a cada hora: `/loop 1h /standup`.
- Uma mensagem de outra sessão não aprova nada por você nem muda suas configurações.

## Samples da Anthropic (blast-radius, token-weather)

São mantidos pela Anthropic no repositório `anthropics/claude-code-playground`. Instale de lá para receber as atualizações:

```bash
git clone https://github.com/anthropics/claude-code-playground.git
claude plugin marketplace add ./claude-code-playground/claude-code/mods
claude plugin install blast-radius@claude-code-playground-mods --scope user
claude plugin install token-weather@claude-code-playground-mods --scope user
```

- **blast-radius**: segura comandos arriscados (`rm -rf`, `git reset --hard`, force push, migration), mostra o que eles mudariam e pergunta Proceed ou Cancel.
- **token-weather**: uma "previsão do tempo" do seu contexto, acima do prompt.
- **replay-theater** (opcional): `/replay` mostra, um diff por vez, as edições que o Claude fez no último turno.

## Segurança e botões de desligar

- Um mod roda como você, sem sandbox. Instale só de quem você confia.
- Antes de instalar o mod de outra pessoa: `claude plugin validate ./pasta-do-mod`. Ele mostra o que o mod escuta (`hooks:`) e o que pode fazer (`calls:`), sem rodar nada.
- Para desligar um mod: `/plugin` → **Installed**. Para pular todos numa sessão: `claude --safe-mode`. Para parar todos: `"disableAllHooks": true` em `~/.claude/settings.json`.

## Para desenvolver

Cada mod tem testes em `tests/`. Na pasta do mod:

```bash
claude plugin validate .
claude plugin test .
```

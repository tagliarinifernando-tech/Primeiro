# Análise das skills de edição de vídeo

Duas skills analisadas e instaladas em `.claude/skills/` (MIT, ambas):

| | **edvid** (fillrochaa/edvid) | **remotion-motion-graphics** (haidrrrry/claude-remotion-skill) |
|---|---|---|
| Papel | Pipeline de edição completo: bruto → corte → cor → legendas → trilha → `final.mp4` | Manual de *craft* de motion graphics em Remotion |
| Entrada | Suas gravações (talking head, várias takes) | Ideia/briefing, ou um clipe já pronto |
| Motor | Python (WhisperX, ffmpeg) + template Remotion data-driven | Remotion (React/TS) escrito à mão |
| Força | Corte cirúrgico baseado no áudio, J-cut, nível de voz, cor LOG | Animação que não parece "IA genérica" |
| Tamanho | 25 helpers, 4 referências, 2 templates, UI de preview | SKILL.md + 17 padrões + regras de design |

As duas se complementam: **edvid decide o que fica no vídeo e como soa; a
remotion-motion-graphics decide como os gráficos se movem.**

---

## 1. edvid — como ela edita

### Princípios
- **Duas fases com um portão.** Fase 1 = corte limpo + cor (`cut.mp4`). Só depois
  da sua aprovação vem a Fase 2 (legendas, gráficos, imagens) e a Fase 3 (trilha/SFX).
- **O áudio manda.** Pontos de corte saem das fronteiras de fala e dos silêncios,
  nunca "do olho".
- **Perguntar → confirmar → executar → iterar → registrar.** Nada é cortado antes de
  você aprovar a estratégia em português claro.

### Fase 1 — passo a passo
1. **Inventário**: `ffprobe` em tudo, `transcribe.py` (WhisperX local, sem API key,
   com alinhamento forçado palavra a palavra) → `pack_transcripts.py` gera
   `takes_packed.md`, a transcrição por frases que é a "visão de leitura".
2. **Pré-varredura**: tropeços, repetições, palavras "esticadas" pelo Whisper
   sobre silêncio (escondem falsos inícios). `voice_levels.py` acha trechos
   falados baixo demais (aparte, fim de frase) e sugere `gain_db`.
3. **Cor**: `detect_color.py` descobre sozinho se é Rec.709 (não mexe) ou LOG/HLG
   (aplica expansão medida). Antes de fechar, mostra um *montage* de candidatos no
   mesmo frame para você escolher.
4. **Proposta de corte** em 4–8 frases → espera seu "ok".
5. **EDL** (`edl.json`): lista de trechos `{source, start, end, beat, gain_db}`.
   Bordas vêm de `speech_regions.py` (onset −30 ms, offset +50–80 ms), não do Whisper.
6. **Render** (`render.py`): extrai cada trecho com cor + fades de 30 ms, monta com
   **J-cut** (a voz da próxima take entra 5 frames antes da imagem; a cauda da
   anterior é aparada até 2 frames, limitada pelo silêncio medido), loudnorm −14 LUFS.
7. **Autoavaliação numérica**: `verify_cut.py` checa estalos, palavras cortadas,
   ar morto, frames pretos, clipping e equilíbrio de nível entre takes. Só abre
   imagem nos pontos sinalizados. Máx. 3 loops.
8. Você aprova o `cut.mp4`.

### Fase 2/3 — Reels (shortform.md)
- Template Remotion **dirigido por dados**: tudo é descrito em
  `public/edit-data.json`; o TSX do template não é editado (só `CustomGraphics.tsx`
  para gráficos sob medida).
- Legendas karaokê (6 estilos: karaoke, stacked, scatter…), headline de gancho
  estático nos ~4 s iniciais (sempre 2 linhas), zoom automático/nos cortes,
  flash na transição, estilos "Limpa" e "tela dividida", elemento
  **atrás da pessoa** (matte), imagens ilustrativas (Pexels/Wikimedia), SFX e
  trilha (Treblo, chave opcional).
- A escolha de estilo é feita numa aba "Estilo" da UI de preview, não no chat.

### Regras de ouro que vou seguir
- Nunca cortar dentro de uma palavra; sempre com respiro nas bordas.
- Corrigir take baixa com `gain_db` por trecho, nunca com compressor global.
- `cut.mp4` sempre marcado bt709/tv, senão o Chrome do Remotion re-interpreta a cor.
- Nunca queimar texto com ffmpeg na Fase 2 — só Remotion.
- Transcrição em cache; nunca re-transcrever a mesma fonte.
- Memória em `edit/project.md` a cada sessão.

---

## 2. remotion-motion-graphics — como ela anima

### As 10 regras inegociáveis
1. Nunca interpolação linear — `spring()` ou bezier, sempre com `clamp`.
2. Entradas animam 2–3 propriedades juntas (opacidade + subida + escala).
3. Tudo escalonado (3–6 frames entre elementos).
4. Saídas existem e são mais rápidas que as entradas (~10 vs ~20 frames).
5. Pilha de 5 camadas: fundo mesh → assets → gráficos/texto → grade → grão + vinheta.
6. Toda imagem parada tem Ken Burns; vídeo usa `<OffthreadVideo>`.
7. Elementos parados >2 s "respiram" (micro-movimento senoidal).
8. Todo tempo deriva de `fps` — sem números mágicos.
9. Um único `theme.ts` (cores, easings, springs, fontes).
10. **Render → extrair frames → olhar → corrigir → re-renderizar.** Nunca entregar sem ver.

### Design
- Paleta 60/30/10, **uma** cor-herói por frame (e só ela brilha).
- Tipografia display 600–800, 80–140 px em 1080 de largura; destacar 1 palavra por título.
- Reel de 30 s: HOOK (0–1,5 s, movimento nos 15 primeiros frames) → contexto →
  3–4 batidas (HIT → pausa de 15–20 frames → build) → payoff → CTA.
- Zona segura 9:16: texto crítico nos 75 % centrais.
- Som é 50 % da qualidade: whoosh 2–3 frames **antes** do impacto, trilha ~0,2–0,3
  abaixada sob a voz.

---

## 3. Como isso se aplica ao seu projeto `remotion/`

O projeto atual (vídeo sobre dermatite atópica / upadacitinibe) já segue a ideia do
edvid de forma manual: `data.json` com segmentos, legendas por frame, keywords,
motion graphic e end card. Pontos para melhorar nos próximos vídeos:

- **Corte**: passar a gerar a EDL com `speech_regions.py` + J-cut, em vez de
  segmentos colados ponta a ponta (o edvid mediu ~130 ms de pausa por junção
  nesse tipo de montagem).
- **Nível de voz**: rodar `voice_levels.py` antes de fechar o corte.
- **Motion**: auditar `KeywordStack`/`MotionGraphicsCelula`/`EndCard` contra as 10
  regras (entradas com 3 propriedades, saídas, stagger, grão/vinheta).
- **Verificação**: sempre renderizar stills de checagem antes de entregar.

## 4. Como vamos trabalhar juntos

1. Você coloca o vídeo bruto em `raw/` (ou manda um link — `ingest_url.py` baixa).
2. Eu transcrevo, leio, e te proponho a estratégia de corte.
3. Você aprova → eu renderizo o `cut.mp4` e checo numericamente.
4. Você aprova o corte → escolhemos estilo (legenda, gancho, zoom, trilha).
5. Eu monto a Fase 2 no Remotion, verifico frames e entrego `final.mp4`.

### Pré-requisitos no ambiente
- `ffmpeg`/`ffprobe` (**não instalados neste container ainda**), Python + `uv`
  (ok), Node 18+ (ok, v22), Chromium (ok, em `/opt/pw-browsers`).
- Primeira transcrição baixa os modelos do WhisperX (~1–2 GB).
- Arquivos de vídeo grandes: o container é efêmero, então o bruto precisa chegar
  por link (Drive, YouTube) ou upload a cada sessão; o resultado final eu devolvo
  como arquivo ou commit.

> Observação: você também tem a skill **edvid-cowork** no Claude, que roda a mesma
> edvid no seu próprio PC (pasta EDVideo) — melhor opção para vídeos longos/pesados.

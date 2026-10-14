---
name: assistir-video
description: Assiste a um vídeo (arquivo local ou URL) e entende o que acontece nele — imagem e fala. Extrai frames com timestamp, folhas de contato e transcrição Whisper, depois analisa. Use quando o Fernando disser "assiste esse vídeo", "veja este reel", "o que acontece nesse vídeo", "analisa esse vídeo/concorrente", "resume esse vídeo", "quanto tempo dura o gancho", ou mandar um link/arquivo de vídeo pedindo opinião, resumo, roteiro, cortes ou análise de retenção.
---

# Assistir vídeo

Claude não "toca" vídeo: ele **lê a fala** (transcrição com tempos) e **vê a imagem**
(frames em grade, abertos com a ferramenta Read). Este skill prepara as duas coisas.

## 1. Preparar

```bash
python3 .claude/skills/assistir-video/assistir.py <arquivo-ou-url> [--idioma pt] [--modelo small]
```

Dependências (uma vez por sessão na nuvem): `pip install -U yt-dlp faster-whisper`
(ffmpeg já vem instalado). O primeiro uso baixa o modelo Whisper (~500 MB para `small`).

Opções úteis:
- `--intervalo 0.5`: mais frames, para analisar o gancho ou uma edição rápida em detalhe
- `--modelo medium`: transcrição melhor (mais lenta); `base`/`tiny` para testes rápidos
- `--sem-audio`: só imagem
- `--cena 0.2`: detecta mais cortes (0.4 detecta menos)

Saída em `out/assistir/<nome>/`: `INDICE.md`, `info.json`, `transcricao.txt`,
`transcricao.json` (tempos por palavra), `frames/` e `folhas/` (grades 4x3 com o
timestamp em amarelo; "CENA" marca um corte detectado).

## 2. Assistir (nesta ordem)

1. Ler `INDICE.md`: duração, formato (vertical/horizontal), cortes por minuto.
2. Ler `transcricao.txt` inteiro.
3. Abrir **todas** as folhas em `folhas/` com Read, em ordem. Cada uma cobre ~12 momentos.
4. Para um momento importante (gancho 0–3 s, virada, CTA), abrir o frame individual em
   `frames/` ou reextrair mais de perto:
   `ffmpeg -ss 00:00:01.5 -i video.mp4 -frames:v 1 /tmp/claude-.../scratchpad/x.jpg`
5. Juntar imagem e fala pelo timestamp: o que aparece quando cada frase é dita
   (texto na tela, b-roll, enquadramento, legendas, troca de plano).

## 3. Responder

- Contar o que aconteceu em ordem, com timestamps `[mm:ss]`.
- Separar o que foi **visto/ouvido** do que é **inferência**. Música, tom de voz,
  efeitos sonoros e movimento entre frames não são captados; dizer isso quando importar.
- Para reels: gancho (0–3 s), estrutura, ritmo de cortes, texto na tela, CTA e pontos de
  queda de retenção. Para roteiros, usar os skills de roteiro/loops depois.

## Limitações

- **YouTube bloqueia downloads vindos da nuvem (HTTP 403).** Peça ao Fernando que
  baixe o vídeo no PC (`yt-dlp <url>`) e envie o arquivo, ou coloque-o em `raw/`.
  Instagram e TikTok podem exigir cookies (`--cookies-from-browser` no PC).
- Vídeos longos (> 15 min) geram muitas folhas: abrir primeiro a transcrição e
  depois só as folhas dos trechos relevantes.

# Skill packs

Pacotes de skills importados. As skills em si ficam em `.claude/skills/`; aqui ficam o README
e o guia de projeto original de cada pacote (`project-guide.md`, que era o `CLAUDE.md` do pacote),
guardados como referência.

Todas estas skills **só escrevem prompts**: nunca geram imagem ou vídeo. Você cola o prompt no
gerador que usa.

| Pacote | Comando(s) | O que faz |
|---|---|---|
| [PYNK Studio Shot](studio-shot/) | `/studio-shot` | Foto qualquer do produto → prompt de foto de estúdio limpa, fundo liso |
| [PYNK Product Visuals](product-visuals/) | `/product-visuals` | Produto + cena de referência → prompt de visual cinematográfico (Recreate ou Recompose) |
| [PYNK AI UGC Studio](pynk-ugc-studio/) | `/ugc` | Produto → anúncio UGC de 15s (modelo, cena, roteiro, prompt mestre Seedance) |
| [The Prompt Director](pink-prompt-director/) | `/image-prompter` → `/video-prompter` | Personagem, character sheet e cenário → prompt de vídeo Seedance |
| [The Ad Director](the-ad-director/) | `/ad-assets` → `/ad-director` | Personagem, cena e produto → anúncio cinematográfico dividido em takes, um prompt por take |

Fluxo sugerido para produto: `/studio-shot` (foto limpa) → `/product-visuals` (produto em cena).

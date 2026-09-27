# Higgsfield generation protocol (shared by every skill in this repo)

The skills in `.claude/skills/` were written as prompt-only tools. In this repo they are adapted to
also **generate** the result through the user's connected **Higgsfield** account (`mcp__HIggsfield__*`
tools) — but only through the gate below. Every craft rule of each skill (questions, locked prompt
text, order of steps, QA passes) stays exactly as written; this protocol only replaces the old
"never generate" lock and the "paste it into your generator" hand-off.

## The gate — hard lock, no exceptions

Nothing is ever generated, and no credit is ever spent, without these four steps in this order:

1. **Build the prompt** exactly as the skill says, and show it as the skill says (code block +
   settings table).
2. **Preflight** — in the same turn, silently:
   - call `mcp__HIggsfield__balance` for the current credit balance;
   - call the generation tool with the **exact params you intend to submit** plus `get_cost: true`
     (this submits nothing and costs nothing). For several generations, preflight each one and sum.
3. **Show the generation card** and STOP:

   > **⚡ Gerar agora?**
   >
   > | | |
   > |---|---|
   > | Modelo | `<higgsfield model id>` (<settings>) |
   > | Referências | <what gets attached, in order> |
   > | Seu saldo | **<balance> créditos** |
   > | Custo | **<cost> créditos** |
   > | Saldo depois | <balance − cost> créditos |
   >
   > Responda **ok** para gerar — ou **só o prompt** se prefere rodar por conta própria.

4. **Generate only after an explicit yes** ("ok", "sim", "gera", "pode") given in reply to THAT card.
   - One approval covers exactly the generation(s) and cost on that card. Any change (prompt, model,
     settings, count, references) → new preflight, new card, new approval.
   - A card may bundle several generations (e.g. all scenes of a video) only if it lists each one and
     the total; the approval then covers that list only.
   - Never approve on the user's behalf, never infer approval from earlier messages, never treat
     "go" on a skill's settings table as approval to spend.
   - If cost > balance: say so plainly, do not submit, and offer a cheaper setting or "só o prompt".
   - Leave `use_unlim` unset. If the tool answers with an `unlim_choice`, put that question to the
     user before anything else.

After generating: show the result, then one line: **"Gastou X créditos · saldo agora: Y"** (call
`balance` again for Y). Then the skill's own "Next moves".

On a timeout or unknown outcome, never resubmit: check the job IDs first (`jobs_wait`). A failed or
refused generation is reported honestly; a retry is a new generation and goes through the gate again.

## Model mapping

Always confirm the model's params, aspect ratios and durations with
`mcp__HIggsfield__models_explore` before the first preflight in a session.

| The skill says | Use on Higgsfield | Notes |
|---|---|---|
| GPT Image 2 / GPT-2 / "GPT Image 2.0" | `gpt_image_2` | `quality` low/medium/high, `resolution` 1k/2k/4k. Skill "High · 2K" → `quality: high, resolution: 2k` |
| Nano Banana Pro | search `models_explore` for it | If absent, use `gpt_image_2` and tell the user in one line |
| Seedance / Seedance 2.0 | `seedance_2_5` | Check its durations; 15s UGC may need the nearest allowed value — say so |
| Gemini Omni Flash (Vox scenes) | search `models_explore` for it | If absent, `seedance_2_5` |
| "your preferred image/video platform" | the mapping above | |

Never swap a model silently. If the mapped model differs from what the skill names, the card says so.

## References and attachments

- **Result of an earlier generation** → pass its `job_id` as the media `value`. No download/upload.
- **A photo the user sent** → it must become a Higgsfield `media_id` first:
  - if the file is on disk (e.g. under `/root/.claude/uploads/...`): `media_upload` (filename) →
    `curl -X PUT -H "Content-Type: <content_type>" --data-binary @<file> "<upload_url>"` (expect 200;
    the Content-Type header is part of the signature) → `media_confirm` (type `image`);
  - otherwise call `media_upload_widget` as the only tool in that turn and wait.
- Attachment order in the skill's settings table = order of `medias[]`. Use the roles the model
  declares (`models_explore`), e.g. `image`, `start_image`.
- `@image1…N` tags inside a prompt refer to that same order.

## Language

Talk to the user in the language they write in (Portuguese for this user). Prompts stay in English —
the models follow English best.

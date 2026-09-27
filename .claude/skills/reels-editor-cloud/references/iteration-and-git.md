# Iterating on feedback, and keeping the repo sane

## Expect small rounds, not one big brief

After the first delivery, feedback tends to arrive as short, separate asks across
several turns — remove an element, change a font, nudge a position, refine one
sound, add a background layer. Treat each as its own small loop:

1. Edit the specific component/script/asset the ask actually touches.
2. Re-render **only the affected composition** (`npx remotion render src/index.ts
   <CompId> out/final.mp4 --codec=h264`) — Remotion composition IDs are
   independent, you don't need to touch or re-render a different video in the same
   repo just because you edited a shared component, as long as your change to that
   component preserved the other composition's behavior (see below).
3. Redo the full audio QC pass (loudness/TP/audibility) — it changes a little on
   almost every re-render, don't assume last time's numbers still hold.
4. Recompress and resend (see `environment-workarounds.md` for the size limit).
5. Commit and push.

## Keep shared components parameterized, not forked

`CaptionOverlay`, `KeywordStack`, `EndCard`, and similar components get reused
across every composition in the repo. When a later video wants a different font,
position, or behavior for one of these, **add an optional prop with a default
matching the existing behavior**, rather than either hard-coding the new look (which
silently changes every other composition using the same component) or copy-pasting
a second near-identical component (which means the next bug fix has to happen
twice). This is why the captions/keywords/motion-graphics sections in
`remotion-effects.md` are written the way they are — every one of them was designed
this way from a real case of "the second video needs this different, the first
video is already delivered and approved, don't touch its look."

## Git hygiene

- Commit and push after every code change — an environment hook checks for
  uncommitted/untracked changes and will flag it if you don't.
- Never commit the large binaries: the raw source video, the pre-mix voice/
  ambience `.wav` files, `node_modules/`, and `out/` (rendered videos). Put these
  in `.gitignore` the moment you create them, not after the hook complains.
  Small synthesized SFX files (a few KB to ~100KB) and font `.woff2` files are
  fine to commit — they're source assets like any other.
- Prefer new commits over amending; this environment's guidance elsewhere already
  covers general git safety, nothing special beyond it applies here.

## If the user asks "will you remember this pipeline next time?"

You won't — a new conversation has no memory of this one. What persists is
whatever's committed to the repo (the actual Remotion project, scripts, and data)
and this skill itself, if the user has saved it to their profile. Point them at
both: a fresh session working in the same repo can read the existing
`remotion/src/` code directly instead of rebuilding it, and this skill (if saved)
gives a fresh session the *method* even for a repo that's never seen it before.

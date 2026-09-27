# Remotion effects catalog

All of this assumes segments already have `trimBeforeFrames`, `durationFrames`,
`editedStart/End` from the EDL (see `transcription-and-edl.md`), and that
`trimBefore`/`trimAfter` on `@remotion/media`'s `<Video>` are in **frames of the
composition's own fps**, not the source video's fps or seconds — Remotion converts
internally, you just multiply seconds by the composition fps.

## Reframing to an arbitrary aspect ratio (crop math)

If the source is already the target aspect (e.g. a phone shot natively 1080x1920
for a 9:16 delivery), you don't need any of this — just play it at 1:1. But phone
footage sometimes comes out an unrelated wide aspect (e.g. 2560x1080, from a
messaging-app re-encode or an anamorphic/wide-lens capture), and the user may ask
for either 9:16 *or* 16:9 delivery independent of the source shape. Parameterize
the crop instead of hand-coding one aspect ratio:

```ts
// crop = {sourceWidth, sourceHeight, cropWidth, cropX}
// cropHeight is implied = cropWidth * (compHeight/compWidth); use the full
// source height when cropping down to 16:9 from something already ~16:9-tall,
// or center a narrower vertical slice when cropping 9:16 out of a horizontal frame.
const baseScale = compWidth / cropWidth;
const cropCenterX = cropX + cropWidth / 2;
const sourceCenterY = sourceHeight / 2;

function getCropTransform(punchScale: number, translateXPercent: number) {
  const totalScale = baseScale * punchScale;
  const translateX = compWidth / 2 - cropCenterX * totalScale
                      + compWidth * (translateXPercent / 100);
  const translateY = compHeight / 2 - sourceCenterY * totalScale;
  return {translateX, translateY, totalScale};
}
```
Apply as a single CSS transform on the `<Video>` element, sized to the *source's*
native pixel dimensions, `transformOrigin: '0 0'`:
```
transform: translate(${translateX}px, ${translateY}px) scale(${totalScale})
```
This is a "scale around a fixed point" transform (the point being the crop
window's own center) — punch-in zoom (below) multiplies into `punchScale` and
naturally stays centered on the subject regardless of zoom factor, and switching
the whole video from 9:16 to 16:9 later is just changing `cropWidth`/`cropX`/
`compWidth`/`compHeight`, not touching this function.

If the source needs a rotation correction (`ffprobe`'s `side_data displaymatrix`
shows a non-zero rotation — common on vertically-shot 4K footage), normalize that
in a pre-pass mezzanine with FFmpeg before this crop math, don't try to rotate in
CSS.

## Punch-in, creep zoom, zoom emphasis

Alternate scale by segment parity so no two consecutive segments sit at the same
zoom (100%/118% worked well), with a small alternating horizontal
`translateXPercent` (±2%) layered on top so the reframe doesn't feel perfectly
static. For segments over ~6s, interpolate scale up an extra +2–3% across the
segment's own duration ("creep zoom") so a long static line doesn't go visually
dead. Separately, mark 2–4 segments per video (editorially, by reading the
transcript for the thesis line, a strong claim, or a punchline) as **zoom
emphasis**: override to a fixed ~130% for the whole segment, ignoring the
alternation/creep logic, and pair it with a whoosh SFX at the cut in. Don't
overuse this — 2–4 times per video, never back to back.

## Captions (`CaptionOverlay`)

Give this component optional props with safe defaults matching whatever style you
built it with first (`fontFamily`, `fontWeight`, `fontSize`, `color`, `uppercase`,
`topPercent`) rather than hard-coding — a later video in the same repo asking for a
different font/position (see `iteration-and-git.md`) then doesn't require touching
the first video's look at all, just passing different props at its own call site.

Position: `top: ${topPercent}%` (55% is a reasonable starting default — but
recheck it against your actual punch-in emphasis framing, since a 130% zoom
pushes the chin lower in frame and 55% that cleared the face at rest can land
right on it during emphasis; 70–75% tends to clear even the tightest punch-in).

Word-by-word pop-in mode: when a caption carries a `words[]` array (see
`transcription-and-edl.md`), animate each word's own entrance with a `spring()`
keyed off `frame - word.startFrame` (scale 1.5→1, fade in over ~4 frames) instead
of fading the whole phrase in as one block; fall back to the simple whole-phrase
fade when `words` is absent, so older videos/compositions in the same file that
never got per-word data keep rendering exactly as before.

### Caption micro-craft: emphasis typography, position, and per-word SFX

Three small, cheap details separate a captioned talking-head video that reads as
"produced" from one that reads as "auto-generated subtitles pasted on top." None
of them require new architecture — they're refinements to the same
`CaptionOverlay`/EDL data you already have.

**1. Two typographies, not one.** If every word in the caption shares the same
font, weight, size, and color, nothing stands out — the eye has nowhere to land
and the one phrase you actually want to stick (the diagnosis, the drug name, the
number, the punchline word) reads exactly as important as "e", "só", "que". Give
the EDL/caption data a way to mark specific words within a phrase as emphasized
(reuse the `words[]` array you already build for word-by-word pop-in: add an
`emphasis?: boolean` flag per word, set by the same editorial pass that already
reads the transcript for keyword events), and have `CaptionOverlay` render an
emphasized word in the video's *display*/dynamic font (`theme.dynamicFontFamily`
— the same bold condensed face used for `KeywordStack`) while the rest of the
phrase stays in the base font (`theme.fontFamily`). A color shift (e.g. the
theme's accent/glow color) or a slightly larger size on the emphasized word alone
reinforces the same point but isn't required — the font swap by itself already
does most of the work.

One font-pairing that reads as polished/editorial rather than "just bolder":
an elegant cursive/script serif for the emphasized word against a clean,
plain sans-serif for the rest of the phrase (as opposed to pairing the base
font with a heavier weight of itself, or with the same condensed display font
used for full-word `KeywordStack` call-outs — those read more like a headline
stamp than an in-line accent). When you use a script/cursive pairing like
this, let the emphasized word also run noticeably larger than its neighbors
(not just a different font/color at the same size) — a script word at 1.5–2x
the surrounding sans text, slightly overlapping the line above or below,
reads like a hand-picked magazine pull-quote; the same word at matching size
just reads like a font swap. This works well combined with a title/keyword
card that itself mixes a bold numeral or word with a script word right next
to it (e.g. a big serif "3" beside a script "ajustes") — the contrast is the
technique, in the hook title as much as in the running captions. A script font
loads the same way as the other two (see `environment-workarounds.md`'s Fonts
section) — add it to `theme.ts` as a third `loadFont()` call and a third
family name (e.g. `theme.scriptFontFamily`) rather than hard-coding a font
string at the call site, so a later video can reuse or opt out of it the same
way it already does for `fontFamily`/`dynamicFontFamily`.

Pick emphasis words the same way you already pick
`KeywordStack` keywords (the thesis word, a number, a proper noun, a strong
verb) — don't emphasize more than one or two words per caption phrase or nothing
reads as emphasized anymore.

**2. Position varies, but stays aligned.** Moving the caption block around
between phrases (e.g. alternating a couple of `topPercent` values, or nudging
horizontal alignment) reads as intentional motion-design rather than a static
subtitle bar, and helps the caption dodge whatever's happening in frame at that
moment. But vary it *within a small, deliberate set of positions* — don't
compute an arbitrary/random offset per caption, and don't let captions drift
left/right/centered inconsistently from phrase to phrase, or it reads as
sloppy rather than dynamic. Keep every position choice anchored to the same
practical constraint that governs the single-position default: the safe band is
at or just above the presenter's head, roughly the `topPercent` range that
already clears the tightest punch-in emphasis framing (see above) — moving
within, say, 55–75% by half-steps between phrases gives you variation while
everything stays easy to read at a glance and never drifts down over the face.

**3. A tiny SFX on emphasized words.** Trigger a short click/pop sound (see
`audio-sfx-and-qc.md` for synthesizing one) at the exact `startFrame` of an
emphasized word — the same `sfxEvents` mechanism you already use for cut-point
whooshes, just keyed to a word's timestamp instead of a segment boundary. This
is a detail almost no one bothers with and it noticeably sharpens the sense that
a keyword just "landed." The failure mode is overuse: firing this on every
emphasized word in every caption across the whole video turns a crisp accent
into a distracting tic. Reserve it for the same handful of highest-value words
per video that you'd also promote to a `KeywordStack` call-out or a zoom
emphasis segment — if you're emphasizing typographically more often than that
(which is fine, per point 1), let most of those pop in silently and save the
sound for the ones that matter most.

## Keyword call-outs (`KeywordStack`)

A short, glowing all-caps word (hook keywords, a name/term reveal) popping in with
a quick spring. Same parameterization principle: optional `position` ('center' |
'left' | 'right') and `fontSize` override, default to center/original size. Move
it off-center specifically when the presenter's face sits centered in frame and
a large word directly over the mouth reads as a mistake, not a stylistic choice —
a big word to the side of the face while the mouth stays visible reads
intentional.

## Motion graphics inserts

At least one 3–5s fullscreen insert in the middle of the video (never the hook,
never the CTA) covering something conceptual: a before/after two-column
comparison, a numbered list preview, a simple diagram. Build these as their own
small components taking `localFrame` (i.e. `frame - insert.startFrame`) and drive
every beat inside off that, so the same component works regardless of where in
the timeline you place the insert. Vertically center content with flex
`justifyContent: 'center'` on the *item* group, not a fixed `paddingTop` on the
whole component — a fixed padding designed for a 1920-tall composition looks
wrong the moment you also render the same component inside a 1080-tall 16:9
composition; a header row you want top-aligned regardless of item count should
get its own `marginTop`, separate from the centered item block below it, or two
columns with different item counts will show their headers at different heights.
Hide the normal caption overlay for the insert's duration — it's showing its own
text.

## J-cut (audio leads the cut)

Because the voice track is one continuous concatenated file and the video is cut
into separate `<Sequence>`s per segment, you can fake a J-cut cheaply: delay every
*internal* video cut by a small constant (3 frames / 100ms worked well) relative
to its matching audio cut, without touching the audio at all.

```ts
const JCUT = 3;
function getJCutWindow(segment, i, totalSegments) {
  const from = Math.round(segment.editedStart * fps) + (i > 0 ? JCUT : 0);
  const to   = Math.round(segment.editedEnd   * fps) + (i < totalSegments - 1 ? JCUT : 0);
  const trimBefore = segment.trimBeforeFrames + (i > 0 ? JCUT : 0);
  return {from, durationInFrames: to - from, trimBefore};
}
```
Every internal boundary shifts by the same constant on both sides (segment i's
extended tail and segment i+1's delayed start reference the *same* shifted point),
so there's no cumulative drift across the video and no gap/overlap between
segments. It works because it borrows those extra frames from real footage that
was sitting in the gap you trimmed as silence — verify the gap actually has
`JCUT` frames of headroom left after the padding you already used (`raw_gap_frames
- 2*PAD_frames >= JCUT`) for every cut before committing to one constant, and
lower it (or skip J-cut for that one boundary) if the tightest gap in the video
doesn't have room.

## Light-anchored overlays (anamorphic flare, or anything that should look
attached to a real light source)

Only works cleanly on a **static tripod shot** (verify from the contact sheet —
handheld footage means the "light" moves independently of your crop transform and
this trick won't track it). Find the light's pixel position in the *source*
footage once (open a raw frame, read off the coordinates), then compute where that
point lands on screen every frame using the exact same crop/punch-in transform as
the video itself:

```ts
const flareX = translateX + ANCHOR_SOURCE_X * totalScale;
const flareY = translateY + ANCHOR_SOURCE_Y * totalScale;
```
Render the overlay element at a **fixed pixel size** positioned at
`(flareX, flareY)` with `transform: translate(-50%, -50%)` — don't scale the
overlay's own size by `totalScale`, or it balloons during a 130% punch-in. Position
tracks the zoom/pan; visual size stays constant on screen, matching how a real lens
flare's streak width doesn't change just because you reframed in post. A
horizontal streak (gradient bar, blurred, `mixBlendMode: 'screen'`) plus a small
warm radial "hotspot" circle at the anchor point reads convincingly as an
anamorphic-style flare; add faint red/cyan fringing lines just above/below the main
streak for extra realism if wanted.

## Removing an element the user no longer wants (e.g. an end card)

Just delete its `<Sequence>` and stop referencing its duration constant in the
composition's total `durationInFrames` — don't leave a black gap or reuse the
freed time for anything unless asked. Recompute the fade-to-black window (last
~15 frames) against the *new* true end of the composition.

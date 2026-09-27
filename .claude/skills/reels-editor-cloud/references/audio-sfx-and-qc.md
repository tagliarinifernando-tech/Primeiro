# Synthesizing SFX/ambience and the audio QC pass

No sound-effect library is reachable from this environment (see
`environment-workarounds.md`) — every whoosh, pop, chime, room tone, or crowd
murmur here is synthesized from oscillators and filtered noise with FFmpeg's
`lavfi` sources. That's enough to sound genuinely produced if you shape the
envelope carefully; it sounds cheap if you don't.

## A real FFmpeg bug you will hit: `afade curve=exp` is silent

`afade=t=out:...:curve=exp` produces **silence**, not a smoothly-decaying tail —
confirmed by isolating the filter on a plain tone with nothing else in the chain.
Use `curve=qsin` for fade-ins and `curve=log` for fade-outs instead; both give a
natural-sounding non-linear envelope without this bug. If a synthesized sound
comes out of your pipeline completely silent and every individual `lavfi` source
measures fine on its own, check for `curve=exp` first before suspecting anything
else.

## Envelope and polish patterns that make synthesis sound "produced"

- Short attack (`qsin`, ~5–10ms), longer release (`log`, 100–250ms) — a linear or
  abrupt fade reads as synthetic/clicky regardless of the underlying tone.
- A short `aecho` tail (e.g. `aecho=0.5:0.3:20:0.15` for something snappy,
  `aecho=0.6:0.4:35:0.22` for something with more air) adds a sense of space that a
  bare dry oscillator never has, at almost no cost.
- For a "whoosh": a descending frequency sweep via `aevalsrc` (e.g.
  `0.55*sin(2*PI*(280+1320*exp(-5.5*t))*t)`, i.e. an exponentially-decaying
  instantaneous frequency baked into the phase term) reads far more like a real
  whoosh than filtered noise alone; layer in a little bandpassed noise at low
  weight (~0.2–0.3x) for air texture, not as the main body. Keep it short (~0.2–
  0.25s) for a clean modern "UI swoosh" feel; longer with more noise reads more
  like a wind gust.
- For a "pop"/click: two sine layers (fundamental + a quieter octave above,
  ~0.5x amplitude) with a fast decay reads as a soft mallet tap; a single bare sine
  reads as a beep.
- For a two-tone PA/bell chime: two sine notes (plus a couple of quiet higher
  harmonic partials for a bell timbre, e.g. 2x/3x frequency at ~0.15x/0.08x
  amplitude) with the second note starting ~0.4s after the first (silence-pad +
  concat one note to offset it), `log`-curve decay on both.
- Room tone: brown noise, `highpass`/`lowpass` to a narrow soft band, slow
  `tremolo` (rate ~0.15, depth ~0.25) so it isn't a dead flat hum.
- Crowd murmur (more convincing than flat room tone): 2–3 *separate* noise
  layers, each `bandpass`ed to a different vocal-formant-ish center frequency
  (e.g. 450Hz, 900Hz, 1600Hz) and each with its own independent `tremolo` rate —
  one shared tremolo rate on a single noise source just sounds like one modulated
  drone, not many overlapping distant voices.

## Real ambience vs. synthesized: check before you bother extracting

If the raw footage has speech pauses, it's tempting to lift real room tone from
there instead of synthesizing. Measure it first:
```bash
ffmpeg -i chunk.wav -af "astats=metadata=1" -f null - 2>&1 | grep -E "RMS level"
```
Phones/recording apps often apply aggressive noise gating during quiet passages —
if several independent gap extracts all measure the same suspiciously-quiet digital
floor (e.g. all near -70dB regardless of which gap or how long), that's the gate
talking, not usable room tone. Don't fight it; synthesize instead. (**Don't** add
`reset=1` to `astats` when measuring a whole file for this check — see the
measurement-methodology note below; it will make you think a real recording is
silent when it isn't.)

## Gain-staging synthesized SFX against real speech

Target RMS **-21 to -26dB** for a foreground transition SFX (whoosh/pop/chime
meant to be noticed at a cut), measured on the *isolated* synthesized file:
```bash
ffmpeg -i sfx.wav -af "astats=metadata=1" -f null - 2>&1 | grep -E "RMS level|Peak level"
```
(again, no `reset=1` — see below) then apply a flat `volume=XdB` to land in that
band, checking peak stays comfortably under 0dB. Background beds (ambience,
murmur) should sit much lower, roughly -35 to -40dB RMS — enough to register as
present on quiet listening, never enough to compete with speech. A secondary
"texture" cue placed as scene-setting rather than as a hit (e.g. a distant PA
chime, not synced to any visual event) sits in between, around -30 to -34dB.

### The `astats reset=1` measurement trap

`astats=metadata=1:reset=1` resets its running stats on every processed block and
prints one metadata line per block. If you then pipe through `grep "RMS level" |
head -1` (or `head -2`) to grab "the" reading — a pattern that works fine on a
short, already-trimmed clip (there's only one or a few blocks total, so the first
line *is* representative) — on a long file this instead grabs the stats of just
the first tiny block, which is very often near-silence (a lead-in pause) and wildly
misrepresents the whole file. **Drop `reset=1`** when you want one accumulated
summary over the entire input; only use `reset=1` when you've first trimmed to a
short window (`atrim=start=..:duration=..`) so "the first/only block" and "the
whole thing you care about" are the same span.

## Final loudness/true-peak QC (every render, every re-render)

```bash
ffmpeg -i out.mp4 -af "loudnorm=I=-14:TP=-1.0:LRA=7:print_format=json" -f null -
```
Voice alone normalized to -14 LUFS with -1.5dBTP headroom (see
`transcription-and-edl.md`) routinely tips over 0dBTP once SFX are layered on top in
Remotion — check every time, don't assume a previous pass's headroom was enough
once more SFX events exist. If `input_tp` is above -1.0:
```bash
ffmpeg -i out.mp4 -vn -acodec pcm_s16le audio.wav
ffmpeg -i audio.wav -af "alimiter=limit=0.8:level=disabled" -ar 48000 audio_limited.wav
# re-measure loudnorm on audio_limited.wav; apply a flat volume=XdB nudge to land
# the integrated loudness at -14 LUFS ±1 while keeping TP comfortably under -1.0
ffmpeg -i audio_limited.wav -af "volume=XdB" audio_final.wav
ffmpeg -i out.mp4 -i audio_final.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac \
  -b:a 192k -shortest out_mixed.mp4
```
Always remux with `-c:v copy` — never re-render the video to fix an audio-only
issue.

## Proving SFX are actually audible (don't just eyeball it)

Compare RMS of the mixed track **against the pre-mix voice-only track, at the
exact same timestamp**, not against a different timestamp you picked as a "quiet
reference" — a hand-picked reference point can land on loud speech by
coincidence and produce a nonsensical (even negative) "gain," which tells you
nothing about whether the SFX itself is audible:
```bash
measure() { ffmpeg -i "$1" -af "atrim=start=$2:duration=$3,astats=metadata=1" \
  -f null - 2>&1 | grep "RMS level" | head -1; }
measure mixed.wav   15.34 0.15
measure voice_only.wav 15.34 0.15
```
A +6dB or greater difference at a cut that lands in a natural speech pause is a
clean pass. If the same SFX event instead falls under a motion-graphics insert
where speech keeps going underneath, expect a *smaller* measured gain there —
that's the voice masking it, not a quality regression in the SFX itself; don't
"fix" it by making the SFX louder everywhere just because one placement is
naturally harder to hear over continuous speech.

## Contact sheet for a fast visual check

```bash
ffmpeg -i out.mp4 -vf "fps=1/N,scale=W:H,tile=CxR" -frames:v 1 sheet.png
```
Pick `N` so `duration/N` lands close to (not under) `C*R` — if it's short, the
last row/cells of the grid come out solid black (the tile filter pads with empty
frames rather than erroring), which is harmless but can make you think something's
wrong with the end of the video when it's just a sampling-rate mismatch.

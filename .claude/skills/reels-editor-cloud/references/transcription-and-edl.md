# Transcription and building the EDL

## Running Whisper

```bash
whisper audio.wav --model small --language Portuguese \
  --word_timestamps True --output_format json --output_dir .
```

**`-o` is a silent alias for `--output_dir`.** If it appears anywhere after
`--output_dir` on the same command line, it wins, and your output lands somewhere
you didn't expect instead of erroring — you'll waste time looking for a JSON file
that isn't where you think it is. Just don't use `-o`; spell out `--output_dir`.

## If the user can give you the real script, use it

Whisper's raw output on a noisy recording (airport, crowd, wind) can come back
largely nonsense even though the timing is fine. Before doing any manual
correction, ask if the user has the script they were reading from or intended to
say, and **re-run transcription with it as `--initial_prompt`**:

```bash
whisper audio.wav --model small --language Portuguese --word_timestamps True \
  --output_dir . --initial_prompt "$FULL_SCRIPT_TEXT"
```

This conditions the decoder toward the vocabulary and phrasing in the prompt and
typically fixes the bulk of garbled proper nouns/technical terms by itself. It
won't force the output to match the script verbatim — the model still transcribes
what was actually said, and spoken delivery legitimately drifts from a written
script (people paraphrase live). Compare the *before* and *after* prompt runs word
by word: where both agree on a coherent (if different-from-script) phrase, trust
that as what was actually said; where the output is still nonsensical (words that
don't parse as Portuguese, or a proper noun that isn't a real word), that's a
genuine ASR error — fix it against the script or by asking the user, never guess at
technical/medical/proper-noun content.

A subtler error slips past that same check: ASR sometimes swaps a word for a
*different real word* that's grammatically wrong in context (e.g. "dermatologistas
que trata psoríase" instead of "que tratam" — singular verb, plural subject).
"Does this parse as Portuguese" doesn't catch it, because each individual word
does parse fine; it's the agreement between words (subject-verb number, gender)
that's broken. Once you've built the caption text, do one more pass reading each
caption phrase as a full sentence for grammatical agreement, not just checking
individual words against the script - this is exactly the kind of error a human
proofreader would catch instantly but that's easy to miss word-by-word.

## Corrections: do them as data, not by re-typing the transcript

Build a small ordered list of `(wrong_word_or_phrase, word_count, replacement)`
tuples and apply them to the flat word list before you do anything else with it —
segmentation, captions, and audio cutting all key off word timestamps, so
correcting the *word list* once means every downstream artifact is correct
automatically. A multi-word garbled phrase (ASR sometimes splits or merges words
oddly) still has one correct *time span* — anchor the replacement to the first
matched word and span exactly as many original words as the phrase actually
consumed, using their combined start/end.

Two homophone traps worth knowing in Portuguese ASR specifically: "ce"/"se" sound
identical (`cedeu` can come out mis-split as `se deu`), and everyday connector
words (`ano`/`você`, `pra`/`pro`) get swapped when confidence is low — check the
per-word `probability` field for anything under ~0.5 as your first triage pass.

## Segmenting into cuts

A gap between consecutive word timestamps larger than a threshold (0.4s worked
well) is where a natural cut belongs — it's simultaneously where you drop dead air
and where the visual jump-cut rhythm comes from, so you don't need a separate
"find the cut points" step. Pad each segment's start/end by a few frames (0.1s /
~3 frames at 30fps) so you don't clip the attack or tail of a word.

```python
GAP_THRESHOLD = 0.4
PAD = 0.1
groups, current = [], [words[0]]
for prev, w in zip(words, words[1:]):
    if w["start"] - prev["end"] > GAP_THRESHOLD:
        groups.append(current); current = [w]
    else:
        current.append(w)
groups.append(current)
```

Track, per segment: `sourceStart/sourceEnd` (position in the raw file, padded),
`editedStart/editedEnd` (position in the cut-together timeline — just a running
cursor, since the segments are what survive), `trimBeforeFrames` (`sourceStart *
fps`), and `durationFrames`.

If a later edit needs to **extend the tail of the last segment** past where speech
ends (e.g. the user wants to keep rolling on some silent action after their last
line), just push that one segment's `sourceEnd`/`editedEnd`/`durationFrames`
further out after building the normal EDL — no new captions needed for a silent
extension, and the audio concat step below picks up whatever real ambient audio
sits in that extra span automatically.

## Captions

Chunk each segment's words into short caption phrases (2–5 words), breaking after
punctuation, merging a stray trailing single word back into the previous chunk
*only if* the combined chunk still fits the 5-word cap — otherwise it becomes its
own (short) caption rather than pushing a chunk over the limit.

For each caption chunk, keep the whole-phrase `startFrame`/`endFrame` **and** a
`words: [{text, startFrame, endFrame}]` array with each word's own timing. The
whole-phrase timing lets a simple caption component fade the phrase in as one
unit; the per-word array is what a fancier component uses to pop each word in as
it's spoken (see `CaptionOverlay`'s word-animation mode in
`remotion-effects.md`) — build both from the start even if you only need the
simple version today, since a later "make the captions punchier" request is cheap
to satisfy if the data's already there and expensive to retrofit if it isn't.

Lowercase the caption text and strip trailing punctuation for a clean "sober
authority" caption style; keep the original case/punctuation in the segment's
plain `text` field for your own reading/debugging.

## Cutting and treating the audio to match

Build one `ffmpeg -filter_complex` that does `atrim=start=..:end=..` per segment
(against the source, using each segment's *unpadded-adjusted* `sourceStart/End`)
into labeled nodes, then `concat`s them in order — this reproduces the EDL exactly
in one pass, sample-accurate, rather than cutting N separate files and
concatenating containers (which risks drift). Then:

```bash
ffmpeg -i edited_raw.wav -af \
  "highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,\
loudnorm=I=-14:TP=-1.5:LRA=7" -ar 48000 voice_treated.wav
```
`-1.5` dBTP here, not `-1.0` — see `audio-sfx-and-qc.md` for why you need that
headroom and what the *final* delivered file's target actually is.

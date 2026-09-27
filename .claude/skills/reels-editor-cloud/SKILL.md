---
name: reels-editor-cloud
description: Edit a raw talking-head video (phone/camera footage) into a polished vertical or horizontal Reels/TikTok/Shorts-style video using FFmpeg + Whisper + Remotion, entirely inside a cloud Claude Code session (no device_bash, no Cowork, no local machine access). Use whenever the user hands over raw footage and wants cuts, burned-in captions, SFX, motion graphics, ambience/music, or a reframe to another aspect ratio, in a web/cloud session rather than Cowork. Also use for network errors downloading a raw video, Whisper model, Google Fonts, or Chrome/headless-shell binary in this kind of session; for "edit a video/reel," "add captions/SFX," "make this vertical/horizontal"; or when iterating on a video already produced this way ("move the caption," "the whoosh sounds off," "add ambience"). If a Cowork session with a connected PC/EDVideo folder is available, prefer edvid-cowork instead — this is for when that isn't available.
---

# Reels editor (cloud Claude Code)

This is a from-scratch pipeline for editing one raw talking-head clip into a short
vertical (9:16) or horizontal (16:9) social video, built entirely with local CLI
tools inside an ephemeral cloud container: **FFmpeg** for analysis/audio, **Whisper**
for transcription, and a **Remotion** (React) project for every visual/audio
assembly step (cuts, captions, motion graphics, SFX, color grade, render).

It exists because this environment blocks most direct internet downloads (Google
Drive, Hugging Face, Google Fonts, the Whisper model host, Chrome's own installer)
and has no `device_bash`/Cowork bridge to the user's PC. Everything below is a
workaround discovered by actually hitting each of these walls — read
`references/environment-workarounds.md` before you burn time rediscovering them.

## Before you start: locate or create the project

Check whether the current repo already has a `remotion/` project (look for
`remotion/src/Root.tsx`, `remotion/package.json`). If this is a repo you've
touched before under this skill, **read the existing code first** — the EDL
builder script, theme, and shared components (`CaptionOverlay`, `KeywordStack`,
`EndCard`) are meant to be reused and extended across multiple videos in the same
repo, not rewritten each time. If it's a fresh repo, scaffold it per
`references/environment-workarounds.md`.

## The pipeline, in order

1. **Get the raw file in.** Large files can't be fetched from most hosts. Have the
   user publish it as a GitHub Release asset (web UI, up to 2GB, no git needed) on
   the repo you're working in, then fetch it with the GitHub API + `curl`. Verify
   `sha256sum` against the asset's `digest` before trusting the download. Full
   details, including why creating releases via the API is blocked and what to do
   instead, are in `references/environment-workarounds.md`.

2. **Analyze.** `ffprobe` for resolution/fps/rotation/duration. Extract a 16kHz mono
   WAV for Whisper and, separately, extract a 48kHz WAV from the same source for the
   production audio mix later (don't reuse the 16kHz one — it's too degraded).
   Generate a contact sheet (`fps=1/N,tile=CxR`) to see framing, lighting, and
   whether the shot is a static tripod or handheld — this matters for later steps
   (see `references/remotion-effects.md` on light-anchored overlays).

3. **Transcribe.** Run Whisper with `--word_timestamps True`. If the user can give
   you the actual spoken script, **always re-run with `--initial_prompt` set to
   that script** before doing manual corrections — it fixes most noisy-environment
   ASR errors by itself and is far less error-prone than patching garbled output
   word-by-word. Full command, the `-o`/`--output_dir` alias gotcha, and how to
   reason about corrections you still need to make by hand are in
   `references/transcription-and-edl.md`.

4. **Build the EDL and captions with a Python script**, not by hand. Group words
   into segments by silence gaps, pad each cut, chunk captions into short phrases,
   apply your correction dict, and emit one `data.json` the Remotion side reads.
   This script is the thing you'll re-run every time editorial decisions change, so
   write it once and iterate on it — see `references/transcription-and-edl.md` for
   the exact segmentation/chunking logic and the caption `words[]` array needed for
   word-by-word animation.

5. **Cut and treat the audio** with FFmpeg (trim+concat to the EDL, highpass,
   compressor, loudnorm to -14 LUFS with **-1.5 dBTP headroom**, not -1.0 — you need
   that headroom for the SFX layer you'll add later in Remotion).

6. **Build the Remotion composition.** Segments become `<Sequence>` + `<Video
   trimBefore=.../>` (from `@remotion/media`, frame-accurate). Layer in punch-in
   zoom, caption overlays, keyword call-outs, motion graphics inserts, and SFX
   audio tracks. This is the bulk of the creative work; the full effects catalog
   (punch-in math, zoom emphasis, motion graphics, J-cut, crop math for arbitrary
   aspect ratios, light-anchored overlays like lens flares) is in
   `references/remotion-effects.md` — read it before inventing your own version of
   any of these, the math is already worked out and tested. That file's caption
   section also covers three caption micro-craft rules worth applying by default,
   not just when asked: emphasize one or two words per phrase in a second, bolder
   typography rather than leaving every word the same weight/font; vary caption
   position between a small set of aligned positions (never randomly, never over
   the face); and fire a tiny click/pop SFX on the video's highest-value
   emphasized words specifically (not every emphasized word).

7. **Synthesize SFX and ambience with FFmpeg** — there's no sound library reachable
   from this environment, so every whoosh/pop/chime/ambience bed gets built from
   oscillators and filtered noise. There's a real FFmpeg bug you will hit
   (`afade curve=exp` silently zeroes the audio) and a calibration process for
   making synthesized sound loud enough to register as "there" without sounding
   harsh. See `references/audio-sfx-and-qc.md`.

8. **Render, then run the loudness/true-peak QC pass and prove SFX audibility by
   measurement** — do not skip this even on a "quick" iteration; it almost always
   needs a limiter pass, and the measurement methodology has a subtle trap
   (see `references/audio-sfx-and-qc.md`). Compress the final delivery to fit
   `SendUserFile`'s size limit.

9. **Iterate.** The user will send feedback in small rounds after the first
   delivery (move this, refine that, add ambience, swap an SFX). Treat shared
   Remotion components as a small parameterized library so a tweak for one video
   doesn't visually break another one already delivered in the same repo. Commit
   and push after every code change. See `references/iteration-and-git.md`.

## What "done" looks like

A rendered video within the agreed duration target, burned-in captions that never
sit over the presenter's face, at least one motion graphics insert placed mid-video
(never in the hook or the CTA), loudness at -14 LUFS ±1 with true peak ≤ -1.0 dBTP
measured on the *final* file, and every SFX event proven audible by a same-instant
mixed-vs-dry comparison (not a comparison against some other timestamp you picked by
eye — see why in `references/audio-sfx-and-qc.md`).

## When you're unsure

Ask the user rather than guessing on anything that's genuinely their editorial call
or specific to them as a person: uncertain technical/medical/proper-noun terms in
the transcript, end-card identity details, which aspect ratio they want, and
subjective style calls once you've already made a reasonable first attempt and they
pushed back twice on the same element. Don't ask about things this skill already
gives you a documented, tested default for.

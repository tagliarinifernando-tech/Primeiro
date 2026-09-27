# Environment workarounds

This cloud Claude Code environment sits behind an egress proxy that blocks most
direct internet hosts. You'll hit this wall repeatedly unless you route around it
the same way each time. Diagnose any download failure with:

```bash
curl -sS http://127.0.0.1:46683/__agentproxy/status
```

`recentRelayFailures` names the host and confirms it's a policy block (403), not a
transient network issue. **Don't retry a policy-blocked host with a different tool
— it's blocked by hostname, not by client.** Never disable TLS verification or
unset `HTTPS_PROXY` to work around this.

Known-blocked, by host: `drive.google.com`, `huggingface.co` and its CDN,
`openaipublic.azureedge.net` (Whisper's model host), `fonts.gstatic.com` (Google
Fonts), Chrome's own headless-shell installer host. Known-allowed: `github.com` and
its release-asset CDN (`objects.githubusercontent.com`), `registry.npmjs.org`,
`pypi.org`, `files.pythonhosted.org` — i.e. code registries, not general file
hosting.

## Getting a large raw file (video, model weights) into the container

Direct download from the user's own link almost never works. The reliable path:

1. Ask the user to publish it as a **GitHub Release asset** on the repo you're
   working in — done entirely in their browser, no git required:
   - `https://github.com/<owner>/<repo>/releases/new`
   - Tag: anything new (e.g. `raw-video-2`). Target: the branch you're working on.
   - Drag the file into "Attach binaries" (works up to 2GB), then **Publish
     release**.
   - If the repo has *zero* commits yet, release creation fails with "repository is
     empty" / an invalid `target_commitish` — push one trivial commit (e.g. a
     README) to the working branch first, then have them retry with that branch as
     Target.
2. Fetch it:
   ```
   mcp__github__get_release_by_tag / list_releases  → find the asset's
     browser_download_url and digest (sha256:...)
   curl -sSL "<browser_download_url>" -o file.ext
   sha256sum file.ext   # must match the digest exactly
   ```
   `browser_download_url` points at github.com and redirects through the allowed
   CDN, so plain `curl` works here even though it doesn't for other hosts.
3. **Creating a release via the API is blocked** for this session type — you'll
   get "Creating, editing, or deleting releases is not permitted for this session
   type" (403) if you try `POST /releases` with the session's own token, even
   though the same token can push commits and read releases fine. Don't spend time
   retrying this; it has to be the user, through the web UI, every time.

This same recipe is how you get the Whisper model weights (see below) and how you
send large *outputs* back if `SendUserFile`'s ~30MB cap is a problem for something
other than the final rendered video (which you should just compress — see
`references/audio-sfx-and-qc.md`).

## Whisper model weights

`whisper --model small` tries to download from `openaipublic.azureedge.net`, which
is blocked. Get the official URL and its embedded sha256 straight from the
installed package so you're not guessing:

```bash
grep -A1 '"small"' /usr/local/lib/python3.11/dist-packages/whisper/__init__.py
```

Have the user download that exact URL on their own machine (it's a legitimate
OpenAI URL, safe to hand them) and publish it as a Release asset the same way as
the raw video. Download it here, verify the sha256 in the filename/URL matches,
then place it where the CLI expects its cache **before** running whisper, so it
doesn't try to re-download:

```bash
mkdir -p ~/.cache/whisper
cp small.pt ~/.cache/whisper/small.pt
```

## Sending large files back to the user

`SendUserFile` rejects anything over ~30MB. Compress the final render before
sending, not the master:

```bash
ffmpeg -i out/final.mp4 -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p \
  -c:a aac -b:a 128k out/final_delivery.mp4
```
CRF 25–27 on a talking-head video is visually clean at a fraction of the size;
verify with `stat -c%s` before sending and nudge the CRF up if you're still over
the limit. Keep the full-bitrate master (`out/final.mp4`) in the container in case
the user asks for it — you generally can't hand them anything over ~30MB directly
from here, so say so plainly if they want the uncompressed file rather than
silently sending a degraded one.

## ffmpeg / whisper aren't preinstalled

```bash
apt-get update && apt-get install -y ffmpeg   # the update is required, or several
                                               # packages 404 against a stale index
pip install --break-system-packages -q openai-whisper
```

## Rendering Remotion without internet

`@remotion/renderer` normally downloads a Chrome Headless Shell on first render —
blocked. Point it at the Playwright Chromium already present in this environment
instead, in `remotion.config.ts`:

```ts
import {Config} from '@remotion/cli/config';
Config.setBrowserExecutable(
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
);
Config.setChromiumOpenGlRenderer('swangle');
```
(Path may differ by environment image version — `find /opt/pw-browsers -iname
'*headless_shell*'` if it's not there.)

## Fonts

`@remotion/google-fonts` fetches from `fonts.gstatic.com` at render time —
blocked, and it fails *inside the headless browser*, not as a normal curl error, so
it's easy to misdiagnose as a Remotion bug. Use a self-hosted `@fontsource/<font>`
package instead (served from npm, which is allowed) and load it with
`@remotion/fonts`' low-level `loadFont()`:

```bash
npm install @fontsource/<font-name>
cp node_modules/@fontsource/<font>/files/<font>-latin-<weight>-normal.woff2 public/fonts/
```
```ts
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

loadFont({
  family: 'YourFontName',
  url: staticFile('fonts/<font>-latin-<weight>-normal.woff2'),
  weight: '<weight>',
  unicodeRange:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,' +
    'U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
});
```
The `latin` range above (`U+0000-00FF`) already covers Portuguese/Spanish/French
accents (á é í ó ú â ê ô ã õ ç etc., all in Latin-1 Supplement) — you usually don't
need the `latin-ext` range too, but it's cheap to add for safety if the script has
unusual characters.

Pin `remotion`, `@remotion/cli`, `@remotion/media`, `@remotion/fonts` and any
`@fontsource/*` package to real, currently-published versions — `npm view <pkg>
version` first. A prompt or memory of "the current version" is often stale enough
to 404.

## Scaffolding a fresh Remotion project

```
remotion/
├── remotion.config.ts       (browser executable override, see above)
├── package.json
├── tsconfig.json            ("resolveJsonModule": true — data.json gets imported)
├── public/
│   ├── <raw-video>.mp4/.mov
│   ├── audio/               (derived voice/ambience wavs — gitignore this)
│   ├── sfx/                 (small synthesized .wav files — fine to commit)
│   └── fonts/                (.woff2 files — fine to commit)
└── src/
    ├── index.ts              (registerRoot)
    ├── Root.tsx               (<Composition> per video)
    ├── data.ts / data2.ts …   (typed wrapper around each data.json)
    ├── Main.tsx / Main2.tsx … (one composition per video)
    ├── theme.ts               (shared fonts/colors/glow — see remotion-effects.md)
    ├── segmentTransform.ts, cropTransform.ts  (see remotion-effects.md)
    └── components/            (CaptionOverlay, KeywordStack, EndCard, motion
                                 graphics — shared, parameterized, see
                                 iteration-and-git.md)
```
Register every video as its own `<Composition id="..." component={...} .../>` in
the same `Root.tsx` rather than starting a new Remotion project per video — this is
what lets you share `theme.ts` and the overlay components across videos in one
repo.

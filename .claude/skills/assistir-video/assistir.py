#!/usr/bin/env python3
"""Prepara um vídeo para o Claude "assistir": frames, folhas de contato e transcrição.

Uso:
    python3 assistir.py <url-ou-arquivo> [--out DIR] [--intervalo SEG] [--modelo small]
                        [--idioma pt] [--sem-audio] [--cena 0.3]

Saída (em DIR, padrão out/assistir/<nome>):
    video.mp4          cópia/download do vídeo (máx. 720p)
    info.json          metadados (duração, resolução, fps, título...)
    transcricao.txt    fala com timestamps [mm:ss.s]
    transcricao.json   segmentos com palavras e tempos
    frames/            1 frame a cada N segundos + frames de troca de cena
    folhas/            folhas de contato (grade 4x3) com timestamp em cada quadro
    INDICE.md          resumo de tudo isso, para ler primeiro
"""
import argparse
import json
import math
import re
import shutil
import subprocess
import sys
from pathlib import Path


# YouTube exige um runtime JS; usa node se existir
JS = ["--js-runtimes", "node"] if shutil.which("node") else []


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, text=True, capture_output=True, **kw)


def ts(seg):
    m, s = divmod(seg, 60)
    return f"{int(m):02d}:{s:04.1f}"


def slug(texto):
    texto = re.sub(r"[^\w\-]+", "_", texto, flags=re.UNICODE).strip("_")
    return texto[:60] or "video"


def obter_video(fonte, out):
    out.mkdir(parents=True, exist_ok=True)
    destino = out / "video.mp4"
    meta = {}
    if re.match(r"^https?://", fonte):
        if not shutil.which("yt-dlp"):
            sys.exit("yt-dlp não encontrado: pip install -U yt-dlp")
        r = run(["yt-dlp", "-J", "--no-playlist", *JS, fonte])
        j = json.loads(r.stdout)
        meta = {k: j.get(k) for k in ("title", "uploader", "upload_date", "duration",
                                      "view_count", "like_count", "description", "webpage_url")}
        subprocess.run(["yt-dlp", "--no-playlist", "-f",
                        "bv*[height<=720]+ba/b[height<=720]/b",
                        "--merge-output-format", "mp4", "-o", str(destino), *JS,
                        "--force-overwrites", fonte], check=True)
    else:
        src = Path(fonte).expanduser().resolve()
        if not src.exists():
            sys.exit(f"arquivo não encontrado: {src}")
        meta = {"title": src.stem, "arquivo_original": str(src)}
        if src.suffix.lower() == ".mp4":
            shutil.copy(src, destino)
        else:
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
                            "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac",
                            str(destino)], check=True)
    return destino, meta


def sondar(video):
    r = run(["ffprobe", "-v", "error", "-print_format", "json",
             "-show_format", "-show_streams", str(video)])
    j = json.loads(r.stdout)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), {})
    a = next((s for s in j["streams"] if s["codec_type"] == "audio"), None)
    num, den = (v.get("avg_frame_rate") or "0/1").split("/")
    return {
        "duracao": float(j["format"].get("duration", 0)),
        "largura": v.get("width"),
        "altura": v.get("height"),
        "fps": round(float(num) / float(den), 2) if float(den) else None,
        "tem_audio": a is not None,
    }


def extrair_frames(video, pasta, intervalo, limiar_cena):
    pasta.mkdir(exist_ok=True)
    for f in pasta.glob("*.jpg"):
        f.unlink()
    # frames em intervalo regular
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(video),
                    "-vf", f"fps=1/{intervalo},scale=-2:480", "-q:v", "3",
                    str(pasta / "int_%05d.jpg")], check=True)
    tempos = []
    for i, f in enumerate(sorted(pasta.glob("int_*.jpg"))):
        t = i * intervalo
        novo = pasta / f"t{t:08.2f}.jpg"
        f.rename(novo)
        tempos.append((t, novo, "intervalo"))
    # frames de troca de cena
    r = subprocess.run(["ffmpeg", "-i", str(video), "-vf",
                        f"select='gt(scene,{limiar_cena})',showinfo,scale=-2:480",
                        "-vsync", "vfr", "-q:v", "3", str(pasta / "cena_%05d.jpg")],
                       text=True, capture_output=True)
    pts = [float(m) for m in re.findall(r"pts_time:([\d.]+)", r.stderr)]
    for f, t in zip(sorted(pasta.glob("cena_*.jpg")), pts):
        novo = pasta / f"t{t:08.2f}_cena.jpg"
        f.rename(novo)
        tempos.append((t, novo, "cena"))
    tempos.sort(key=lambda x: x[0])
    return tempos, pts


def folhas_contato(frames, pasta, colunas=4, linhas=3):
    pasta.mkdir(exist_ok=True)
    for f in pasta.glob("*.jpg"):
        f.unlink()
    por_folha = colunas * linhas
    folhas = []
    fonte = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    for n in range(math.ceil(len(frames) / por_folha)):
        grupo = frames[n * por_folha:(n + 1) * por_folha]
        entradas, filtros = [], []
        for i, (t, f, tipo) in enumerate(grupo):
            entradas += ["-i", str(f)]
            rotulo = ts(t) + (" CENA" if tipo == "cena" else "")
            texto = rotulo.replace(":", r"\:")
            fontopt = f"fontfile={fonte}:" if Path(fonte).exists() else ""
            filtros.append(
                f"[{i}:v]scale=360:360:force_original_aspect_ratio=decrease,"
                f"pad=360:360:(ow-iw)/2:(oh-ih)/2:color=black,"
                f"drawtext={fontopt}text='{texto}':x=6:y=6:fontsize=22:"
                f"fontcolor=yellow:box=1:boxcolor=black@0.7[v{i}]")
        # completa a grade com quadros pretos
        faltam = por_folha - len(grupo)
        for j in range(faltam):
            i = len(grupo) + j
            filtros.append(f"color=c=black:s=360x360:d=1[v{i}]")
        layout = "|".join(f"{(k % colunas) * 360}_{(k // colunas) * 360}"
                          for k in range(por_folha))
        filtros.append("".join(f"[v{k}]" for k in range(por_folha)) +
                       f"xstack=inputs={por_folha}:layout={layout}[out]")
        destino = pasta / f"folha_{n + 1:03d}.jpg"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *entradas,
                        "-filter_complex", ";".join(filtros), "-map", "[out]",
                        "-frames:v", "1", "-q:v", "3", str(destino)], check=True)
        folhas.append((destino, grupo[0][0], grupo[-1][0]))
    return folhas


def transcrever(video, out, modelo, idioma):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("faster-whisper ausente (pip install faster-whisper); pulando transcrição")
        return None
    import numpy as np
    # decodifica com ffmpeg (evita depender da versão do PyAV)
    pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(video), "-f", "f32le",
                          "-ac", "1", "-ar", "16000", "-"], check=True,
                         capture_output=True).stdout
    audio = np.frombuffer(pcm, dtype=np.float32)
    m = WhisperModel(modelo, device="cpu", compute_type="int8")
    segs, info = m.transcribe(audio, language=idioma, word_timestamps=True,
                              vad_filter=True)
    dados = {"idioma": info.language, "segmentos": []}
    linhas = []
    for s in segs:
        dados["segmentos"].append({
            "inicio": round(s.start, 2), "fim": round(s.end, 2), "texto": s.text.strip(),
            "palavras": [{"p": w.word.strip(), "i": round(w.start, 2), "f": round(w.end, 2)}
                         for w in (s.words or [])]})
        linhas.append(f"[{ts(s.start)} - {ts(s.end)}] {s.text.strip()}")
    (out / "transcricao.json").write_text(json.dumps(dados, ensure_ascii=False, indent=1))
    (out / "transcricao.txt").write_text("\n".join(linhas) + "\n")
    return dados


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fonte")
    ap.add_argument("--out")
    ap.add_argument("--intervalo", type=float, help="segundos entre frames (padrão automático)")
    ap.add_argument("--cena", type=float, default=0.3, help="limiar de troca de cena (0-1)")
    ap.add_argument("--modelo", default="small", help="modelo Whisper: tiny/base/small/medium")
    ap.add_argument("--idioma", default=None, help="ex.: pt, en (padrão: detectar)")
    ap.add_argument("--sem-audio", action="store_true")
    a = ap.parse_args()

    raiz = Path(__file__).resolve().parents[3]
    if a.out:
        out = Path(a.out)
    else:
        nome = Path(a.fonte).stem if not a.fonte.startswith("http") else "url"
        out = raiz / "out" / "assistir" / slug(nome)
    video, meta = obter_video(a.fonte, out)
    if a.fonte.startswith("http") and not a.out and meta.get("title"):
        novo = out.parent / slug(meta["title"])
        if novo != out:
            if novo.exists():
                shutil.rmtree(novo)
            out.rename(novo)
            out, video = novo, novo / "video.mp4"

    tec = sondar(video)
    dur = tec["duracao"]
    intervalo = a.intervalo or (1 if dur <= 60 else 2 if dur <= 180 else 5 if dur <= 600 else 15)
    print(f"duração {dur:.1f}s, frame a cada {intervalo}s")

    frames, cenas = extrair_frames(video, out / "frames", intervalo, a.cena)
    folhas = folhas_contato(frames, out / "folhas")
    dados = None
    if tec["tem_audio"] and not a.sem_audio:
        print(f"transcrevendo com whisper '{a.modelo}'...")
        dados = transcrever(video, out, a.modelo, a.idioma)

    info = {**meta, **tec, "intervalo_frames": intervalo,
            "trocas_de_cena": [round(t, 2) for t in cenas]}
    (out / "info.json").write_text(json.dumps(info, ensure_ascii=False, indent=1))

    md = [f"# {meta.get('title') or 'vídeo'}", "",
          f"- duração: {ts(dur)} ({dur:.1f}s) · {tec['largura']}x{tec['altura']} · {tec['fps']} fps",
          f"- áudio: {'sim' if tec['tem_audio'] else 'não'}"
          + (f" · idioma detectado: {dados['idioma']}" if dados else ""),
          f"- trocas de cena: {len(cenas)}"
          + (f" (cortes/min: {len(cenas) / (dur / 60):.1f})" if dur else ""),
          f"- frames: {len(frames)} em frames/ · folhas de contato: {len(folhas)} em folhas/", ""]
    if meta.get("uploader"):
        md.insert(2, f"- canal: {meta['uploader']} · {meta.get('webpage_url', '')}")
    md += ["## Folhas de contato", ""]
    md += [f"- {f.relative_to(out)}: {ts(i)} → {ts(fim)}" for f, i, fim in folhas]
    if dados:
        md += ["", "## Transcrição", "", "Ver transcricao.txt (com timestamps)."]
    (out / "INDICE.md").write_text("\n".join(md) + "\n")
    print(f"\npronto: {out}")
    print((out / "INDICE.md").read_text())


if __name__ == "__main__":
    main()

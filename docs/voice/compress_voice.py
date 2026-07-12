"""Trim silence + re-encode voice clips to 32kbps mono MP3, then emit base64 JS map."""
import base64, json, os, subprocess
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
VOICE_DIR = r"D:\GIT\_FUN\wimhoff\docs\voice"

names = ["breatheIn","breatheOut","lastBreath","hold","recoveryIn","recoveryOut",
         "roundComplete","wellDone","getReady","ten","twenty","pause"]

total = 0
data = {}
for name in names:
    src = os.path.join(VOICE_DIR, f"{name}.mp3")
    dst = os.path.join(VOICE_DIR, f"{name}.min.mp3")
    # Trim leading/trailing silence, mono 22.05kHz, 32kbps
    cmd = [FFMPEG, "-y", "-i", src,
           "-af", "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,"
                  "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1,areverse",
           "-ar", "22050", "-ac", "1", "-b:a", "32k", dst]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(name, "FFMPEG ERROR:", r.stderr[-400:])
        raise SystemExit(1)
    size = os.path.getsize(dst)
    total += size
    with open(dst, "rb") as f:
        data[name] = base64.b64encode(f.read()).decode("ascii")
    print(f"{name:14s} {os.path.getsize(src):6d} -> {size:6d} B")

b64_total = sum(len(v) for v in data.values())
print(f"TOTAL min mp3: {total} B, base64: {b64_total} B")
with open(os.path.join(VOICE_DIR, "voice_data.js"), "w") as f:
    f.write("var VOICE_CLIPS = " + json.dumps(data, separators=(',', ':')) + ";\n")
print("wrote voice_data.js")

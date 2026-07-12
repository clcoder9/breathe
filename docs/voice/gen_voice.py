"""Generate female neural TTS voice clips for the breathing app.

Regeneration:  python gen_voice.py  (requires: pip install edge-tts, internet)
Output: D:/GIT/_FUN/wimhoff/docs/voice/*.mp3 + voice_data.js (base64 map)
"""
import asyncio, base64, json, os
import edge_tts

VOICE = "en-US-JennyNeural"
RATE = "-15%"          # calm, slightly slow delivery
OUT_DIR = r"D:\GIT\_FUN\wimhoff\docs\voice"

CLIPS = {
    "breatheIn":    "Breathe in",
    "breatheOut":   "Breathe out",
    "lastBreath":   "Last breath",
    "hold":         "Hold your breath",
    "recoveryIn":   "Breathe in deeply",
    "recoveryOut":  "Let it go",
    "roundComplete":"Round complete",
    "wellDone":     "Well done. Session complete.",
    "getReady":     "Get ready",
    "ten":          "Ten",
    "twenty":       "Twenty",
    "pause":        "Pause",
}

async def gen(name, text):
    path = os.path.join(OUT_DIR, f"{name}.mp3")
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(path)
    return path

async def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    total = 0
    data = {}
    for name, text in CLIPS.items():
        path = await gen(name, text)
        size = os.path.getsize(path)
        total += size
        with open(path, "rb") as f:
            data[name] = base64.b64encode(f.read()).decode("ascii")
        print(f"{name:14s} {size:6d} B  '{text}'")
    print(f"TOTAL mp3: {total} B, base64: {sum(len(v) for v in data.values())} B")
    # Emit as a JS object literal ready to paste/inject into index.html
    js = "var VOICE_CLIPS = " + json.dumps(data, indent=0) + ";\n"
    with open(os.path.join(OUT_DIR, "voice_data.js"), "w") as f:
        f.write(js)
    print("wrote voice_data.js")

asyncio.run(main())

#!/usr/bin/env python3
"""
Neural Voice Generator for Friday Rescue animation.

Run once from your terminal:
    pip install edge-tts
    python3 generate_neural_voice.py

This replaces the browser's TTS in friday-rescue.html with
Microsoft Azure Neural voice (en-US-AndrewNeural) — sounds
like a real human narrator. ~800KB added to the HTML file.
"""

import asyncio
import base64
import os
import sys

try:
    import edge_tts
except ImportError:
    print("Installing edge-tts...")
    os.system(f"{sys.executable} -m pip install edge-tts")
    import edge_tts

VOICE = "en-US-AndrewNeural"
HTML_PATH = os.path.join(os.path.dirname(__file__), "frontend/public/friday-rescue.html")

SCENES = [
    ("s1",  "Every day, businesses receive hundreds of PDFs. Invoices. Contracts. Reports. And locked inside every single one... is data your spreadsheet needs."),
    ("s2",  "The old way? Open each file. Copy the data. Paste it in. Repeat. At fifteen seconds per document, four hundred PDFs means two hours — just to fill one column."),
    ("s3",  "And when one number is wrong — which it always is — you search through hundreds of files to find it. Then fix it. Then check everything... again."),
    ("s4",  "You shouldn't have to work like this. There had to be a better way. And now... there is."),
    ("s5",  "Introducing MultiPDFToExcel. The AI that reads any PDF — and builds your spreadsheet for you. Automatically. No code. No templates. No manual work."),
    ("s6",  "Drop your PDFs into the browser — one or a thousand. Then tell the AI exactly what you need: vendor name, invoice number, date, total amount. In plain English. That's it."),
    ("s7",  "The AI reads every document. Clean printouts, handwritten tables, blurry fax scans, rotated pages — it doesn't care. Any PDF, any layout. It finds what you asked for."),
    ("s8",  "The result? A perfect spreadsheet. Every field, every row — formatted, accurate, and ready to download. What used to take eight hours... done in under two minutes."),
    ("s9",  "One PDF or one thousand — same speed. Same accuracy. Every time. MultiPDFToExcel scales with your workload, not against it."),
    ("s10", "MultiPDFToExcel. Any PDF. Any layout. One perfect spreadsheet — in minutes. Free to start. No credit card. No code. Just results. Visit multipdfstoexcel dot com today."),
]

async def gen_audio(scene_id, text):
    tmp = f"/tmp/{scene_id}.mp3"
    communicate = edge_tts.Communicate(text, VOICE, rate="-8%", pitch="-3Hz")
    await communicate.save(tmp)
    with open(tmp, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    os.remove(tmp)
    print(f"  ✓ {scene_id}  ({len(data)//1024}KB)")
    return scene_id, data

async def main():
    print(f"\nGenerating neural narration with {VOICE}...")
    results = {}
    for sid, text in SCENES:
        sid_out, data = await gen_audio(sid, text)
        results[sid_out] = data

    # Read the HTML file
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html = f.read()

    # Inject AUDIO_DATA constant just before </script>
    audio_js = "\n/* ===== NEURAL AUDIO (auto-generated) ===== */\n"
    audio_js += "const NEURAL_AUDIO = {\n"
    for k, v in results.items():
        audio_js += f'  {k}: "data:audio/mpeg;base64,{v}",\n'
    audio_js += "};\n"

    # Replace or inject NEURAL_AUDIO block
    if "const NEURAL_AUDIO" in html:
        import re
        html = re.sub(
            r"/\* ===== NEURAL AUDIO.*?NEURAL_AUDIO = \{.*?\};\n",
            audio_js,
            html,
            flags=re.DOTALL,
        )
    else:
        html = html.replace("</script>", audio_js + "\n</script>", 1)

    # Patch narrate() to use NEURAL_AUDIO if available
    PATCH_MARKER = "/* NEURAL_PATCH */"
    if PATCH_MARKER not in html:
        patch = """
/* NEURAL_PATCH */
const _origNarrate = narrate;
narrate = function(text){
  // Find which scene is active and play pre-generated audio
  const active = document.querySelector('.scene.active');
  if(!active || typeof NEURAL_AUDIO === 'undefined') return _origNarrate(text);
  const sid = active.id;
  if(!NEURAL_AUDIO[sid]) return _origNarrate(text);
  if(!soundOn) return;
  if(window._neuralAudio){ window._neuralAudio.pause(); window._neuralAudio = null; }
  narrationId++; // cancel any browser TTS
  if('speechSynthesis' in window) speechSynthesis.cancel();
  if(ctx) musicGain.gain.linearRampToValueAtTime(.10, ctx.currentTime + .4);
  const aud = new Audio(NEURAL_AUDIO[sid]);
  aud.volume = 1.0;
  aud.onended = () => { if(ctx) musicGain.gain.linearRampToValueAtTime(.26, ctx.currentTime + 1.1); };
  aud.play().catch(()=> _origNarrate(text)); // fallback to browser TTS
  window._neuralAudio = aud;
};
"""
        html = html.replace("</script>", patch + "\n</script>", 1)

    # Try writing directly; if permission denied, write a temp file and rename
    try:
        with open(HTML_PATH, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"\n✅ Done! Written to friday-rescue.html")
    except PermissionError:
        import shutil, stat
        # Give owner write permission and retry
        os.chmod(HTML_PATH, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH)
        try:
            with open(HTML_PATH, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"\n✅ Done! Written to friday-rescue.html (after chmod)")
        except PermissionError:
            # Last resort: write next to the original and print instructions
            out = HTML_PATH.replace("friday-rescue.html", "friday-rescue-neural.html")
            with open(out, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"\n✅ Audio embedded — saved to:\n   {out}")
            print(f"\n   Run this to replace the original:")
            print(f"   cp '{out}' '{HTML_PATH}'")

    total_kb = sum(len(v) for v in results.values()) // 1024
    print(f"   {total_kb}KB of Azure Neural audio embedded.")
    print(f"   git add frontend/public/friday-rescue.html && git commit -m 'feat: neural voice narration' && git push\n")

asyncio.run(main())

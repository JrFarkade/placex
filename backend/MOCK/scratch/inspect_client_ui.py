import os
import glob
import re

dist_dir = r"C:\Users\ASUS\AppData\Local\Programs\Python\Python314\Lib\site-packages\pipecat_ai_prebuilt\client\dist"

html_file = os.path.join(dist_dir, "index.html")
print("=== HTML Content ===")
print(open(html_file, "r", encoding="utf-8").read())

print("\n=== Searching JS files for UI Text & Disclosures ===")
for js in glob.glob(os.path.join(dist_dir, "assets", "*.js")):
    content = open(js, "r", encoding="utf-8", errors="replace").read()
    print(f"\n--- {os.path.basename(js)} ---")
    
    # Check for getUserMedia calls
    for m in re.finditer(r"getUserMedia\([^)]*\)", content):
        print(f"  getUserMedia call: {m.group(0)}")
        
    # Check for privacy, disclosure, facial, gaze, consent, etc.
    keywords = ["facial", "gaze", "blink", "head pose", "geometry", "disclosure", "privacy", "consent", "eu ai", "ai act", "record", "camera", "microphone", "disconnect", "connect"]
    for kw in keywords:
        matches = [m.start() for m in re.finditer(re.escape(kw), content, re.IGNORECASE)]
        if matches:
            print(f"  Keyword '{kw}': found {len(matches)} times")
            for pos in matches[:3]:
                start = max(0, pos - 60)
                end = min(len(content), pos + 80)
                snippet = content[start:end].replace('\n', ' ')
                print(f"    snippet: ... {snippet} ...")

import os
import re

search_dir = r"C:\Users\JrFar\.gemini\antigravity\scratch\placex"
targets = ["num1 = 10", "Enter a number", "sum of two numbers", "total = num1"]

matches = []
for root, dirs, files in os.walk(search_dir):
    if any(skip in root for skip in ["node_modules", ".git", "__pycache__", ".venv"]):
        continue
    for file in files:
        if file.endswith((".py", ".ts", ".tsx", ".json", ".js", ".md")):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    for t in targets:
                        if t.lower() in content.lower():
                            matches.append((filepath, t))
            except Exception as e:
                pass

print(f"Found {len(matches)} matches:")
for path, target in matches:
    print(f" - {path} (contains: '{target}')")

import os
import sys
import docx

sys.stdout.reconfigure(encoding='utf-8')

docx_path = r"C:\Users\JrFar\.gemini\antigravity\scratch\placex\backend\PlaceX_Roadmap_Corrected_Reference.docx"
doc = docx.Document(docx_path)

t1 = doc.tables[0]
headers = [c.text.strip().replace('\n', ' ') for c in t1.rows[0].cells]
print("Headers:", headers)

for r_idx in range(1, 5):
    row_cells = t1.rows[r_idx].cells
    print(f"\n--- Week {r_idx} ---")
    for h, cell in zip(headers, row_cells):
        print(f"  {h}: {cell.text.strip()}")

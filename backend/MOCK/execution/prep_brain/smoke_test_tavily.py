"""
PlaceX Prep Brain — Tavily Search Smoke Test (Diagnose-Only)
Runs research_company() on a sample target company and pretty-prints the output structure.
"""

import json
import os
import sys
from pathlib import Path

# Ensure execution folder is accessible
_workspace_root = Path(__file__).resolve().parent.parent.parent
_execution_path = _workspace_root / "execution"
if str(_workspace_root) not in sys.path:
    sys.path.insert(0, str(_workspace_root))
if str(_execution_path) not in sys.path:
    sys.path.insert(0, str(_execution_path))

from execution.prep_brain.tavily_research import research_company


def main():
    print("=" * 70)
    print(" PlaceX Prep Brain — Tavily Research Diagnostic Smoke Test")
    print("=" * 70)

    tavily_key = os.getenv("TAVILY_API_KEY", "")
    if tavily_key:
        masked_key = tavily_key[:7] + "..." + tavily_key[-4:] if len(tavily_key) > 12 else "[SET]"
        print(f"[+] TAVILY_API_KEY detected: {masked_key}")
    else:
        print("[-] TAVILY_API_KEY: NOT SET in environment")

    test_company = "Stripe"
    test_role = "Senior Distributed Systems Engineer"

    print(f"\n[Test Case] Company: {test_company!r}, Role: {test_role!r}")
    print("Executing research_company()...\n")

    try:
        result = research_company(company_name=test_company, role=test_role)
        
        from_cache = result.get("from_cache", False)
        print(f"Status: SUCCESS {'(from local cache)' if from_cache else '(live Tavily API call)'}")
        print("-" * 70)
        print(f"Company: {result.get('company')}")
        print(f"Role:    {result.get('role')}")
        print(f"\nSummary (first 350 chars):\n{result.get('summary', '')[:350]}...")
        print(f"\nSources ({len(result.get('sources', []))} URLs found):")
        for i, url in enumerate(result.get("sources", [])[:5], start=1):
            print(f"  [{i}] {url}")
        print(f"\nRaw Results Count: {len(result.get('raw_results', []))}")
        print("-" * 70)
        print("\nFull Output JSON (formatted):")
        print(json.dumps(result, indent=2))
        print("\n[+] Smoke test passed successfully.")
    except Exception as e:
        print(f"\n[-] Smoke test failed with exception: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

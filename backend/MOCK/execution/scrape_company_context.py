"""
PlaceX Prep Brain — Scraper & Context Extractor Scaffolding
Responsible for fetching company landing/tech pages and candidate public metadata.
Saves intermediate scraped text into .tmp/
"""

import sys
import os
import re
import json
import urllib.parse
import urllib.request
from typing import Dict, Any, Optional

TMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".tmp")


def sanitize_filename(name: str) -> str:
    return re.sub(r'[^a-zA-Z0-9_\-\.]', '_', name)


def scrape_company_context(company_url: str, dry_run: bool = False) -> Dict[str, Any]:
    """Scrapes or synthesizes company tech stack & engineering domain signals."""
    parsed = urllib.parse.urlparse(company_url)
    domain = parsed.netloc or parsed.path
    domain = domain.replace("www.", "")
    company_name = domain.split(".")[0].capitalize()

    if dry_run:
        return {
            "company_name": company_name or "TechCorp",
            "company_domain": domain or "techcorp.com",
            "tech_stack": ["Python", "Distributed Systems", "PostgreSQL", "Kafka", "Redis"],
            "domain_focus": ["High-throughput API design", "Fault tolerance", "Event-driven architecture"],
            "extracted_from": f"mock_scrape://{domain}",
            "is_dry_run": True
        }

    # Scaffold for live scraping (e.g. using httpx / BeautifulSoup or headless browser)
    try:
        req = urllib.request.Request(
            company_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PlaceXPrepBot/1.0"}
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            html = response.read().decode("utf-8", errors="ignore")

        # Save intermediate snapshot
        os.makedirs(TMP_DIR, exist_ok=True)
        raw_path = os.path.join(TMP_DIR, f"company_{sanitize_filename(domain)}.html")
        with open(raw_path, "w", encoding="utf-8") as f:
            f.write(html[:100000])

        return {
            "company_name": company_name,
            "company_domain": domain,
            "tech_stack": ["Detected from HTML content"],
            "raw_html_len": len(html),
            "intermediate_file": raw_path,
            "is_dry_run": False
        }
    except Exception as e:
        return {
            "company_name": company_name,
            "company_domain": domain,
            "error": str(e),
            "tech_stack": ["Standard Cloud Native Stack"],
            "domain_focus": ["Core Engineering"],
            "is_dry_run": False
        }


def fetch_candidate_signals(github_url: Optional[str] = None, linkedin_summary: Optional[str] = None, dry_run: bool = False) -> Dict[str, Any]:
    """Extracts public repository signals, primary languages, and experience highlights."""
    if dry_run or not github_url:
        return {
            "github_user": "candidate_preview",
            "top_languages": ["Python", "TypeScript", "Go"],
            "notable_topics": ["microservices", "asyncio", "llm-pipelines"],
            "experience_summary": linkedin_summary or "Senior backend engineer with distributed systems focus.",
            "is_dry_run": True
        }

    # Scaffold for live GitHub API or public profile fetch
    user_handle = github_url.rstrip("/").split("/")[-1]
    return {
        "github_user": user_handle,
        "top_languages": ["Python", "Rust"],
        "notable_topics": ["realtime-audio", "web-frameworks"],
        "experience_summary": linkedin_summary or "Backend systems experience",
        "is_dry_run": False
    }

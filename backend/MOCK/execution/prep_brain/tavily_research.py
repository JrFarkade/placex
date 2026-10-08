"""
PlaceX Prep Brain — Tavily Company Research Client
Fetches real-time company engineering context, culture, tech stack, and news via Tavily Search API.
Includes caching in .tmp/company_research_cache/ to protect free monthly search quotas.
"""

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
import requests
from dotenv import find_dotenv, load_dotenv

# Ensure environment variables are loaded if .env exists
_env_path = find_dotenv(usecwd=True)
if not _env_path:
    for candidate in [
        Path(".env"),
        Path("placex_files/.env"),
        Path(__file__).resolve().parent.parent.parent / "placex_files" / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
    ]:
        if candidate.exists():
            _env_path = str(candidate.resolve())
            break
if _env_path:
    load_dotenv(dotenv_path=_env_path)


def _get_workspace_root() -> Path:
    """Returns the workspace root directory (two levels up from execution/prep_brain/)."""
    return Path(__file__).resolve().parent.parent.parent


def _get_cache_dir() -> Path:
    """Ensures and returns the company research cache directory."""
    cache_dir = _get_workspace_root() / ".tmp" / "company_research_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir


def slugify(text: str) -> str:
    """Converts company name to a safe filename slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "_", text)
    return text.strip("_") or "unknown_company"


def research_company(
    company_name: str,
    role: Optional[str] = None,
    force_refresh: bool = False,
) -> Dict[str, Any]:
    """
    Researches company background, engineering culture, tech stack, and recent news
    via Tavily Search API.

    Caches output in .tmp/company_research_cache/{slugified_company_name}.json to prevent
    burning quota on repeated runs.

    Args:
        company_name: Name of target company (e.g., 'Stripe', 'Datadog')
        role: Optional role title (e.g., 'Senior Distributed Systems Engineer')
        force_refresh: If True, ignores cached result and makes a fresh API call.

    Returns:
        Dict matching {"company": str, "summary": str, "sources": [urls], "raw_results": [...]}
    """
    if not company_name or not company_name.strip():
        raise ValueError("company_name must be a non-empty string.")

    company_name_clean = company_name.strip()
    slug = slugify(company_name_clean)
    cache_file = _get_cache_dir() / f"{slug}.json"

    # 1. Check local cache
    if not force_refresh and cache_file.exists() and cache_file.is_file():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                cached_data = json.load(f)
            # Verify basic structure
            if "company" in cached_data and "summary" in cached_data and "sources" in cached_data:
                cached_data["from_cache"] = True
                return cached_data
        except Exception:
            # Fall back to live API call if cache file is corrupted
            pass

    # 2. Check Tavily API key from environment
    api_key = os.getenv("TAVILY_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "TAVILY_API_KEY environment variable is not set. "
            "Please ensure TAVILY_API_KEY is available in your environment."
        )

    # 3. Build search query targeting tech stack, engineering culture, products, and news
    query_parts = [company_name_clean]
    if role and role.strip():
        query_parts.append(role.strip())
    query_parts.append("engineering culture tech stack architecture products recent news eng blog")
    query = " ".join(query_parts)

    url = "https://api.tavily.com/search"
    payload = {
        "api_key": api_key,
        "query": query,
        "search_depth": "basic",
        "max_results": 5,
        "include_answer": True,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Tavily API request failed: {e}") from e

    # 4. Parse results and generate summary
    raw_results = data.get("results", [])
    answer = data.get("answer")

    if answer and isinstance(answer, str) and answer.strip():
        summary = answer.strip()
    else:
        snippets: List[str] = []
        for item in raw_results:
            title = item.get("title", "").strip()
            content = item.get("content", "").strip()
            if title and content:
                snippets.append(f"{title}: {content}")
            elif content:
                snippets.append(content)
        summary = "\n\n".join(snippets) if snippets else f"No detailed summary returned for {company_name_clean}."

    sources = [r.get("url") for r in raw_results if r.get("url")]

    result: Dict[str, Any] = {
        "company": company_name_clean,
        "role": role.strip() if role else None,
        "summary": summary,
        "sources": sources,
        "raw_results": raw_results,
        "from_cache": False,
    }

    # 5. Save to cache
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
    except Exception:
        # Failing to write cache should not fail the search
        pass

    return result

"""
PlaceX Host Agent Gemini Client.
Reuses existing PlaceX backend configuration (settings.GEMINI_API_KEY).
Never creates duplicate keys, never exposes keys to browser or logs.
"""

import os
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.host_agent.reasoning.prompt_system import HOST_AGENT_SYSTEM_PROMPT

logger = logging.getLogger("placex.host_agent")


class HostAgentGeminiClient:
    """
    Backend Gemini LLM Connector for PlaceX Host Agent.
    Implements multi-model resilient routing and conversation history support.
    """

    DEFAULT_MODELS = [
        "gemini-flash-lite-latest",
        "gemini-3.5-flash",
        "gemini-flash-latest",
        "gemini-3.8-flash"
    ]

    @classmethod
    def call_gemini(
        cls,
        prompt: str,
        system_instruction: str = HOST_AGENT_SYSTEM_PROMPT,
        history: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.3,
        max_output_tokens: int = 800
    ) -> Optional[str]:
        """
        Invokes Gemini with system instruction, optional multi-turn history, and student prompt.
        Gracefully tries multiple model tiers to protect against temporary rate-limits or outages.
        """
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            logger.error("[HOST_AGENT] No GEMINI_API_KEY found in configuration.")
            return None

        configured_model = getattr(settings, "GEMINI_MODEL", None)
        models_to_try = []
        if configured_model and configured_model not in ["gemini-1.5-flash", "gemini-2.5-flash"]:
            models_to_try.append(configured_model)
        for m in cls.DEFAULT_MODELS:
            if m not in models_to_try:
                models_to_try.append(m)

        # Build contents array
        contents = []
        if history and isinstance(history, list):
            for turn in history[-6:]:  # Keep recent 3 roundtrips
                role = turn.get("role", "user")
                text = turn.get("text") or turn.get("content", "")
                if text:
                    api_role = "user" if role == "user" else "model"
                    contents.append({
                        "role": api_role,
                        "parts": [{"text": str(text)}]
                    })

        contents.append({
            "role": "user",
            "parts": [{"text": prompt}]
        })

        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_output_tokens
            }
        }
        body_bytes = json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json"}

        # 1. Primary: Direct high-speed REST API
        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            req = urllib.request.Request(url, data=body_bytes, headers=headers, method="POST")
            try:
                logger.info(f"[HOST_AGENT] Calling Gemini via REST: model={model_name}")
                with urllib.request.urlopen(req, timeout=12) as response:
                    raw_data = json.loads(response.read().decode("utf-8"))
                    candidates = raw_data.get("candidates", [])
                    if candidates and len(candidates) > 0:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            text = parts[0]["text"].strip()
                            logger.info(f"[HOST_AGENT] Gemini response generated (len={len(text)}) via {model_name}")
                            return text
            except urllib.error.HTTPError as http_err:
                logger.warning(f"[HOST_AGENT] REST call failed for {model_name} (HTTP {http_err.code}). Trying next model...")
                continue
            except Exception as e:
                logger.warning(f"[HOST_AGENT] REST call exception for {model_name}: {e}. Trying next model...")
                continue

        # 2. Secondary fallback: google.generativeai SDK
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            for model_name in models_to_try:
                try:
                    logger.info(f"[HOST_AGENT] Calling Gemini via SDK fallback: model={model_name}")
                    model = genai.GenerativeModel(
                        model_name=model_name,
                        system_instruction=system_instruction,
                        generation_config={"temperature": temperature, "max_output_tokens": max_output_tokens}
                    )
                    res = model.generate_content(prompt, request_options={"timeout": 12})
                    if res and res.text:
                        return res.text.strip()
                except Exception:
                    continue
        except Exception:
            pass

        logger.error("[HOST_AGENT] All Gemini model routes exhausted.")
        return None

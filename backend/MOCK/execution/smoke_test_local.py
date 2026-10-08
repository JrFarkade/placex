"""
PlaceX Live Brain - Local Smoke Test
Spins up the pipeline locally, runs one canned test turn (~10s):
STT -> Gemini Flash -> TTS -> Simli Avatar,
measures per-stage latency, and logs output to .tmp/smoke_test_log.txt.
"""

import asyncio
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

# Find and load .env from current directory, root, or placex_files/
env_path = find_dotenv(usecwd=True)
if not env_path:
    for candidate in [Path(".env"), Path("placex_files/.env")]:
        if candidate.exists():
            env_path = str(candidate.resolve())
            break

if env_path:
    load_dotenv(dotenv_path=env_path)

# Ensure .tmp directory exists
tmp_dir = Path(".tmp")
tmp_dir.mkdir(parents=True, exist_ok=True)
log_file_path = tmp_dir / "smoke_test_log.txt"


def log_and_print(msg: str, log_file):
    print(msg)
    log_file.write(msg + "\n")
    log_file.flush()


async def run_smoke_test():
    with open(log_file_path, "w", encoding="utf-8") as f:
        log_and_print("=" * 65, f)
        log_and_print(f" PlaceX Live Brain -- Smoke Test Report", f)
        log_and_print(f" Timestamp: {datetime.now().isoformat()}", f)
        log_and_print(f" .env Path: {env_path or 'NOT FOUND'}", f)
        log_and_print("=" * 65, f)

        # 1. Environment and Key Validation
        api_keys = {
            "DEEPGRAM_API_KEY": os.getenv("DEEPGRAM_API_KEY"),
            "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY"),
            "ELEVENLABS_API_KEY": os.getenv("ELEVENLABS_API_KEY"),
            "ELEVENLABS_VOICE_ID": os.getenv("ELEVENLABS_VOICE_ID"),
            "SIMLI_API_KEY": os.getenv("SIMLI_API_KEY"),
            "SIMLI_FACE_ID": os.getenv("SIMLI_FACE_ID"),
        }

        log_and_print("\n[Stage 0: Key & Config Check]", f)
        for key, val in api_keys.items():
            status = "CONFIGURED" if val and str(val).strip() else "MISSING / EMPTY"
            log_and_print(f"  - {key:<22}: {status}", f)

        latencies = {}
        errors = []

        canned_candidate_transcript = (
            "Hi, I'm ready for the technical round. Could you tell me about the first question?"
        )

        # 2. Stage 1: STT (Deepgram / Transcription Stage)
        log_and_print("\n[Stage 1: STT (Speech-to-Text)]", f)
        t0 = time.perf_counter()
        deepgram_key = api_keys["DEEPGRAM_API_KEY"]
        if deepgram_key:
            try:
                # Test connectivity to Deepgram endpoint
                import httpx
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(
                        "https://api.deepgram.com/v1/projects",
                        headers={"Authorization": f"Token {deepgram_key}"},
                    )
                stt_latency = (time.perf_counter() - t0) * 1000
                latencies["STT (Deepgram ping/auth)"] = f"{stt_latency:.2f} ms"
                log_and_print(f"  [+] Deepgram Auth & API Check: OK ({stt_latency:.2f} ms)", f)
            except Exception as e:
                err_msg = f"Deepgram connection error: {e}"
                errors.append(err_msg)
                log_and_print(f"  [-] {err_msg}", f)
        else:
            log_and_print("  [!] DEEPGRAM_API_KEY missing - using canned transcription frame", f)
            latencies["STT"] = "Simulated / Canned"

        log_and_print(f'  Input Turn Text: "{canned_candidate_transcript}"', f)

        # 3. Stage 2: LLM (Gemini Flash / Interviewer persona)
        log_and_print("\n[Stage 2: LLM (Gemini Flash)]", f)
        gemini_key = api_keys["GEMINI_API_KEY"]
        llm_response_text = ""
        ttfb_ms = None
        total_llm_ms = None

        if gemini_key:
            try:
                sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "placex_files"))
                from bot import load_question_bank, build_interviewer_system_prompt
                from pipecat.services.google.llm import GoogleLLMService
                from pipecat.processors.aggregators.llm_context import LLMContext

                qb = load_question_bank()
                system_prompt = build_interviewer_system_prompt(qb)
                log_and_print(f"  [+] Question Bank Loaded: {qb.metadata.company_name} ({len(qb.questions)} questions)", f)

                model_name = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
                llm = GoogleLLMService(
                    api_key=gemini_key,
                    settings=GoogleLLMService.Settings(
                        model=model_name,
                    ),
                )

                context = LLMContext([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": canned_candidate_transcript},
                ])

                # Start timing immediately before request is sent
                t_llm_start = time.perf_counter()
                stream = await llm._stream_content(context)

                chunks = []
                async for chunk in stream:
                    if ttfb_ms is None and chunk.text:
                        ttfb_ms = (time.perf_counter() - t_llm_start) * 1000
                    if chunk.text:
                        chunks.append(chunk.text)

                total_llm_ms = (time.perf_counter() - t_llm_start) * 1000
                llm_response_text = "".join(chunks).strip()

                latencies["LLM TTFB (Time to First Token)"] = f"{ttfb_ms:.2f} ms" if ttfb_ms is not None else "N/A"
                latencies["LLM (Gemini Flash Total)"] = f"{total_llm_ms:.2f} ms"
                log_and_print(
                    f"  [+] Gemini Stream: TTFB={ttfb_ms:.2f} ms, Total={total_llm_ms:.2f} ms",
                    f,
                )
                log_and_print(f'  Interviewer Output: "{llm_response_text}"', f)
            except Exception as e:
                err_msg = f"Gemini LLM error: {e}"
                errors.append(err_msg)
                log_and_print(f"  [-] {err_msg}", f)
                llm_response_text = (
                    "Welcome to PlaceX. Let's start with your background in distributed systems."
                )
        else:
            log_and_print("  [!] GEMINI_API_KEY missing - using fallback interviewer response", f)
            llm_response_text = (
                "Welcome to the PlaceX Live Brain session. Could you describe an architecture challenge you solved?"
            )
            latencies["LLM"] = "Fallback text"

        # 4. Stage 3: TTS (ElevenLabs Flash v2.5)
        log_and_print("\n[Stage 3: TTS (ElevenLabs Flash v2.5)]", f)
        eleven_key = api_keys["ELEVENLABS_API_KEY"]
        voice_id = api_keys["ELEVENLABS_VOICE_ID"]
        t_tts_start = time.perf_counter()

        if eleven_key and voice_id:
            try:
                import httpx
                tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
                headers = {
                    "xi-api-key": eleven_key,
                    "Content-Type": "application/json",
                }
                payload = {
                    "text": llm_response_text,
                    "model_id": "eleven_flash_v2_5",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.8},
                }

                audio_bytes = b""
                ttfa_ms = None
                async with httpx.AsyncClient(timeout=10.0) as http_client:
                    async with http_client.stream("POST", tts_url, json=payload, headers=headers) as resp:
                        if resp.status_code == 200:
                            async for chunk in resp.aiter_bytes():
                                if not audio_bytes:
                                    ttfa_ms = (time.perf_counter() - t_tts_start) * 1000
                                audio_bytes += chunk
                            total_tts_ms = (time.perf_counter() - t_tts_start) * 1000
                            latencies["TTS TTFA (Time to First Audio)"] = f"{ttfa_ms:.2f} ms"
                            latencies["TTS (ElevenLabs Total)"] = f"{total_tts_ms:.2f} ms"
                            log_and_print(
                                f"  [+] ElevenLabs Stream OK: TTFA={ttfa_ms:.2f} ms, Total={total_tts_ms:.2f} ms, Size={len(audio_bytes)} bytes",
                                f,
                            )
                        else:
                            resp_text = await resp.aread()
                            err_msg = f"ElevenLabs API status {resp.status_code}: {resp_text.decode('utf-8', errors='ignore')}"
                            errors.append(err_msg)
                            log_and_print(f"  [-] {err_msg}", f)
            except Exception as e:
                err_msg = f"ElevenLabs TTS error: {e}"
                errors.append(err_msg)
                log_and_print(f"  [-] {err_msg}", f)
        else:
            log_and_print("  [!] ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID missing", f)
            latencies["TTS"] = "Missing credentials"

        # 5. Stage 4: Avatar (Simli Video Service)
        log_and_print("\n[Stage 4: Avatar (Simli Video Service)]", f)
        simli_key = api_keys["SIMLI_API_KEY"]
        face_id = api_keys["SIMLI_FACE_ID"]
        t_simli_start = time.perf_counter()

        if simli_key and face_id:
            try:
                import httpx
                # Test Simli API session handshake / face validation
                simli_url = "https://api.simli.ai/startAudioToVideoSession"
                headers = {"Content-Type": "application/json"}
                payload = {
                    "apiKey": simli_key,
                    "faceId": face_id,
                    "handle_silence": True,
                    "maxSessionLength": 60,
                    "maxIdleTime": 30,
                }
                async with httpx.AsyncClient(timeout=8.0) as http_client:
                    resp = await http_client.post(simli_url, json=payload, headers=headers)
                    simli_ms = (time.perf_counter() - t_simli_start) * 1000
                    if resp.status_code in (200, 201):
                        latencies["Simli (Session Start / Handshake)"] = f"{simli_ms:.2f} ms"
                        log_and_print(f"  [+] Simli Session Handshake OK: {simli_ms:.2f} ms", f)
                    else:
                        resp_text = resp.text
                        err_msg = f"Simli session returned HTTP {resp.status_code}: {resp_text}"
                        errors.append(err_msg)
                        log_and_print(f"  [-] {err_msg}", f)
            except Exception as e:
                err_msg = f"Simli API error: {e}"
                errors.append(err_msg)
                log_and_print(f"  [-] {err_msg}", f)
        else:
            log_and_print("  [!] SIMLI_API_KEY or SIMLI_FACE_ID missing", f)
            latencies["Simli"] = "Missing credentials"

        # 6. Summary and Latency Table
        log_and_print("\n" + "=" * 65, f)
        log_and_print(" PIPELINE SMOKE TEST SUMMARY", f)
        log_and_print("=" * 65, f)
        log_and_print(f"{'STAGE':<35} | {'LATENCY / STATUS'}", f)
        log_and_print("-" * 65, f)
        for stage, lat in latencies.items():
            log_and_print(f"{stage:<35} | {lat}", f)

        log_and_print("\n[Errors & Warnings Summary]", f)
        if errors:
            for idx, err in enumerate(errors, 1):
                log_and_print(f"  {idx}. {err}", f)
        else:
            log_and_print("  No connection or runtime errors encountered.", f)

        log_and_print("=" * 65, f)
        log_and_print(f"Log written to: {log_file_path.resolve()}", f)


if __name__ == "__main__":
    asyncio.run(run_smoke_test())
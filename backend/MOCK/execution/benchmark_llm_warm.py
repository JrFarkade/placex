"""
PlaceX Live Brain — LLM Warm Connection Benchmark
Measures TTFB across 5 sequential turns on a single warm client instance
to isolate cold-start / TLS handshake overhead vs steady-state per-turn latency.
"""

import asyncio
import os
import sys
import time
from pathlib import Path
from dotenv import find_dotenv, load_dotenv

# Find and load .env
env_path = find_dotenv(usecwd=True)
if not env_path:
    for candidate in [Path(".env"), Path("placex_files/.env")]:
        if candidate.exists():
            env_path = str(candidate.resolve())
            break
if env_path:
    load_dotenv(dotenv_path=env_path)

# Insert placex_files path
workspace_root = Path(__file__).resolve().parent.parent
placex_path = workspace_root / "placex_files"
if str(placex_path) not in sys.path:
    sys.path.insert(0, str(placex_path))

from bot import load_question_bank, build_interviewer_system_prompt
from pipecat.services.google.llm import GoogleLLMService
from pipecat.processors.aggregators.llm_context import LLMContext


async def run_benchmark():
    print("=" * 65)
    print(" PlaceX Live Brain — Warm Stream TTFB Benchmark (5 Turns)")
    print("=" * 65)

    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

    if not api_key:
        print("[ERROR] GEMINI_API_KEY is missing from environment.")
        return

    # Load Question Bank and build system prompt
    qb = load_question_bank()
    system_prompt = build_interviewer_system_prompt(qb)
    print(f"[+] Loaded Question Bank for: {qb.metadata.company_name} ({len(qb.questions)} questions)")
    print(f"[+] LLM Model: {model_name}")

    # 1. Instantiate GoogleLLMService ONCE outside the loop (matching bot.py)
    llm = GoogleLLMService(
        api_key=api_key,
        settings=GoogleLLMService.Settings(
            model=model_name,
        ),
    )
    print("[+] GoogleLLMService initialized once (persistent async client session).\n")

    # 5 realistic, distinct candidate response turns for PlaceX interview flow
    test_turns = [
        (
            "Turn 1 (Architecture Overview)",
            "In my previous role at a fintech company, I redesigned our core ledger transaction pipeline. "
            "We were handling roughly 15,000 writes per second using a sharded PostgreSQL cluster with Kafka "
            "as our write-ahead log buffer. The main bottleneck was cross-shard idempotency resolution when "
            "network partitions occurred between availability zones, which we solved using two-phase locking with "
            "short leased leases in Redis."
        ),
        (
            "Turn 2 (Database & Consistency Deep-dive)",
            "For read consistency across read replicas, we implemented causal consistency tokens passed in the "
            "gRPC metadata header. If a user performed a write, subsequent reads were routed to replicas that had "
            "caught up to at least that replication LSN offset, preventing stale reads without placing read traffic "
            "on the primary database node."
        ),
        (
            "Turn 3 (Microservices & Failure Handling)",
            "When dealing with downstream service degradation in our payment gateway orchestration, we adopted "
            "circuit breakers configured with an exponential backoff jitter and automated fallback queues in SQS. "
            "If the third-party settlement API returned 5xx responses for over 2% of traffic in a 10-second window, "
            "we tripped the circuit and safely persisted transactions to a dead-letter retry pool."
        ),
        (
            "Turn 4 (Observability & Production Incident)",
            "During a major Black Friday spike, our Prometheus metrics alerted us to elevated p99 latency on the "
            "auth verification service. Profiling with pprof revealed contention on the JWT verification key cache lock. "
            "We replaced the global mutex with a lock-free sync.Map and local thread-safe RingBuffers, reducing p99 "
            "from 850ms down to 12ms under full load."
        ),
        (
            "Turn 5 (System Design & Tradeoffs)",
            "If I were to redesign that system from scratch today with higher write scale requirements, I would "
            "leverage an event-sourced architecture with CockroachDB or TiDB for native multi-region consensus, "
            "while keeping materialized query views in DynamoDB with point-in-time recovery to completely isolate "
            "analytical reporting queries from operational ledger throughput."
        ),
    ]

    results = []

    for i, (label, candidate_text) in enumerate(test_turns, start=1):
        print(f"--- Running {label} ---")
        context = LLMContext([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": candidate_text},
        ])

        t_start = time.perf_counter()
        stream = await llm._stream_content(context)

        ttfb_ms = None
        chunks = []
        async for chunk in stream:
            if ttfb_ms is None and chunk.text:
                ttfb_ms = (time.perf_counter() - t_start) * 1000
            if chunk.text:
                chunks.append(chunk.text)

        total_ms = (time.perf_counter() - t_start) * 1000
        output_snippet = "".join(chunks).strip().replace("\n", " ")
        if len(output_snippet) > 80:
            output_snippet = output_snippet[:77] + "..."

        results.append({
            "turn": i,
            "label": label,
            "ttfb_ms": ttfb_ms if ttfb_ms is not None else total_ms,
            "total_ms": total_ms,
            "response": output_snippet,
        })

        print(f"  TTFB: {ttfb_ms:.2f} ms | Total: {total_ms:.2f} ms")
        print(f'  Interviewer: "{output_snippet}"\n')

    # Calculate statistics
    ttfb_values = [r["ttfb_ms"] for r in results]
    cold_ttfb = ttfb_values[0]
    warm_ttfb_avg = sum(ttfb_values[1:]) / len(ttfb_values[1:]) if len(ttfb_values) > 1 else cold_ttfb
    delta_ms = cold_ttfb - warm_ttfb_avg
    delta_pct = (delta_ms / warm_ttfb_avg) * 100 if warm_ttfb_avg > 0 else 0

    print("=" * 65)
    print(" BENCHMARK RESULTS SUMMARY")
    print("=" * 65)
    print(f"{'TURN':<40} | {'TTFB (ms)':<10} | {'TOTAL (ms)':<10}")
    print("-" * 65)
    for r in results:
        print(f"{r['label']:<40} | {r['ttfb_ms']:>7.2f} ms | {r['total_ms']:>7.2f} ms")

    print("=" * 65)
    print(f"Call 1 (Cold Start TTFB)         : {cold_ttfb:.2f} ms")
    print(f"Calls 2-5 Average (Warm TTFB)    : {warm_ttfb_avg:.2f} ms")
    print(f"Delta (Call 1 - Warm Avg)        : {delta_ms:+.2f} ms ({delta_pct:+.1f}%)")
    print("-" * 65)
    if delta_ms > 500:
        print("[Conclusion] Significant cold-start penalty detected on Call 1 (HTTP/TLS connection setup). Steady-state warm turns are noticeably faster.")
    else:
        print("[Conclusion] Per-turn TTFB is consistent across cold and warm calls.")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(run_benchmark())

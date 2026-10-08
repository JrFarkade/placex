# PlaceX — Antigravity Agent Instructions

> Mirror this file as `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` at the repo root so every agent surface loads the same rules. This copy is tuned for **Google Antigravity** running as the orchestration layer for **PlaceX**.

## Where You Sit in the Stack

PlaceX has its own division of labor — don't blur it:

| Layer | Tool | Role |
|---|---|---|
| Planning, orchestration, implementation, code review, testing | **Antigravity (you)** | Read directives, write/edit code, run scripts, verify results — full development loop |
| DevOps / CI-CD scripting | **Codex CLI** | Pipelines, deploy scripts, infra glue |
| Boilerplate only | Local Ollama | Cheap, low-context filler tasks |

**You are both the orchestrator and the implementer.** Read a directive, figure out the right approach, write the code or run the existing execution script, check the result, handle failures, and keep the directive current. See `directives/agent_workflow.md` for the full routing decision tree.

This mirrors why the 3-layer split exists at all: LLM steps are probabilistic, chained steps compound error (90% per-step accuracy → 59% success over 5 steps). Pushing determinism into scripts and clear ownership boundaries is what keeps PlaceX's 4 subsystems buildable in parallel without collisions.

## Budget Reality — $0 by Default

This is a personal portfolio project with a hard budget: **$0**. Not "spend cautiously," not "ask first" — the default for every service below is free, and only one exception exists.

| Service | Role | Free-tier reality |
|---|---|---|
| Deepgram | STT | $200 one-time credit, no card required. Huge runway — use freely. |
| ElevenLabs | TTS | 10,000 characters/month, renews monthly, no card required. Use freely, but mind the ~10 min/month ceiling. |
| Simli | Avatar | $10 signup credit + 50 free minutes/month, renews monthly. Use freely. |
| **Gemini** (Flash / Flash-Lite) | **LLM — default, all subsystems** | Free, ongoing, no card, no expiry. **Not Gemini Pro** — Pro requires paid billing as of 2026; if a directive or script says "Gemini," it means Flash unless stated otherwise. |


Deepgram, ElevenLabs, and Simli are safe enough at portfolio scale that you don't need a permission check before every call. Gemini Flash is free and unlimited — use it freely as the sole LLM backend.

## The 3 Layers, Applied to PlaceX

**Layer 1 — Directive (`directives/`)**
SOPs in Markdown, one per workflow, scoped to a subsystem. Each defines: goal, inputs, which script(s)/tools to use, expected output, known edge cases, and **which owner/branch this belongs to**. Organize by subsystem so ownership stays visible:

```
directives/
  webapp/          # Django + HTMX + Tailwind + MySQL — auth, OAuth, assignments, progress
  live-brain/       # Pipecat pipeline — STT/LLM/TTS/avatar orchestration, latency-critical
  prep-scoring-brain/  # async question-bank gen, transcript scoring, rubric JSON
  host-agent/       # candidate-side companion process
  tracking/         # LinkedIn/GitHub connectivity + signal extraction
  shared/           # cross-cutting: env setup, MCP config, CI, avatar caching pipeline
```

**Layer 2 — Orchestration (you, in Antigravity)**
- Read the relevant directive before acting — don't improvise the workflow from memory.
- Decide: does this need an existing Layer 3 script, or does it need new/modified code? Check `execution/` and `directives/` first, then implement directly.
- For anything touching the **Live Brain** (STT→LLM→TTS→avatar frame pipeline), respect the modality-agnostic event interface — never let orchestration logic reach into voice/avatar internals directly; go through the defined event schema so teammates' modules stay swappable.
- For parallel work across subsystems, split tasks along the existing branch convention (`milestone-*` for Dashboard, `phase-1`…`phase-6` for Interview Tool) so parallel agents don't step on each other.
- Default to the free services in **Budget Reality** above. All current providers (Gemini, Deepgram, ElevenLabs, Simli, Daily) are on free tiers.

**Layer 3 — Execution (`execution/`)**
Deterministic Python scripts, one job each, well-commented, reading secrets from `.env`. Typical PlaceX examples: `render_avatar_clip.py`, `run_behavioral_tagger.py`, `generate_question_bank.py`, `score_transcript.py`, `scrape_company_links.py`, `sync_linear_ticket.py`. Check this folder before writing anything new.

## Execution Authorization

This file is not just advisory — when a directive names a script or a clear next action, **run it**. Don't stop to describe what you would do unless you're genuinely blocked. If you find yourself writing "I would run X" instead of running X, that's a signal you're in the wrong permission mode — check `/config` (or `settings.json`, see below) rather than defaulting to narration.

**Dry-run convention for anything that touches a metered service.** Every script in `execution/` that calls Deepgram, ElevenLabs, Simli, or Gemini must support a `--dry-run` flag that validates inputs/logic without making the real call. Default to `--dry-run` unless the user has explicitly approved a real call in this message or the directive says the step is pre-approved.

## Operating Principles

**1. Check for tools first.** Before writing a new script, check `execution/` and the relevant `directives/<subsystem>/` folder. Only create new scripts when nothing covers the case.

**2. Self-anneal when things break.**
- Read the error/stack trace fully before guessing.
- Fix and retest — unless the fix requires spending API credits or a paid tier, in which case check with Aki first.
- Update the directive with what was learned (rate limits, timing quirks, payload shape, etc.).
- Example from this project already logged: Antigravity's MCP config expects `serverUrl`, not `url`, for HTTP-based MCP servers — this kind of thing belongs in `directives/shared/mcp_setup.md`, not just in your own scratch memory.

**3. Update directives as you learn — don't discard learnings.**
Directives are living instruction sets, not scratch notes. When you discover an API constraint, a better sequencing, a Simli/ElevenLabs/Deepgram/Gemini quirk, or a Pipecat processor gotcha — write it into the directive. **Never create or overwrite a directive without asking first**, unless explicitly told to; directives are the durable memory of this system and must be improved in place, not silently replaced.

## Self-Annealing Loop

1. Fix the immediate break.
2. Update or create the execution script.
3. Test it in isolation before wiring it back in.
4. Update the directive to reflect the new flow.
5. System is now stronger for next time — commit the directive change.

## PlaceX-Specific Guardrails

- **Smallest-slice-first**: when a directive spans a build phase (e.g., Live Brain), validate text-only before voice, voice-only before avatar. Don't let orchestration skip ahead of what's actually been validated.
- **Behavioral signals are candidate-facing coaching, never hidden scoring.** Any directive or script touching the behavioral tagger / facial analysis output must preserve this framing — it's both a product and an EU AI Act compliance requirement.
- **Avatar rendering stays server-side + CDN-cached**, never pushed to candidate devices. Don't let a directive drift toward client-side rendering as a "quick fix."
- **Prompt engineering over training**: Live/Prep/Scoring Brain tasks should stay in "well-crafted system prompt + structured output" territory, not custom model training, unless a directive explicitly says otherwise.
- **$0 by default**: see Budget Reality above. Don't let a directive quietly introduce a paid LLM as a default — that's a real cost decision, not a shortcut.

## File Organization

**Deliverables vs. Intermediates** — PlaceX deliverables are not cloud docs, they're working software:
- **Deliverables**: merged PRs, passing milestone/phase branches, deployed endpoints, Linear tickets moved to Done, updated directives.
- **Intermediates**: everything in `.tmp/` — scraped company data, rendered avatar clip drafts, raw transcripts, cached rubric JSON before review. Always regeneratable, never committed.

```
.tmp/            # intermediate files only — safe to delete anytime
execution/        # deterministic scripts, organized to mirror directives/
directives/       # SOPs, organized by subsystem (see above)
.env              # API keys — Deepgram, ElevenLabs, Simli, Gemini (sole LLM), Daily, etc.
mcp_config.json   # manual MCP setup (GitHub MCP Store has known Docker issues — use this instead)
credentials.json / token.json   # OAuth, gitignored
```

## Summary

You handle the full development loop for PlaceX — planning, implementation, testing, and verification — across 4 subsystems with real latency, compliance, and cost constraints. Read the directive, write the code or run the existing script, verify, self-anneal, and keep the directive honest. Be pragmatic. Respect the subsystem boundaries. Default to free services and never treat spending as the default path. See `directives/agent_workflow.md` for the canonical tooling split.

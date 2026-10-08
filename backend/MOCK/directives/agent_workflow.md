# PlaceX — Agent Workflow & Tooling Split

**Document ID**: `directives/agent_workflow.md`
**Status**: Active — canonical reference for all directives
**Last updated**: 2026-08-17

---

## Purpose

This document defines which agent tool handles what in PlaceX's
development workflow. Every other directive should reference this file
rather than hard-coding tool assignments — when the tooling split
changes, only this file needs updating.

---

## Current Tooling Split

| Layer | Tool | Role |
|---|---|---|
| Planning, orchestration, implementation, code review, testing | **Antigravity** | Reads directives → writes and edits code → runs scripts → verifies results. Single agent for the full development loop. |
| DevOps / CI-CD / scaffolding | **Codex CLI** | Pipelines, deploy scripts, infra glue, CLI harnesses, worker queue scaffolding. |
| Boilerplate only | **Local Ollama** | Cheap, low-context filler tasks (e.g., stub generation, repetitive template expansion). |

### What changed

Antigravity now handles **both orchestration and implementation**
directly. There is no separate "implementation agent" to route to —
Antigravity reads the directive, writes the code, runs the tests, and
updates the directive, all in one loop.

Previously, Claude Code occupied the "implementation / refactors / tests
/ git ops" row in the table. That routing target no longer exists. If
you see a directive that still says "assign to Claude Code" or "delegate
to Claude Code," treat it as **assign to Antigravity** — and update the
directive in place so the next reader doesn't hit the same stale
reference.

### Routing decision tree

```
Is this a DevOps / CI-CD / deploy / infra task?
  YES → Codex CLI
  NO  ↓

Is this trivial boilerplate with no real decision-making?
  YES → Local Ollama (optional, Antigravity can also handle it)
  NO  ↓

Everything else → Antigravity
  (planning, code, tests, prompts, scripts, directives, verification)
```

---

## Why a single-agent loop

LLM steps are probabilistic — chaining across agents compounds error
(90% per-step accuracy → 59% over 5 steps). By keeping the full
plan → implement → test → anneal cycle inside one agent context,
Antigravity avoids the handoff overhead and context loss that multi-agent
routing introduced.

Deterministic execution scripts in `execution/` still exist and should
still be used — Antigravity runs them rather than reimplementing their
logic inline. The principle "check for existing tools first" hasn't
changed; only the routing target for new code has.

---

## For directive authors

When writing or updating a directive's "Division of Labor" table:

- **Do** assign implementation work to **Antigravity**.
- **Do** assign DevOps/scaffolding work to **Codex CLI**.
- **Do** assign trivial boilerplate to **Local Ollama** (optional).
- **Don't** reference Claude Code as a routing target.
- **Don't** split "orchestration" and "implementation" into separate
  agent rows — they're the same agent now.

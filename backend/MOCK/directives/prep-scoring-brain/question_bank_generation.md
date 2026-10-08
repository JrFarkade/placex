# PlaceX Prep Brain — Question Bank & Rubric Generation Specification

**Document ID**: `directives/prep-scoring-brain/question_bank_generation.md`  
**Status**: Specification & Architectural Contract  
**Subsystem**: Prep Brain (`prep-scoring-brain`)  
**Audience**: Antigravity (LLM Generation Logic + Orchestration & Verification), Codex CLI (Async Worker & Scraping Glue)

---

## 1. Subsystem Purpose & Scope

The **Prep Brain** is an asynchronous, pre-interview intelligence engine. Given:
1. **Target Company URL** (e.g. `https://stripe.com`, `https://databricks.com`)
2. **Candidate Profile Data** (GitHub handle/URL and optional LinkedIn summary)
3. **Role & Seniority Level** (e.g. *Senior Backend Engineer*, *L5 Distributed Systems*)

The Prep Brain extracts key architectural, cultural, and technical signals to produce a deterministic, tiered **Question Bank with Scoring Rubrics** formatted as structured JSON.

---

## 2. Architectural Contract with Live Brain & Scoring Brain

Per [`directives/question_bank_strategy.md`](file:///d:/PLACE-X%20SETUP/directives/question_bank_strategy.md):
* **Strict v1 Order**: The question sequence is fixed. Questions are arranged into progressive tiers (Warm-up $\rightarrow$ Core Technical $\rightarrow$ Deep Architecture / Scale $\rightarrow$ Behavioral / Tradeoff).
* **1:1 Rubric Mapping**: Every question carries an unambiguous scoring rubric used downstream by the Scoring Brain.
* **Format Contract**: The output is purely structured JSON (no markdown wrapping, no raw text strings).

---

## 3. JSON Output Schema Specification

The generated question bank must strictly conform to the following schema:

```json
{
  "session_id": "string (UUID)",
  "metadata": {
    "company_name": "string",
    "company_domain": "string",
    "role_title": "string",
    "target_level": "string (e.g. L4, L5, Senior)",
    "generated_at": "ISO-8601 Timestamp",
    "tech_stack_detected": ["string"],
    "domain_focus": ["string"]
  },
  "questions": [
    {
      "id": "q1_warmup",
      "index": 1,
      "tier": "warmup",
      "topic": "string (e.g. Distributed Consensus)",
      "primary_prompt": "Spoken question text for the interviewer",
      "context_background": "Context rationale explaining why this was selected based on company/candidate stack",
      "allowed_micro_probes": [
        "Sample short clarifying probe 1",
        "Sample short clarifying probe 2"
      ],
      "scoring_rubric": {
        "max_points": 10,
        "criteria": [
          {
            "dimension": "Technical Depth",
            "weight": 0.4,
            "poor_0_3": "Description of failing/shallow answer",
            "good_4_7": "Description of competent answer",
            "expert_8_10": "Description of mastery/deep insight"
          },
          {
            "dimension": "Communication & Conciseness",
            "weight": 0.3,
            "poor_0_3": "Rambling, defensive, or unclear",
            "good_4_7": "Structured and understandable",
            "expert_8_10": "Crisp, MECE, concise delivery"
          },
          {
            "dimension": "System Tradeoffs",
            "weight": 0.3,
            "poor_0_3": "Ignores edge cases and latency costs",
            "good_4_7": "Mentions primary failure modes",
            "expert_8_10": "Nuanced analysis of CAP, I/O bottlenecks, and operational cost"
          }
        ],
        "key_phrases_expected": ["raft", "leader election", "split-brain", "quorum"],
        "anti_patterns": ["claiming consensus needs no network roundtrips", "assuming clocks are perfectly synchronized"]
      }
    }
  ]
}
```

---

## 4. Division of Labor & Task Routing

| Layer | Assignee | Scope of Work |
|---|---|---|
| **LLM Generation, Rubrics, Orchestration & Verification** | **Antigravity** | • Design few-shot system prompts for question synthesis.<br>• Implement rubric grading anchors (poor/good/expert).<br>• Ensure Gemini Flash compatibility (default $0 tier) with strict JSON output.<br>• Validate JSON schema compliance.<br>• Run dry-run end-to-end checks.<br>• Maintain directives and prevent Live Brain drift. |
| **Async Scraper & Worker Queue** | **Codex CLI** | • Build deterministic scraper for company URL and GitHub public repos.<br>• Implement worker job queue scaffolding (async task runner / CLI harness).<br>• Save intermediate raw context to `.tmp/` and final blueprints to `execution/`. |

---

## 5. Execution Script Guardrails

1. Must support `--dry-run` flag to validate inputs, schemas, and payload structure without consuming API credits.
2. Intermediates (scraped HTML text, raw candidate repos) must be written to `.tmp/` and never committed to version control.
3. Default LLM engine is **Gemini 1.5/2.0 Flash** ($0 ongoing tier).

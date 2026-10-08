# PlaceX Live Brain — Question Bank Execution Strategy (v1)

**Document ID**: `directives/question_bank_strategy.md`  
**Status**: Active / v1 Architectural Specification  
**Audience**: Live Brain Pipeline Engineers, Prompt Designers, Prep & Scoring Brain Teams  

---

## 1. Executive Summary & Core Principle

This directive establishes the architectural contract for question progression in **PlaceX Live Brain (v1)**. 

For the v1 release, the Live Brain strictly adheres to a **fixed-sequence question blueprint** generated upfront by the Prep Brain. The total set of substantive questions and their sequential order are deterministic and immutable during the live session.

> [!IMPORTANT]
> **The Fixed vs. Fluid Distinction**:
> * **WHAT is fixed**: The substantive evaluation topics, primary question blueprints, and sequential progression ($Q_1 \rightarrow Q_2 \rightarrow \dots \rightarrow Q_n$).
> * **HOW is fluid**: The conversational delivery, contextual acknowledgments, organic transitions, micro-clarifications, and conversational pacing around each question.
> 
> Implementers must **never** flatten this constraint into "read a rigid script like a robot."

---

## 2. Rationale for the v1 Constraint

1. **Scoring Determinism & Calibration**: Ensures direct 1:1 alignment with rubric blueprints created by the Prep Brain, simplifying automated transcript grading in the Scoring Brain.
2. **Latency & Reliability**: Eliminates expensive real-time question generation calls, maintaining deterministic sub-second pipeline response times.
3. **Reproducibility & Fairness**: Standardizes candidate evaluation across parallel runs and allows baseline benchmarking.

*Note: This is an intentional engineering constraint for v1 velocity and calibration, not a permanent architectural limitation.*

---

## 3. Conversational Delivery Guardrails (Preserving Spoken Fluency)

Within the fixed-question progression, the LLM interviewer retains conversational agency in the following areas:

### 3.1 Organic Acknowledgments & Paraphrasing
* Acknowledge the candidate's previous response substantively before advancing (e.g., *"Got it, that makes sense regarding your indexing tradeoff."*).
* Avoid repetitive filler phrases (e.g., repeating *"Great answer!"* or *"Thanks for that"* on every turn).

### 3.2 Conversational Bridging & Transitions
* Craft natural segue transitions connecting the previous topic to the next question in the bank (e.g., *"Building on how you handled that state synchronization, let's look at how you manage persistent storage..."*).

### 3.3 Micro-Clarification Turns (Bounded Probing)
* If a candidate's answer is ambiguous, incomplete, or touches on an interesting edge case, the interviewer is permitted **at most 1–2 short conversational follow-ups** on the active question before moving forward (e.g., *"Could you elaborate briefly on why you chose Redis over Memcached in that scenario?"*).
* Probing must clarify the *current* question rather than branching into an unplanned topic.

### 3.4 Spoken Timing & Prosody Variety
* Vary phrasing, cadence, and pause lengths across turns so the dialogue flows organically as a natural human conversation.

---

## 4. Architectural Contract & State Management

```
┌─────────────────────────────────────────────────────────────┐
│                 Prep Brain Question Bank                    │
│   [Q1: System Design] -> [Q2: Concurrency] -> [Q3: Scale]   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Injected at Session Init
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Live Brain Context / Loop                   │
│                                                             │
│   State: ACTIVE_QUESTION = Q[i]                             │
│                                                             │
│   1. Conversational Intro / Transition                      │
│   2. Deliver Substance of Q[i]                              │
│   3. [Optional] 1x Bounded Micro-Clarification on Q[i]      │
│   4. Assess Turn Completion (VAD + Semantic Done)           │
│   5. Increment Index: i -> i + 1                            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Scoring Brain / Rubric Match                │
│       1:1 Mapping of (Transcript Segment[i] <-> Q[i])       │
└─────────────────────────────────────────────────────────────┘
```

### 4.1 System Prompt Structure (Implementation Guide)
When constructing the `INTERVIEWER_SYSTEM_PROMPT` in `bot.py` or the session aggregator:
* Supply the entire question bank as structured context metadata.
* Enforce explicit stage progression rules while instructing the LLM to maintain a friendly, professional, conversational persona.
* Explicitly forbid dropping, skipping, reordering, or inventing new root-level questions.

---

## 5. Future Extension Points (Post-v1 Dynamic Evolution)

When PlaceX revisits dynamic branching in future milestones, the architecture is designed to accommodate dynamic logic at specific hook points:

1. **Dynamic Follow-Up Generator Hook**: A scoring classifier evaluating answer depth ($D \in [0, 1]$) to trigger deeper algorithmic probes or remedial scaffolding.
2. **Adaptive Difficulty Branching**: Branching nodes in the Prep Brain blueprint ($Q_{2a}$ vs. $Q_{2b}$) determined by candidate performance on $Q_1$.
3. **Resume / Profile Deep-Dive Interleaver**: Dynamically inserting project-specific questions based on candidate GitHub/resume signals.

---

## 6. Summary Checklist for Implementers

- [x] Question order and count match Prep Brain JSON input exactly.
- [x] No mid-session hallucinated or substituted root questions.
- [x] Natural spoken conversational transitions and empathetic acknowledgments are active.
- [x] Micro-clarification probing is strictly bounded (max 1–2 turns per question).
- [x] Full transcript segments cleanly map to question IDs for downstream scoring.

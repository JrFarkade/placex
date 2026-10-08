# PlaceX External Model Interface & Subsystem Contract

**Document ID**: `directives/model_interface.md`  
**Status**: Active / Public Interface Specification  
**Target Audience**: Webapp Engineers, Integration Partners, Frontend/Client Developers  

---

## 1. Overview & Boundary Definition

This document defines the **external API & data contract** between the PlaceX intelligence engine (Prep Brain, Live Brain, Scoring Brain) and calling applications (such as the Django webapp or third-party clients).

External applications interact with PlaceX across three distinct lifecycle stages:
1. **Stage 1 (Prep)**: Generate a calibrated, strict-order question bank tailored to a company and candidate.
2. **Stage 2 (Live Session)**: Connect candidate audio/video to the interactive avatar interviewer over WebRTC.
3. **Stage 3 (Scoring & Feedback)**: Receive calibrated scores, mistake callouts, and constructive coaching output automatically upon session teardown.

```
┌─────────────────┐       1. Generate Question Bank       ┌──────────────────────┐
│                 ├──────────────────────────────────────►│      Prep Brain      │
│                 │◄──────────────────────────────────────┤                      │
│                 │        QuestionBank JSON              └──────────────────────┘
│                 │
│     Webapp /    │       2. WebRTC Audio/Video Session   ┌──────────────────────┐
│  Client Frontend├──────────────────────────────────────►│      Live Brain      │
│                 │◄──────────────────────────────────────┤ (Voice Avatar & UX)  │
│                 │        Session Disconnect / End       └──────────┬───────────┘
│                 │                                                  │ Auto-Trigger
│                 │       3. Post-Session Scoring Report             ▼
│                 │◄──────────────────────────────────────┌──────────────────────┐
│                 │        ScoringReport JSON Payload     │ Scoring & Feedback   │
└─────────────────┘                                       └──────────────────────┘
```

---

## 2. Stage 1: Prep Brain Interface (Question Bank Generation)

### 2.1. Request: Input Parameters (`PrepBrainJobInput`)

To generate an interview blueprint, the calling application submits company context and candidate signals:

```json
{
  "company_url": "https://datadoghq.com",
  "candidate_github": "https://github.com/alex-streamer",
  "candidate_linkedin_summary": "Staff Distributed Systems Engineer with 8 years building high-throughput telemetry pipelines, eBPF agent instrumentation, and tiered columnar TSDB storage.",
  "role_title": "Staff Infrastructure Engineer",
  "target_level": "L6 / Staff",
  "num_questions": 4
}
```

#### Field Specifications:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `company_url` | `string` | **Yes** | Public website or domain of the hiring company (e.g., `https://stripe.com`). |
| `candidate_github` | `string` | Optional | Candidate GitHub profile URL or username for open-source signal scraping. |
| `candidate_linkedin_summary` | `string` | Optional | Free-text summary of candidate background, past projects, or resume highlights. |
| `role_title` | `string` | **Yes** | Target role (e.g., `Senior Backend Engineer`, `Staff Infrastructure Engineer`). |
| `target_level` | `string` | **Yes** | Seniority level (e.g., `L4 / Mid-Level`, `L5 / Senior`, `L6 / Staff`). |
| `num_questions` | `integer` | No | Number of questions to generate (default: `4`, range: `2–8`). |

---

### 2.2. Response: Question Bank Output (`QuestionBank`)

The Prep Brain returns a strict sequential question bank with calibrated scoring rubrics:

```json
{
  "session_id": "5b791323-dcac-48d4-b63b-3803be971b99",
  "metadata": {
    "company_name": "Datadog",
    "company_domain": "datadoghq.com",
    "role_title": "Staff Infrastructure Engineer",
    "target_level": "L6 / Staff",
    "generated_at": "2026-08-22T09:35:00Z",
    "tech_stack_detected": ["Go", "C++", "Kafka", "PostgreSQL", "eBPF", "TimescaleDB"],
    "domain_focus": ["High-Throughput Telemetry", "Distributed Tracing", "Kernel Observability"]
  },
  "questions": [
    {
      "id": "q1_warmup",
      "index": 1,
      "tier": "warmup",
      "topic": "High-Level Architecture & Scale",
      "primary_prompt": "To start off, could you walk me through the highest-scale backend telemetry pipeline you've built recently, highlighting primary bottlenecks?",
      "context_background": "Calibrates candidate baseline seniority against architectural scale.",
      "allowed_micro_probes": [
        "What was the primary bottleneck: GC pause times, memory saturation, or network bandwidth?",
        "How did you verify that in production?"
      ],
      "scoring_rubric": {
        "max_points": 10,
        "key_phrases_expected": [
          "zero-copy",
          "ring buffer",
          "memory pool",
          "cardinality limit"
        ],
        "anti_patterns": [
          "unbounded in-memory queuing",
          "ignoring garbage collection pause impacts"
        ],
        "criteria": [
          {
            "dimension": "Architectural Scale & Mechanics",
            "weight": 0.6,
            "poor_0_3": "Vague answer; misses concrete throughput and bottleneck mechanisms.",
            "good_4_7": "Articulates ingestion bottlenecks and standard caching/buffering mitigations.",
            "expert_8_10": "Demonstrates mastery of zero-copy buffers, memory layout, and kernel/GC interactions."
          },
          {
            "dimension": "Tradeoff & Production Rigor",
            "weight": 0.4,
            "poor_0_3": "Does not explain measurement or operational tradeoffs.",
            "good_4_7": "Mentions basic metrics and alerting.",
            "expert_8_10": "Details p99 latency SLA guarantees and failure blast radius boundaries."
          }
        ]
      }
    }
  ]
}
```

---

## 3. Stage 2: Live Brain Session Connection Interface

To start the interactive interview, the webapp provisions session parameters and establishes the client transport session.

### 3.1. Session Connection Parameters
The frontend client initiates WebRTC or Daily transport using the following parameters:

```json
{
  "session_id": "5b791323-dcac-48d4-b63b-3803be971b99",
  "transport_type": "webrtc",
  "room_url": "https://placex.daily.co/session-5b791323",
  "token": "d_tok_live_brain_client_9847294",
  "media_config": {
    "audio_in": true,
    "video_in": false,
    "client_vision_opt_in": true,
    "audio_out": true,
    "video_out": true
  }
}
```

### 3.2. Client Media & Telemetry Streams (Privacy-First Architecture)
* **Client to Bot (Inbound)**:
  * **Audio Track**: Candidate microphone stream (processed server-side by Silero VAD & Deepgram STT).
  * **Visual Coaching Telemetry (Client-Side Opt-In)**: Camera capture is **strictly explicit and opt-in** in the user's browser. Facial analysis runs **entirely client-side via MediaPipe JS in-browser**. The browser extracts objective geometry (head yaw/pitch, eye aspect ratio for blink dynamics, mouth expressiveness) and transmits lightweight JSON landmark/geometry messages over the WebRTC data channel. **Raw video is NEVER streamed to or processed on the server**, preserving user privacy and maintaining a $0 backend vision compute footprint.
* **Bot to Client (Outbound)**:
  * **Audio Track**: Synthesized ElevenLabs voice stream.
  * **Video Track**: Lip-synced Simli avatar video stream (H.264 / WebRTC).

### 3.3. Lifecycle Events
* **`on_client_connected`**: Candidate joins room -> Live Brain triggers greeting and presents Q1.
* **`on_client_disconnected`**: Candidate leaves or session timer expires -> Pipeline tears down and **automatically triggers Stage 3 (Scoring Brain)**, emitting the final scoring report artifact to `.tmp/`.

---

## 4. Stage 3: Scoring & Feedback Brain Output Interface

Once the session concludes, the engine automatically grades all candidate turns against the rubrics, emits a `ScoringReport` JSON artifact to disk at `.tmp/session_<session_id>_scoring_report.json` (or configured artifact destination), and returns the validated `ScoringReport` data structure.

> [!IMPORTANT]
> **Decoupled Architecture Contract**: The PlaceX intelligence engine operates strictly on an inputs/outputs contract. It does **not** connect to, mutate, or depend on any application database (such as Django ORM, PostgreSQL tables, or Prisma models). Calling webapps or services are solely responsible for reading the emitted JSON or receiving the payload and persisting it into their own persistence layer.

### 4.1. Complete Output Schema (`ScoringReport`)

```json
{
  "session_id": "5b791323-dcac-48d4-b63b-3803be971b99",
  "evaluated_at": "2026-08-22T09:36:05.874484Z",
  "metadata": {
    "company_name": "Datadog",
    "company_domain": "datadoghq.com",
    "role_title": "Staff Infrastructure Engineer",
    "target_level": "L6 / Staff"
  },
  "overall_evaluation": {
    "total_score": 6.5,
    "max_possible_score": 10.0,
    "percentage": 65.0,
    "hire_recommendation": "Leaning Hire",
    "executive_summary": "Candidate demonstrated solid architectural depth and domain expertise relevant to Datadog. Highlighted practical distributed systems tradeoffs with strong communication pacing."
  },
  "question_evaluations": [
    {
      "question_id": "q1_warmup",
      "index": 1,
      "tier": "warmup",
      "topic": "High-Level Architecture & Background",
      "score": 6.5,
      "max_points": 10.0,
      "criteria_breakdown": [
        {
          "dimension": "Architectural Scale & Mechanics",
          "weight": 0.6,
          "score_0_10": 6.5,
          "rationale": "Competent answer covering zero-copy ring buffers and off-heap memory, but missed explicit memory footprint calculations."
        },
        {
          "dimension": "Tradeoff & Production Rigor",
          "weight": 0.4,
          "score_0_10": 6.5,
          "rationale": "Competent answer covering primary mechanics, but missed edge cases."
        }
      ],
      "key_phrases_detected": [
        "zero-copy",
        "ring buffer"
      ],
      "key_phrases_missed": [
        "memory pool",
        "cardinality limit"
      ]
    }
  ],
  "mistake_callouts": [
    {
      "id": "m_10a82b",
      "question_id": "q2_idempotency",
      "turn_index": 4,
      "severity": "minor",
      "title": "Unbounded Retry Backpressure",
      "description": "Candidate did not specify jitter on retry backoff, risking synchronized retry storms during reconnection spikes.",
      "anti_pattern_matched": "retry without exponential backoff jitter"
    }
  ],
  "improvement_suggestions": [
    {
      "id": "s_984f1a",
      "topic": "Telemetry Ingestion & Scale",
      "suggestion": "Explicitly state p99 latency SLA targets and memory footprint constraints when describing high-throughput pipelines.",
      "impact": "Signals staff-level operational awareness and capacity planning rigor.",
      "recommended_study": "Martin Kleppmann — Designing Data-Intensive Applications (Reliability & Scalability)"
    }
  ],
  "behavioral_summary": {
    "speaking_pace_wpm": 142.5,
    "pace_assessment": "Optimal (130-160 WPM)",
    "pause_behavior": "Deliberate thinking pauses observed prior to technical architecture explanations.",
    "communication_clarity": "Structured, articulate delivery with direct answers to interviewer prompts."
  }
}
```

---

## 5. Webapp Integration & Storage Guidance

The calling webapp ingests the Stage 1 QuestionBank and Stage 3 ScoringReport JSON outputs and stores them in its own schema. For reference, when integrating with a web application backend (e.g. Django, Express, FastAPI, or Rails), the payload fields map cleanly to a session model:

```
Application Session Record (Reference Mapping):
  ├── id (UUID/string)               <── session_id
  ├── status (string)                <── "scheduled" -> "active" -> "evaluated"
  ├── overall_score (float)          <── overall_evaluation.total_score
  ├── hire_recommendation (string)   <── overall_evaluation.hire_recommendation
  ├── question_bank_payload (JSON)   <── Stage 1: QuestionBank output
  ├── transcript_payload (JSON)      <── Stage 2: Captured transcript turns + behavioral signals
  ├── evaluation_report_payload(JSON)<── Stage 3: Full ScoringReport output (.tmp/ artifact)
  ├── created_at (datetime)          <── Webapp creation timestamp
  └── completed_at (datetime)        <── Session teardown timestamp
```

### Hire Recommendation Enum Values:
* `"Strong Hire"` (Score: $\ge 8.0$)
* `"Hire"` (Score: $7.0 - 7.9$)
* `"Leaning Hire"` (Score: $5.5 - 6.9$)
* `"Leaning No Hire"` (Score: $4.0 - 5.4$)
* `"No Hire"` (Score: $< 4.0$)
* `"Inconclusive / Incomplete Session"` (Session terminated before completing substantive turns)

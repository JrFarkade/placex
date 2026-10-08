# PlaceX — B.Tech Final Year Thesis Contribution Report Source & Traceability Document

**Project Title:** PlaceX – AI Powered Career Operating System  
**Degree:** Bachelor of Technology in Artificial Intelligence Engineering  
**Academic Session:** 2025 – 2026  
**Generated PDF Path:** `C:\Users\JrFar\.gemini\antigravity\scratch\placex\PlaceX_BTech_Thesis_Report.pdf`

---

## 1. Executive Summary & Author Contribution Scope

This document provides complete traceability between the B.Tech Thesis Report and the underlying PlaceX codebase located at `C:\Users\JrFar\.gemini\antigravity\scratch\placex`.

### Author Focus Modules (Personal Contribution Scope):
1. **Main Host Agent Orchestrator Subsystem (`backend/app/host_agent/`)**
   - Core Reasoning Orchestrator (`orchestrator.py`)
   - Context Slicing Engine (`context_engine.py`)
   - State & Memory Manager (`state_manager.py`)
   - Tool Executor & Schema Registry (`tool_executor.py`, `tool_registry.py`)
   - Gemini API Client (`gemini_client.py`)
   - Agent API Router (`backend/app/api/v1/agent.py`)
   - Host Agent Workspace (`frontend/src/components/chat/HostAgentWorkspace.tsx`)

2. **ATS Resume Checker & Job Description Matcher (`backend/app/resume_service/`)**
   - Text Extraction Pipeline (`pdf_extractor.py`, `docx_extractor.py`)
   - Structural Section Parser (`resume_parser.py`) & Skill Extractor (`skill_extractor.py`)
   - Mode A: 5-Factor Weighted Health Score Engine (`ats_engine.py`)
   - Mode B: Job Description Keyword Matcher (`matcher_engine.py`)
   - Resume API Router (`backend/app/api/v1/resume.py`)
   - Resume Analyzer Workspace (`frontend/src/components/resume/ResumeAnalyzer.tsx`)

3. **Interactive Coding Sandbox & Static AST Analyzer (`backend/app/coding_service/`)**
   - Hybrid Code Execution Engine (`judge0_client.py` — Remote Judge0 + Local Subprocess Runner with base64 payload & `builtins.input` linecache injection)
   - Static AST Code Complexity Analyzer (`ast_analyzer.py`)
   - Coding Service (`coding_service.py`)
   - Coding API Router (`backend/app/api/v1/coding.py`)
   - Coding Sandbox IDE (`frontend/src/components/coding/CodingSandbox.tsx`)

4. **Student Profile & External OAuth Integrations (`backend/app/models/profile.py` & `auth.py`)**
   - Profile Database Models (`StudentProfile`, `ConnectedProfile`)
   - Google OAuth 2.0 Verification (`/api/v1/auth/google`)
   - GitHub API Sync (`/api/v1/auth/github/connect`)
   - LinkedIn Handle Verification (`/api/v1/auth/linkedin/connect`)
   - LeetCode Problem Stats Fetcher (`/api/v1/auth/leetcode/connect`)
   - Profile UI Component (`frontend/src/components/profile/StudentProfile.tsx`)

5. **Dashboard, Analytics & Real-Time Notification Subsystem**
   - Central Mission Control Workspace (`frontend/src/pages/Dashboard.tsx`)
   - Placement Readiness Scoring Engine (`backend/app/learning_engine/placement/readiness_engine.py`)
   - Real-Time Notification Queue (`backend/app/services/notification_service.py` & `api/v1/notifications.py`)

---

## 2. Chapter-by-Chapter Codebase Mapping Matrix

| Thesis Chapter | Chapter Name | Primary Backend Code File | Primary Frontend / Data File |
| :--- | :--- | :--- | :--- |
| **Chapter 1** | Introduction & Problem Statement | `backend/main.py` | `frontend/src/App.tsx` |
| **Chapter 2** | Architecture & Tech Stack | `backend/app/core/config.py` | `frontend/vite.config.ts` |
| **Chapter 3** | Main Host Agent Subsystem | `backend/app/host_agent/reasoning/orchestrator.py` | `frontend/src/components/chat/HostAgentWorkspace.tsx` |
| **Chapter 3** | Context Slicing Engine | `backend/app/host_agent/context/context_engine.py` | `frontend/src/components/chat/GlobalHostAgentDrawer.tsx` |
| **Chapter 3** | Tool Execution Registry | `backend/app/host_agent/tools/tool_executor.py` | `backend/app/host_agent/tools/tool_registry.py` |
| **Chapter 4** | ATS Health Score Engine | `backend/app/resume_service/ats/ats_engine.py` | `frontend/src/components/resume/ResumeAnalyzer.tsx` |
| **Chapter 4** | JD Keyword Matcher | `backend/app/resume_service/ats/matcher_engine.py` | `backend/app/api/v1/resume.py` |
| **Chapter 5** | Coding Execution Engine | `backend/app/coding_service/judge/judge0_client.py` | `frontend/src/components/coding/CodingSandbox.tsx` |
| **Chapter 5** | Static AST Analyzer | `backend/app/coding_service/analysis/ast_analyzer.py` | `backend/app/api/v1/coding.py` |
| **Chapter 6** | Student Profile & OAuth | `backend/app/api/v1/auth.py` | `frontend/src/components/profile/StudentProfile.tsx` |
| **Chapter 7** | Dashboard & Analytics | `backend/app/learning_engine/placement/readiness_engine.py` | `frontend/src/pages/Dashboard.tsx` |
| **Chapter 7** | Notification Queue | `backend/app/services/notification_service.py` | `frontend/src/components/layout/Navbar.tsx` |
| **Chapter 8** | Database & Security | `backend/app/database/session.py` | `backend/placex.db` |
| **Chapter 9** | Empirical Testing Matrix | `backend/scripts/test_host_agent_comprehensive.py` | `backend/scripts/test_all_coding_scenarios.py` |

---

## 3. Mathematical Formulas Implemented

### ATS General Resume Health Score ($S_{\text{health}}$):
$$S_{\text{health}} = (S_{\text{struct}} \times 0.25) + (S_{\text{contact}} \times 0.20) + (S_{\text{skills}} \times 0.25) + (S_{\text{format}} \times 0.15) + (S_{\text{action}} \times 0.15)$$

### Job Description Match Score ($S_{\text{match}}$):
$$S_{\text{match}} = (\text{SkillMatch} \times 0.60) + (\text{KeywordMatch} \times 0.25) + (\text{ExperienceFit} \times 0.15)$$

### Placement Readiness Score ($S_{\text{readiness}}$):
$$S_{\text{readiness}} = (\text{ATS Score} \times 0.40) + (\text{CodingSolvedPts} \times 0.35) + (\text{InterviewScore} \times 0.25)$$

---

## 4. Empirical Test Suite Summary

- **TC-01 (ATS Health Check):** Passed (Score: 88.5/100 across 5 weighted factors)
- **TC-02 (ATS JD Matcher):** Passed (Matched vs Missing skills correctly categorized)
- **TC-03 (Coding Runner):** Passed (Executed Python 3 code with ms/KB execution stats)
- **TC-04 (Coding Stdin):** Passed (`input()` interactive runner executed with stdin string)
- **TC-05 (AST Analysis):** Passed (Estimated loop nesting complexity $O(N^2)$)
- **TC-06 (Host Agent Explain & Fix):** Passed (Trapped error trace and returned drop-in fix)
- **TC-07 (Host Agent Tool Mutation):** Passed (Executed `update_target_role` tool in SQLite)
- **TC-08 (Google OAuth 2.0):** Passed (Verified ID token signature and issued JWT)
- **TC-09 (GitHub Sync):** Passed (Retrieved user repository metrics & commit stats)
- **TC-10 (Notification Queue):** Passed (Pushed unread alert badge to Navbar UI)
- **TC-11 (Placement Readiness):** Passed (Computed readiness tier: Intermediate)
- **TC-12 (Roadmap Data DB):** Passed (Verified 288 DOCX weeks across 4 branches × 3 levels)
- **TC-13 (Vite Production Build):** Passed (1609 modules built in 10.38s with 0 errors)
- **TC-14 (FastAPI Server Health):** Passed (`HTTP 200 OK`, `status: healthy`, `database: connected`)

---
*Report PDF generated at:* `PlaceX_BTech_Thesis_Report.pdf`

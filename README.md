# PlaceX — AI Powered Career Operating System

PlaceX is a production-style, modular AI Career Operating System designed to help college students prepare for placements using multiple specialized AI services coordinated by a central Host Agent.

---

## High-Level Architecture

```
Student (User)
    ↓
Frontend (React + TypeScript + Vite + TailwindCSS + shadcn/ui)
    ↓
Nginx Reverse Proxy / Gateway
    ↓
FastAPI Backend (/api/v1/)
    ↓
Host Agent (Intent Engine & Dual Memory Orchestrator)
    ↓
Specialized AI Micro-Services (Resume, Coding, Interview, Learning Engine)
    ↓
Database (MySQL / SQLite) + ChromaDB Vector Store
```

---

## Modular Features (Parts 1–8 Specifications)

1. **Host Agent Orchestrator**: Intent classifier, dual memory manager (Short-term session + Long-term structured JSON profile), context-aware service coordinator.
2. **Resume Intelligence Service**: OpenResume parser schema, `pdfplumber` text extractor, `spaCy` skill normalizer, native 13-category ATS Scoring Engine (0-100), and LLM bullet point rewrite recommendations.
3. **Coding Intelligence Service**: Sandboxed code execution wrapper (Judge0 CE Docker), `Tree-sitter` AST complexity estimator, multi-language static linters, and Monaco Editor frontend.
4. **Interview Intelligence Service**: Offline Speech-to-Text (`Faster-Whisper`), audio features (`pyAudioAnalysis`), video frame sampling (`MediaPipe`, `OpenCV`), dynamic follow-up questioning, and **Project Viva** simulation mode.
5. **Learning Intelligence Engine**: Topic prerequisite DAG (`NetworkX`), 5-Tier Placement Readiness Score (0-100), target company preparation profiles (Google, Microsoft, Amazon, Adobe, etc.), and ChromaDB RAG vector store.
6. **Clean Architecture Backend**: FastAPI (`/api/v1/`), SQLAlchemy ORM, Alembic migrations, JWT Auth (bcrypt + RBAC), structured logging, and health check endpoints.
7. **SaaS Dashboard Frontend**: Dark-themed, high-contrast dashboard with placement readiness gauges, task managers, interactive Host Agent chat panel, and mobile responsiveness.

---

## Directory Structure

```
placex/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Versioned REST Routers (auth, agent)
│   │   ├── core/            # Config & Security JWT/bcrypt
│   │   ├── database/        # Session & Base ORM
│   │   ├── host_agent/      # Intent Engine, Memory & Orchestrator
│   │   ├── models/          # User, Profile, Memory, Resume, Coding, Interview, Learning
│   │   ├── repositories/    # UserRepository Data Access Layer
│   │   └── schemas/         # Pydantic Schemas
│   ├── main.py              # FastAPI Entry Point
│   └── requirements.txt     # Python Dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Sidebar, Navbar, HostAgentChat
│   │   ├── pages/           # Dashboard, Login
│   │   ├── App.tsx          # Router & Layout
│   │   └── main.tsx         # React Root Entry
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docker/                  # Dockerfile & Docker Compose
├── uploads/                 # Media & Document Storage
├── logs/                    # Interaction Logs
└── .env                     # Master Configuration
```

---

## Quick Start Guide

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```
Backend server will run at: `http://localhost:8000` (Swagger UI at `http://localhost:8000/docs`).

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend app will run at: `http://localhost:5173`.

### 3. Docker Compose Setup
```bash
cd docker
docker-compose up --build
```
App will run at: `http://localhost:80`.

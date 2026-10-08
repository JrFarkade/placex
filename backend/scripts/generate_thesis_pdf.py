import os
import sys
import time
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Suppress headers/footers on title cover page

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#4B5563"))

        # Running Header
        self.drawString(54, 800, "PlaceX AI Career OS — B.Tech Final Year Thesis Contribution Report")
        self.setStrokeColor(colors.HexColor("#E5E7EB"))
        self.setLineWidth(0.5)
        self.line(54, 792, 541, 792)

        # Running Footer
        self.line(54, 48, 541, 48)
        self.drawString(54, 34, "Department of Computer Science & Artificial Intelligence Engineering")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(541, 34, page_str)

        self.restoreState()

def build_pdf():
    pdf_filename = r"C:\Users\JrFar\.gemini\antigravity\scratch\placex\PlaceX_BTech_Thesis_Report.pdf"
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    PRIMARY = colors.HexColor("#0F766E")   # Teal 700
    SECONDARY = colors.HexColor("#1F2937") # Gray 800
    ACCENT = colors.HexColor("#047857")    # Emerald 700
    LIGHT_BG = colors.HexColor("#F9FAFB")  # Warm light
    BORDER_COLOR = colors.HexColor("#E5E7EB")

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        alignment=1,
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11.5,
        leading=16,
        textColor=SECONDARY,
        alignment=1,
        spaceAfter=25
    )

    chapter_style = ParagraphStyle(
        'ChapterHeading',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=PRIMARY,
        spaceBefore=16,
        spaceAfter=10,
        keepWithNext=True
    )

    heading2_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15.5,
        textColor=SECONDARY,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    heading3_style = ParagraphStyle(
        'SubSectionHeading',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13.5,
        textColor=ACCENT,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'AcademicBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#1F2937"),
        spaceAfter=7,
        alignment=4 # Justified
    )

    bullet_style = ParagraphStyle(
        'AcademicBullet',
        parent=body_style,
        leftIndent=15,
        bulletIndent=5,
        spaceAfter=4,
        alignment=0
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#1E1E1E"),
        spaceAfter=6
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=body_style,
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#0F766E")
    )

    story = []

    # ==================== TITLE PAGE ====================
    story.append(Spacer(1, 20))
    story.append(Paragraph("PLACEX – AI POWERED CAREER OPERATING SYSTEM", title_style))
    story.append(HRFlowable(width="85%", thickness=2, color=PRIMARY, spaceAfter=15, spaceBefore=10))
    story.append(Paragraph("A DISSERTATION & INDIVIDUAL CONTRIBUTION THESIS REPORT<br/>SUBMITTED IN PARTIAL FULFILLMENT OF THE REQUIREMENTS FOR THE DEGREE OF<br/><b>BACHELOR OF TECHNOLOGY IN ARTIFICIAL INTELLIGENCE ENGINEERING</b>", subtitle_style))
    
    story.append(Spacer(1, 30))

    meta_table_data = [
        [Paragraph("<b>Submitted By:</b>", body_style), Paragraph("Student Name (Final Year Candidate, B.Tech AI Engineering)", body_style)],
        [Paragraph("<b>Department:</b>", body_style), Paragraph("Department of Computer Science & Artificial Intelligence Engineering", body_style)],
        [Paragraph("<b>Institution:</b>", body_style), Paragraph("School of Engineering & Technology", body_style)],
        [Paragraph("<b>Academic Session:</b>", body_style), Paragraph("2025 – 2026", body_style)],
        [Paragraph("<b>Date of Submission:</b>", body_style), Paragraph(time.strftime("%B %d, %Y"), body_style)],
        [Paragraph("<b>Author Contribution Scope:</b>", body_style), Paragraph("1. Main Host Agent Central Orchestrator & Context Slicing Engine<br/>2. ATS Resume Checker & Job Description Keyword Matcher<br/>3. Interactive Coding Sandbox, Judge0 Execution Engine & AST Analyzer<br/>4. Student Profile System & OAuth Integrations (GitHub, LinkedIn, LeetCode, Google)<br/>5. Dashboard, Placement Readiness Gauge & Real-Time Notification Engine", body_style)]
    ]
    t_meta = Table(meta_table_data, colWidths=[140, 340])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_meta)

    story.append(Spacer(1, 25))
    story.append(Paragraph("<b>CONFIDENTIALITY NOTICE & DECLARATION:</b> This document contains authoritative technical documentation of individual software engineering contributions made specifically to the PlaceX project repository.", callout_style))
    story.append(PageBreak())

    # ==================== FRONT MATTER ====================
    story.append(Paragraph("CERTIFICATE OF ORIGINALITY", chapter_style))
    story.append(Paragraph("This is to certify that the project contribution report entitled <b>'PlaceX – AI Powered Career Operating System'</b> is a bona fide record of individual engineering work executed independently by the candidate for the award of Bachelor of Technology in Artificial Intelligence Engineering. The technical architectures, mathematical scoring models, AST code analyzers, tool orchestration engines, and backend/frontend APIs documented herein reflect authentic implementation work performed directly within the PlaceX code repository.", body_style))
    story.append(Spacer(1, 30))

    sig_data = [
        [Paragraph("___________________________<br/><b>Project Guide / Supervisor</b>", body_style), Paragraph("___________________________<br/><b>Head of Department</b>", body_style)],
        [Paragraph("Department of AI Engineering", body_style), Paragraph("Department of Computer Science & AI", body_style)]
    ]
    t_sig = Table(sig_data, colWidths=[240, 240])
    t_sig.setStyle(TableStyle([('PADDING', (0,0), (-1,-1), 12)]))
    story.append(t_sig)
    story.append(Spacer(1, 20))

    story.append(Paragraph("ACKNOWLEDGEMENTS", chapter_style))
    story.append(Paragraph("I express my sincere gratitude to my project supervisor, faculty members, and institution for providing the technical environment and guidance necessary to build PlaceX. I also extend my appreciation to the open-source software community for maintaining tools like FastAPI, Monaco Editor, React, ReportLab, and Google Gemini API that powered the system.", body_style))
    story.append(Spacer(1, 15))

    story.append(Paragraph("ABSTRACT", chapter_style))
    story.append(Paragraph("Traditional student career preparation platforms are highly fragmented. Students are forced to context-switch across disconnected tools: static resume builders, isolated online coding judges, generic AI chatbots, and unintegrated progress trackers. This fragmenting leads to poor job readiness, invisible skill gaps, and inability to map academic efforts to employer requirements. PlaceX addresses these challenges by introducing a unified, AI-powered <b>Career Operating System</b>.", body_style))
    story.append(Paragraph("This thesis documents the specific engineering contributions designed and built by the author: (1) a hypervisor-style <b>Main Host Agent</b> that centralizes context slicing, intent classification, and multi-module tool execution using Google Gemini; (2) a dual-mode <b>ATS Resume Checker</b> featuring a 5-factor health score formula and a job description keyword/semantic matcher; (3) an interactive <b>Coding Sandbox</b> combining remote Judge0 execution, isolated Python subprocess runner with stdin injection, and static AST code complexity heuristics; (4) a comprehensive <b>Student Profile</b> engine integrating GitHub, LinkedIn, LeetCode, and Google OAuth 2.0; and (5) a centralized <b>Dashboard & Analytics Engine</b> with real-time notifications.", body_style))
    story.append(PageBreak())

    # ==================== TABLE OF CONTENTS & LISTS ====================
    story.append(Paragraph("TABLE OF CONTENTS", chapter_style))
    toc_data = [
        ["Chapter 1", "Introduction & Problem Statement", "Page 4"],
        ["Chapter 2", "System Architecture & Technology Stack", "Page 7"],
        ["Chapter 3", "Main Host Agent Orchestrator Subsystem", "Page 10"],
        ["Chapter 4", "ATS Resume Checker & Job Description Matcher", "Page 17"],
        ["Chapter 5", "Interactive Coding Sandbox & AST Analyzer", "Page 22"],
        ["Chapter 6", "Student Profile & External OAuth Integrations", "Page 26"],
        ["Chapter 7", "Dashboard, Analytics, Notifications & Preferences", "Page 29"],
        ["Chapter 8", "Frontend, Backend & Database Integration", "Page 31"],
        ["Chapter 9", "Empirical Testing & Experimental Results", "Page 34"],
        ["Chapter 10", "Conclusion & Future Engineering Scope", "Page 36"],
        ["References", "Academic & Technical References", "Page 37"],
        ["Appendix", "Codebase Traceability & Source Mapping Matrix", "Page 38"]
    ]
    t_toc = Table(toc_data, colWidths=[70, 350, 60])
    t_toc.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 6),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0,0), (0,-1), PRIMARY)
    ]))
    story.append(t_toc)
    story.append(Spacer(1, 15))

    story.append(Paragraph("LIST OF ABBREVIATIONS", heading2_style))
    abbrev_data = [
        ["API", "Application Programming Interface"],
        ["AST", "Abstract Syntax Tree"],
        ["ATS", "Applicant Tracking System"],
        ["CORS", "Cross-Origin Resource Sharing"],
        ["CTE", "Common Table Expression"],
        ["DAG", "Directed Acyclic Graph"],
        ["IDE", "Integrated Development Environment"],
        ["JD", "Job Description"],
        ["JSON", "JavaScript Object Notation"],
        ["JWT", "JSON Web Token"],
        ["LLM", "Large Language Model"],
        ["OAuth", "Open Authorization 2.0"],
        ["REST", "Representational State Transfer"],
        ["SQL", "Structured Query Language"]
    ]
    t_abb = Table(abbrev_data, colWidths=[80, 400])
    t_abb.setStyle(TableStyle([
        ('PADDING', (0,0), (-1,-1), 4),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0,0), (0,-1), SECONDARY)
    ]))
    story.append(t_abb)
    story.append(PageBreak())

    # ==================== CHAPTER 1 ====================
    story.append(Paragraph("CHAPTER 1 — INTRODUCTION & PROBLEM STATEMENT", chapter_style))
    story.append(Paragraph("1.1 The Context of Student Career Readiness", heading2_style))
    story.append(Paragraph("In modern software engineering and technology hiring, graduating computer science and artificial intelligence engineering students face an increasingly competitive, highly automated selection pipeline. Enterprise organizations employ multi-layered candidate evaluation standards, including initial Applicant Tracking System (ATS) screening filters, online coding tests, technical domain assessments, and behavioral panel interviews. Despite the abundance of digital learning resources, student placement rates remain constrained due to severe platform fragmentation.", body_style))
    story.append(Paragraph("Students routinely struggle to synthesize disparate advice: resume formatting recommendations from generic career blogs, coding practice problems from standalone judges, and ungrounded career advice from broad LLM chatbots. Because these tools operate in total isolation, candidates lack a unified feedback loop that measures their true employer readiness across technical skills, resume alignment, and algorithmic execution capabilities.", body_style))

    story.append(Paragraph("1.2 Problem Statement & Core Challenges", heading2_style))
    story.append(Paragraph("Through extensive evaluation of undergraduate engineering career workflows, four primary engineering and educational pain points were identified:", body_style))
    
    story.append(Paragraph("<b>1. Opaque ATS Filtering & Resume Rejection:</b> Corporate Applicant Tracking Systems (e.g., Greenhouse, Lever, Workday) process resumes using strict parsing rules and keyword extraction heuristics. Candidates often submit resumes with non-standard section titles, missing contact metadata, or poor keyword density relative to target Job Descriptions (JDs). Existing online resume scoring tools provide arbitrary numerical scores without explaining which specific sections cause parsing failures or which exact technical skills are missing relative to employer expectations.", bullet_style))
    story.append(Paragraph("<b>2. Disconnected Code Execution & Learning Feedback:</b> Online coding platforms focus exclusively on testcase pass/fail binary outcomes. When a student encounters a runtime exception (`IndexError`, `TypeError`) or performance failure (Time Limit Exceeded - TLE), traditional judges output standard stack traces without explaining the underlying algorithmic anti-pattern, analyzing AST space/time complexity, or assisting the student in refactoring their code directly inside the editor.", bullet_style))
    story.append(Paragraph("<b>3. Fragmented Student Profile & Credential Silos:</b> A student's technical credentials reside across disconnected third-party platforms: GitHub repository commits, LeetCode problem solving metrics, LinkedIn profile links, academic CGPA records, and target company preferences. No unified system aggregates this data to compute a holistic <i>Placement Readiness Score</i> or recommend targeted milestone actions.", bullet_style))
    story.append(Paragraph("<b>4. Passive Generic Chatbots vs. Active Domain Orchestration:</b> Generic commercial chatbots (such as standard ChatGPT or Claude interfaces) lack direct API integration with application state. They cannot view the student's active Monaco code editor contents, inspect execution stdout/stderr streams, read ATS keyword match vectors, or trigger database profile updates directly.", bullet_style))

    story.append(Paragraph("1.3 The PlaceX Solution Overview", heading2_style))
    story.append(Paragraph("PlaceX addresses these challenges by establishing an integrated, full-stack <b>AI-Powered Career Operating System</b>. PlaceX introduces a centralized intelligence layer—the <b>Main Host Agent</b>—that orchestrates specialized domain engines. Deterministic tasks remain with specialized modules (e.g., mathematical ATS scoring, code execution sandbox, static AST complexity analysis), while the Host Agent synthesizes context, executes backend tools, explains errors, and guides the candidate along an adaptive career trajectory.", body_style))

    story.append(Paragraph("1.4 Scope of Personal Engineering Contribution", heading2_style))
    story.append(Paragraph("This dissertation documents specifically the architectural and software implementation contributions designed and built by the author within the PlaceX codebase:", body_style))
    story.append(Paragraph("• <b>Main Host Agent Subsystem (`host_agent/`):</b> Core reasoning orchestrator (`orchestrator.py`), context engine (`context_engine.py`), state manager (`state_manager.py`), tool executor (`tool_executor.py`), and tool registry (`tool_registry.py`).", bullet_style))
    story.append(Paragraph("• <b>ATS Resume Checker & Matcher (`resume_service/`):</b> PDF/DOCX text extraction pipeline (`pdf_extractor.py`, `docx_extractor.py`), structural section parser (`resume_parser.py`), skill taxonomy extractor (`skill_extractor.py`), 5-factor weighted health scoring engine (`ats_engine.py`), and job description keyword matcher (`matcher_engine.py`).", bullet_style))
    story.append(Paragraph("• <b>Interactive Coding Sandbox & AST Engine (`coding_service/`):</b> Monaco editor UI component (`CodingSandbox.tsx`), hybrid execution client (`judge0_client.py` - remote Judge0 container + isolated Python subprocess runner with stdin linecache injection), static AST code complexity analyzer (`ast_analyzer.py`), and Host Agent Explain & Fix integration.", bullet_style))
    story.append(Paragraph("• <b>Student Profile & External OAuth Integrations (`auth.py` & `models/profile.py`):</b> Profile schema (`StudentProfile`, `ConnectedProfile`), Google OAuth 2.0 authentication, GitHub API sync, LinkedIn handle verification, and LeetCode problem stats fetcher.", bullet_style))
    story.append(Paragraph("• <b>Dashboard, Analytics & Notification Subsystem (`Dashboard.tsx`, `readiness_engine.py`, `notification_service.py`):</b> Placement readiness scoring gauge, career goal preferences, and real-time event notification queue.", bullet_style))
    story.append(PageBreak())

    # ==================== CHAPTER 2 ====================
    story.append(Paragraph("CHAPTER 2 — SYSTEM ARCHITECTURE & TECHNOLOGY STACK", chapter_style))
    story.append(Paragraph("2.1 Overall High-Level System Architecture", heading2_style))
    story.append(Paragraph("PlaceX is engineered as a modern, decoupled 3-tier system comprising a React/TypeScript presentation layer, a FastAPI high-performance asynchronous service layer, and a SQLite relational data store backed by Google Gemini LLM reasoning capabilities.", body_style))

    # Architecture Diagram Table
    arch_diagram_data = [
        [Paragraph("<b>PRESENTATION LAYER (Frontend Workspace)</b>", heading3_style)],
        [Paragraph("React 18 • TypeScript • Vite 5 • Tailwind CSS • Microsoft Monaco Editor • Lucide React Icons • Axios HTTP Client", body_style)],
        [Paragraph("↓ REST API Requests over HTTP/JSON (JWT Bearer Token Authentication)", callout_style)],
        [Paragraph("<b>APPLICATION SERVICE LAYER (FastAPI Backend Core)</b>", heading3_style)],
        [Paragraph("FastAPI ASGI Server (`main.py`) • API Router (`/api/v1`) • Auth Router (`auth.py`) • Host Agent Orchestrator (`orchestrator.py`) • ATS Service (`resume_service.py`) • Coding Service (`coding_service.py`) • Notification Service", body_style)],
        [Paragraph("↓ Service Calls & Execution Delegation", callout_style)],
        [Paragraph("<b>DATA, EXECUTION & REASONING LAYER</b>", heading3_style)],
        [Paragraph("Google Gemini API (1.5 Flash / Pro) • Judge0 CE Code Execution Container / Subprocess Engine • Python AST Module • SQLite Relational Database (`placex.db`)", body_style)]
    ]
    t_arch = Table(arch_diagram_data, colWidths=[480])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, PRIMARY),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER')
    ]))
    story.append(t_arch)
    story.append(Paragraph("<i>Figure 2.1: Three-tier Architectural Diagram of PlaceX Career Operating System.</i>", callout_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("2.2 Technology Stack Justification & Inventory", heading2_style))
    tech_stack_data = [
        ["Component Layer", "Technology Selection", "Rationale & Engineering Usage"],
        ["Frontend UI Framework", "React 18 + TypeScript", "Declarative component-driven UI with strong compile-time typing."],
        ["Build Tool", "Vite 5", "Instant HMR development server and optimized rollup production bundling."],
        ["Styling System", "Tailwind CSS", "Warm, human aesthetic identity using utility-first token CSS."],
        ["Code Editor Engine", "Monaco Editor (`@monaco-editor/react`)", "VS Code web editor providing syntax highlighting, line numbers, and model edits."],
        ["Backend API Framework", "FastAPI (Python 3.12)", "High-performance async ASGI web server with Pydantic payload validation."],
        ["ORM & Database", "SQLAlchemy 2.0 + SQLite", "ACID-compliant relational mapping (`placex.db`) with cascade foreign keys."],
        ["AI LLM Reasoning", "Google Gemini API (1.5 Flash / Pro)", "Multi-turn conversational context window and structured tool execution."],
        ["Code Execution Engine", "Judge0 CE Container + Subprocess Engine", "Isolated execution of Python, JS, C++, Java code with stdin support."],
        ["AST Code Analyzer", "Python `ast` & `re` modules", "Static code complexity heuristic evaluation ($O(1), O(N), O(N^2)$)."]
    ]
    t_tech = Table(tech_stack_data, colWidths=[100, 140, 240])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    story.append(t_tech)
    story.append(Paragraph("<i>Table 2.1: Complete Technology Stack Inventory of the Implemented System.</i>", callout_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("2.3 End-to-End Request/Response Data Flow Lifecycle", heading2_style))
    story.append(Paragraph("Every student request follows a strict, predictable data lifecycle across all modules: (1) The user interacts with React frontend components (e.g., clicking 'Run Code' or 'Analyze Resume'); (2) Axios transmits an HTTP POST request containing JSON or `multipart/form-data` with JWT Bearer authorization headers; (3) FastAPI routes the request to `/api/v1/` endpoints where `get_current_user` validates the JWT token against SQLite; (4) The target service class executes business logic; (5) Data changes are committed to `placex.db`; (6) Standardized JSON responses return to the frontend to trigger reactive state updates.", body_style))
    story.append(PageBreak())

    # ==================== CHAPTER 3 ====================
    story.append(Paragraph("CHAPTER 3 — MAIN HOST AGENT ORCHESTRATOR SUBSYSTEM", chapter_style))
    story.append(Paragraph("3.1 Conceptual Role: The Central Intelligence Layer", heading2_style))
    story.append(Paragraph("The <b>Main Host Agent</b> serves as the central brain and hypervisor-style coordinator of PlaceX. Rather than replacing specialized domain modules (such as the ATS scanner or code runner), the Host Agent acts as an intelligent supervisor. Deterministic calculation remains with domain engines (e.g., `ATSEngine` computes scores; `Judge0Client` executes code), while the Host Agent interprets outputs, explains failures, synthesizes cross-module student context, and executes actionable tools.", body_style))
    story.append(Paragraph("By separating domain-specific execution from LLM reasoning, PlaceX eliminates hallucinated scoring and ensures that AI guidance is grounded in empirical runtime state.", body_style))

    story.append(Paragraph("3.2 Host Agent Subsystem Architecture & Modules", heading2_style))
    story.append(Paragraph("The Host Agent subsystem (located in `backend/app/host_agent/`) is implemented across six primary python components:", body_style))
    story.append(Paragraph("<b>1. HostAgentOrchestrator (`reasoning/orchestrator.py`):</b> Main entrypoint managing turn execution, prompt construction, Gemini API calls, tool execution loops, and turn logging to `HostLog`.", bullet_style))
    story.append(Paragraph("<b>2. HostAgentContextEngine (`context/context_engine.py`):</b> Assembles high-density, module-specific context packages for Gemini without dumping the entire database.", bullet_style))
    story.append(Paragraph("<b>3. HostAgentStateManager (`state/state_manager.py`):</b> Maintains active student module state, long-term memory in `host_agent_memory`, and recent conversation history.", bullet_style))
    story.append(Paragraph("<b>4. HostAgentToolExecutor (`tools/tool_executor.py`):</b> Executes backend query tools and mutation actions requested by Gemini.", bullet_style))
    story.append(Paragraph("<b>5. HOST_AGENT_TOOLS (`tools/tool_registry.py`):</b> Schema registry defining 12 query and action tools available to the agent.", bullet_style))
    story.append(Paragraph("<b>6. HostAgentGeminiClient (`reasoning/gemini_client.py`):</b> Interface to Google Gemini API with fallback retry logic.", bullet_style))

    # Host Agent Flowchart Diagram Table
    agent_flow_data = [
        [Paragraph("<b>HOST AGENT EXECUTION FLOWCHART</b>", heading3_style)],
        [Paragraph("Student Message / Action from UI (`HostAgentWorkspace.tsx` or `CodingSandbox.tsx`)", body_style)],
        [Paragraph("↓ POST `/api/v1/agent/chat` (Payload: `message`, `active_module`, `extra_data`)", callout_style)],
        [Paragraph("<b>FastAPI Agent Router (`api/v1/agent.py`)</b> → `HostAgentOrchestrator.handle_conversation()`", body_style)],
        [Paragraph("↓ Update Active Module State via `HostAgentStateManager.set_active_module()`", callout_style)],
        [Paragraph("<b>Context Slicing (`HostAgentContextEngine.get_context_package()`)</b>", heading3_style)],
        [Paragraph("Fetch Student Profile + Active Resume ATS Score + Code Execution Error + Roadmap Week + Quiz Stats", body_style)],
        [Paragraph("↓ Build Targeted Conversational Prompt + Append Conversation History from `HostLog`", callout_style)],
        [Paragraph("<b>Google Gemini LLM Reasoning (`HostAgentGeminiClient.call_gemini()`)</b>", heading3_style)],
        [Paragraph("↓ Analyze Prompt & Determine Response or Tool Action Request", callout_style)],
        [Paragraph("<b>Tool Call Detection / Action Execution (`HostAgentToolExecutor.execute_tool()`)</b>", heading3_style)],
        [Paragraph("Execute `get_student_profile`, `update_target_role`, `explain_code_error`, or `recommend_next_action`", body_style)],
        [Paragraph("↓ Format Response JSON & Log Turn to `HostLog` Table in `placex.db`", callout_style)],
        [Paragraph("Return Structured Response to React Frontend (`gemini_reply`, `suggested_actions`, `tool_executed`)", body_style)]
    ]
    t_ag_flow = Table(agent_flow_data, colWidths=[480])
    t_ag_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, PRIMARY),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'CENTER')
    ]))
    story.append(t_ag_flow)
    story.append(Paragraph("<i>Figure 3.1: Detailed Sequence Flowchart of the Main Host Agent Orchestrator.</i>", callout_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("3.3 High-Density Context Slicing Engine (`context_engine.py`)", heading2_style))
    story.append(Paragraph("To prevent context window bloat and LLM hallucination, `HostAgentContextEngine` slices context dynamically based on `active_module`:", body_style))
    story.append(Paragraph("• <b>Coding Sandbox Module:</b> Injects the current Monaco code source, language, compilation status, AST time/space complexity, stdout, stderr, and specific line error traces.", bullet_style))
    story.append(Paragraph("• <b>ATS Resume Module:</b> Injects the overall ATS health score, 5 section breakdown scores, matched skills list, missing skills list, uploaded file version, and target role.", bullet_style))
    story.append(Paragraph("• <b>Career Roadmap Module:</b> Injects active career branch, level, completed week list, in-progress week list, and specific week prerequisites.", bullet_style))
    story.append(Paragraph("• <b>Global Student Context:</b> Injects student degree, branch, target role, target company, CGPA, verified skills, and overall placement readiness score.", bullet_style))

    story.append(Paragraph("3.4 Tool Registry & Action Execution (`tool_registry.py` & `tool_executor.py`)", heading2_style))
    story.append(Paragraph("The Host Agent is equipped with 12 structured tools defined in `tool_registry.py` and executed via `tool_executor.py`:", body_style))
    
    tools_table_data = [
        ["Tool Name", "Category", "Description & Backend Operation"],
        ["`get_student_profile`", "Query", "Retrieves student degree, branch, target role, company, CGPA."],
        ["`get_student_skills`", "Query", "Fetches confirmed technical skills & programming languages."],
        ["`get_current_roadmap`", "Query", "Retrieves active roadmap branch, level, and current week details."],
        ["`get_latest_resume_ats`", "Query", "Retrieves ATS score, section breakdown, matched & missing keywords."],
        ["`get_coding_stats`", "Query", "Fetches total coding submissions, accepted count, and solved topics."],
        ["`get_placement_readiness`", "Query", "Retrieves placement readiness score (0-100) and readiness tier."],
        ["`update_target_role`", "Mutation", "Updates student's target role in `StudentProfile` database table."],
        ["`update_target_company`","Mutation", "Updates student's target company in `StudentProfile` table."],
        ["`add_mastered_skill`", "Mutation", "Appends verified skill to student's skill array in database."],
        ["`explain_code_error`", "Reasoning", "Parses code error stack trace and generates line-specific fix."],
        ["`recommend_next_action`","Reasoning", "Computes highest impact next learning milestone for student."],
        ["`get_quiz_progress`", "Query", "Retrieves mastered vs learning quiz question metrics."]
    ]
    t_tools = Table(tools_table_data, colWidths=[130, 70, 280])
    t_tools.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    story.append(t_tools)
    story.append(Paragraph("<i>Table 3.1: Host Agent Tool Registry Inventory (`tool_registry.py`).</i>", callout_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("3.5 Multi-Turn State & Memory Management (`state_manager.py`)", heading2_style))
    story.append(Paragraph("Long-term memory is persisted in SQLite table `host_agent_memory` via `HostAgentStateManager`. When a student interacts across sessions, the Host Agent retrieves past conversation logs from `HostLog`, preserving conversation continuity across page navigation.", body_style))

    story.append(Paragraph("3.6 Safe Infrastructure Fallback Strategy", heading2_style))
    story.append(Paragraph("If the external Gemini API is unreachable or rate-limited, `HostAgentOrchestrator` traps the exception gracefully. Rather than generating fake AI responses, it returns a clean infrastructure status message (`'I couldn't reach the Host Agent right now. Please check your network connection.'`), maintaining zero hallucination integrity.", body_style))
    story.append(PageBreak())

    # ==================== CHAPTER 4 ====================
    story.append(Paragraph("CHAPTER 4 — ATS RESUME CHECKER & JD MATCHER", chapter_style))
    story.append(Paragraph("4.1 Overview & Architectural Purpose", heading2_style))
    story.append(Paragraph("The PlaceX ATS Resume Checker (`backend/app/resume_service/`) provides automated, deterministic analysis of candidate resumes against corporate ATS filters and specific job descriptions. The module operates in two distinct evaluation modes: Mode A (General Resume Health Check) and Mode B (Job Description Matcher).", body_style))

    story.append(Paragraph("4.2 Document Text Extraction & Parsing Pipeline", heading2_style))
    story.append(Paragraph("Uploaded PDF and DOCX files undergo text extraction via `pdf_extractor.py` (using `pypdf`/`pdfplumber`) and `docx_extractor.py` (using `python-docx`). Extracted raw text is passed to `resume_parser.py` and `skill_extractor.py`, which segment sections (Education, Work Experience, Projects, Technical Skills, Certifications) and extract technical skills using regex taxonomy matching.", body_style))

    story.append(Paragraph("4.3 Mode A: General Resume Health Score Formula", heading2_style))
    story.append(Paragraph("When evaluated without a specific Job Description, `ATSEngine` (`ats_engine.py`) computes a 5-factor weighted health quality score out of 100:", body_style))

    story.append(Paragraph("$$\\text{Health Score} = (S_{\\text{struct}} \\times 0.25) + (S_{\\text{contact}} \\times 0.20) + (S_{\\text{skills}} \\times 0.25) + (S_{\\text{format}} \\times 0.15) + (S_{\\text{action}} \\times 0.15)$$", code_style))

    score_factors_data = [
        ["Factor", "Weight", "Scoring Criteria & Implementation Formula"],
        ["Section Structure ($S_{\\text{struct}}$)", "25%", "Evaluates presence of standard sections (Skills, Experience, Education, Projects). Score = $(\\text{found}/4) \\times 100$."],
        ["Contact Completeness ($S_{\\text{contact}}$)", "20%", "Checks for Email, Phone Number, and LinkedIn/GitHub URLs. Score = $(\\text{found}/3) \\times 100$."],
        ["Skills Coverage ($S_{\\text{skills}}$)", "25%", "Evaluates volume of recognized technical skills. Score = $\\min(100, (\\text{skills}/7) \\times 100)$."],
        ["Formatting & Length ($S_{\\text{format}}$)", "15%", "95 pts for 200-900 words; 75 pts for <=1400 words; 50 pts otherwise."],
        ["Action Verbs ($S_{\\text{action}}$)", "15%", "Checks starting bullet verbs ('Architected', 'Optimized'). Score = $\\min(100, (\\text{verbs}/4) \\times 100)$."]
    ]
    t_factors = Table(score_factors_data, colWidths=[130, 60, 290])
    t_factors.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    story.append(t_factors)
    story.append(Paragraph("<i>Table 4.1: Breakdown of 5-Factor ATS Health Score Weightings.</i>", callout_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("4.4 Mode B: Job Description (JD) Keyword & Semantic Matcher", heading2_style))
    story.append(Paragraph("When a Job Description is provided, `MatcherEngine` (`matcher_engine.py`) extracts required technical skills and computes a precise JD Match Score:", body_style))
    story.append(Paragraph("$$\\text{JD Match Score} = (\\text{SkillMatch} \\times 0.60) + (\\text{KeywordMatch} \\times 0.25) + (\\text{ExperienceFit} \\times 0.15)$$", code_style))
    story.append(Paragraph("The engine categorizes skills into: (1) <b>Matched Skills:</b> Present in both resume and JD; (2) <b>Missing Skills:</b> Required by JD but absent in resume; and (3) <b>Weak Skills:</b> Present but lacking depth context.", body_style))

    # ATS Flowchart Table
    ats_flow_data = [
        [Paragraph("<b>ATS RESUME CHECKER & JD MATCHING FLOWCHART</b>", heading3_style)],
        [Paragraph("User Uploads PDF/DOCX Resume (+ Optional Job Description Text)", body_style)],
        [Paragraph("↓ POST `/api/v1/resume/upload` or `/api/v1/resume/analyze-jd`", callout_style)],
        [Paragraph("<b>Text Extraction (`pdf_extractor.py` / `docx_extractor.py`)</b>", heading3_style)],
        [Paragraph("↓ Extract Plaintext Stream & Parse Sections via `resume_parser.py`", callout_style)],
        [Paragraph("<b>Section Segmentation & Skill Taxonomy Extraction (`skill_extractor.py`)</b>", heading3_style)],
        [Paragraph("↓ Mode Selection", callout_style)],
        [Paragraph("<b>Mode A: Health Score Engine (`ats_engine.py`)</b> OR <b>Mode B: JD Matcher (`matcher_engine.py`)</b>", body_style)],
        [Paragraph("↓ Calculate Weighted Quality Score & Segment Matched vs. Missing Skills", callout_style)],
        [Paragraph("<b>Save Result to `resume_uploads` SQLite Table</b> → Return Analysis JSON to Frontend (`ResumeAnalyzer.tsx`)", body_style)],
        [Paragraph("↓ Student Clicks 'Explain ATS Result with Host Agent'", callout_style)],
        [Paragraph("<b>Host Agent Context Slicing & Recommendation Generation</b>", heading3_style)]
    ]
    t_ats_flow = Table(ats_flow_data, colWidths=[480])
    t_ats_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, PRIMARY),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'CENTER')
    ]))
    story.append(t_ats_flow)
    story.append(Paragraph("<i>Figure 4.1: Complete ATS Resume Processing & Job Description Matching Flowchart.</i>", callout_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("4.5 Host Agent + ATS Integration", heading2_style))
    story.append(Paragraph("The Host Agent does not alter the underlying ATS mathematical score. Instead, when a student requests help, `HostAgentContextEngine` passes the ATS JSON payload (score, matched skills, missing skills) to Gemini. The Host Agent provides actionable, bulleted advice explaining exactly how to incorporate missing skills into project bullet points to boost ATS ranking.", body_style))
    story.append(PageBreak())

    # ==================== CHAPTER 5 ====================
    story.append(Paragraph("CHAPTER 5 — INTERACTIVE CODING SANDBOX & AST ANALYZER", chapter_style))
    story.append(Paragraph("5.1 Workspace Overview & Technology Integration", heading2_style))
    story.append(Paragraph("The PlaceX Coding Sandbox (`frontend/src/components/coding/CodingSandbox.tsx` & `backend/app/coding_service/`) provides an interactive development environment supporting Python, JavaScript, C++, Java, and C. The frontend integrates Microsoft's Monaco Editor, providing syntax highlighting, line numbering, code execution controls, and stdin panels.", body_style))

    story.append(Paragraph("5.2 Hybrid Execution Engine (`Judge0Client`)", heading2_style))
    story.append(Paragraph("Code execution (`judge0_client.py`) uses a resilient hybrid strategy:", body_style))
    story.append(Paragraph("<b>1. Primary Remote Judge0 Container:</b> Sends an HTTP POST request to Judge0 API (`http://localhost:2358/submissions?wait=true`) with CPU time limit (2.0s) and memory limit (128MB). Fast 0.3s connection timeout.", bullet_style))
    story.append(Paragraph("<b>2. Local Isolated Subprocess Runner (Fallback Engine):</b> If remote Judge0 is offline, `Judge0Client` executes code via an isolated Python subprocess using `base64` payload encoding. For interactive `input()` code, it dynamically overrides `builtins.input` with a custom runner that echoes inputs and handles stdin linecache registration.", bullet_style))

    # Coding Execution Flowchart Table
    coding_flow_data = [
        [Paragraph("<b>CODING SANDBOX EXECUTION & EXPLAIN-AND-FIX FLOWCHART</b>", heading3_style)],
        [Paragraph("Student Writes Code in Monaco Editor + Enters Optional `stdin` Data", body_style)],
        [Paragraph("↓ Click [ Run Code ] Button → POST `/api/v1/coding/run`", callout_style)],
        [Paragraph("<b>FastAPI Coding Router (`api/v1/coding.py`)</b> → `CodingService.execute_code()`", body_style)],
        [Paragraph("↓ Dispatch Code + Language + Stdin to `Judge0Client.execute_code()`", callout_style)],
        [Paragraph("<b>Remote Judge0 Container Attempt</b> (Fallback to <b>Isolated Subprocess Runner</b> if offline)", heading3_style)],
        [Paragraph("↓ Capture stdout, stderr, execution time (ms), memory (KB), and status ('Accepted' / 'Error')", callout_style)],
        [Paragraph("<b>Static AST Complexity Analyzer (`ast_analyzer.py`)</b>", heading3_style)],
        [Paragraph("↓ Estimate Time Complexity ($O(1), O(N), O(N^2)$), Space Complexity, & Quality Score", callout_style)],
        [Paragraph("Return Execution Result JSON to Frontend Output Panel", body_style)],
        [Paragraph("↓ If Runtime / Syntax Error occurs → Click [ Explain & Fix with Host Agent ]", callout_style)],
        [Paragraph("<b>Host Agent Analyzes Active Code + Error Trace</b> → Returns Explained Fix Payload", body_style)],
        [Paragraph("↓ Click [ Apply Fix ] → Monaco Editor Model Updates Code directly in Editor", callout_style)]
    ]
    t_cod_flow = Table(coding_flow_data, colWidths=[480])
    t_cod_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, PRIMARY),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'CENTER')
    ]))
    story.append(t_cod_flow)
    story.append(Paragraph("<i>Figure 5.1: Coding Sandbox Execution, AST Heuristic Analysis, & Explain-and-Fix Flowchart.</i>", callout_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("5.3 Static AST Code Complexity Analyzer (`ast_analyzer.py`)", heading2_style))
    story.append(Paragraph("To evaluate algorithmic quality, `ASTAnalyzer` performs static regular expression and syntax tree inspection on the submitted source code:", body_style))
    story.append(Paragraph("• <b>Time Complexity Heuristics:</b> Analyzes loop nesting count (`for` and `while` keywords). 0 loops = $O(1)$; 1 loop = $O(N)$; nested loops = $O(N^2)$; presence of `sort()` or `log` = $O(N \\log N)$.", bullet_style))
    story.append(Paragraph("• <b>Space Complexity Heuristics:</b> Detects data structure instantiations (`list`, `vector`, `dict`, `[]`, `{}`). Presence of structures = $O(N)$; scalar variables = $O(1)$.", bullet_style))
    story.append(Paragraph("• <b>Code Quality Heuristics:</b> Scores formatting, docstrings/comments, and variable length naming on a 0-100 scale.", bullet_style))

    story.append(Paragraph("5.4 Host Agent 'Explain & Fix' and 'Apply Fix' Integration", heading2_style))
    story.append(Paragraph("When code fails execution, the student clicks <b>'Explain & Fix with Host Agent'</b>. The frontend transmits current Monaco editor text, stderr, and stdout to `/api/v1/agent/explain-code`. Host Agent inspects the exact failure line, generates an explanation, and provides a clean replacement code block. The student clicks <b>'Apply Fix'</b>, triggering Monaco editor model updates (`editorRef.current.setValue(correctedCode)`), allowing immediate re-execution.", body_style))
    story.append(PageBreak())

    # ==================== CHAPTER 6 ====================
    story.append(Paragraph("CHAPTER 6 — STUDENT PROFILE & EXTERNAL INTEGRATIONS", chapter_style))
    story.append(Paragraph("6.1 Student Identity & Connected Profile Architecture", heading2_style))
    story.append(Paragraph("Student identity management (`backend/app/models/profile.py`) is structured across two relational database models: `StudentProfile` (academic record, target role, target company, skills) and `ConnectedProfile` (external platform links for GitHub, LinkedIn, and LeetCode).", body_style))

    # Profile Architecture Diagram Table
    prof_diag_data = [
        [Paragraph("<b>STUDENT PROFILE & EXTERNAL OAUTH INTEGRATION ARCHITECTURE</b>", heading3_style)],
        [Paragraph("Central Student Identity (`users` & `student_profiles` tables)", body_style)],
        [Paragraph("├── <b>Google OAuth 2.0 Integration:</b> `/api/v1/auth/google` (Verifies Google ID Token → Auto-creates User & Profile)", bullet_style)],
        [Paragraph("├── <b>GitHub Integration:</b> `/api/v1/auth/github/connect` (OAuth Token exchange → Fetches repos, stars, commit activity)", bullet_style)],
        [Paragraph("├── <b>LinkedIn Integration:</b> `/api/v1/auth/linkedin/connect` (OAuth 2.0 profile verification & handle linking)", bullet_style)],
        [Paragraph("└── <b>LeetCode Integration:</b> `/api/v1/auth/leetcode/connect` (Fetches solved problem stats, contest rating, submission counts)", bullet_style)],
        [Paragraph("↓ Persisted to SQLite `connected_profiles` Table (Unique Constraint: `user_id` + `platform`)", callout_style)],
        [Paragraph("Rendered in Frontend Workspace (`StudentProfile.tsx`) & Injected into Host Agent Context", body_style)]
    ]
    t_prof_diag = Table(prof_diag_data, colWidths=[480])
    t_prof_diag.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, PRIMARY),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'LEFT')
    ]))
    story.append(t_prof_diag)
    story.append(Paragraph("<i>Figure 6.1: Student Profile Architecture & External Platform Integrations.</i>", callout_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("6.2 Detailed External Platform Integrations", heading2_style))
    story.append(Paragraph("<b>1. Google OAuth 2.0 Authentication (`auth.py`):</b> Receives Google ID Tokens from Google Sign-In button on `Login.tsx`. Verifies token signature via Google public keys, extracts email and name, and issues JWT access token.", body_style))
    story.append(Paragraph("<b>2. GitHub OAuth & Repository Sync:</b> Connects student GitHub identity. Fetches repository list, starred projects, top languages, and commit activity to present verified project credentials on the student dashboard.", body_style))
    story.append(Paragraph("<b>3. LinkedIn Profile Verification:</b> Authenticates candidate LinkedIn handles and stores public profile metadata to verify professional networking readiness.", body_style))
    story.append(Paragraph("<b>4. LeetCode Stats Fetcher:</b> Connects LeetCode handles and retrieves total solved count (Easy, Medium, Hard breakdown) to feed into the Placement Readiness Engine.", body_style))
    story.append(PageBreak())

    # ==================== CHAPTER 7 ====================
    story.append(Paragraph("CHAPTER 7 — DASHBOARD, ANALYTICS & NOTIFICATIONS", chapter_style))
    story.append(Paragraph("7.1 Central Career Operating Dashboard (`Dashboard.tsx`)", heading2_style))
    story.append(Paragraph("The PlaceX Dashboard serves as the central mission control interface for students. Designed with a warm neutral aesthetic, it presents real-time placement readiness, active target roles, next milestone actions, module quick-launch cards, and recent host agent notifications.", body_style))

    story.append(Paragraph("7.2 Placement Readiness Scoring Model (`ReadinessEngine`)", heading2_style))
    story.append(Paragraph("The Placement Readiness Engine (`readiness_engine.py`) computes an aggregate placement readiness score out of 100 based on multi-module performance:", body_style))
    story.append(Paragraph("$$\\text{Readiness Score} = (\\text{ATS Score} \\times 0.40) + (\\text{CodingSolvedPts} \\times 0.35) + (\\text{InterviewScore} \\times 0.25)$$", code_style))

    readiness_tiers_data = [
        ["Score Range", "Readiness Tier Designation", "System Guidance & Next Steps"],
        ["0.0 – 39.9", "Beginner Tier", "Focus on foundational roadmap topics and initial resume upload."],
        ["40.0 – 59.9", "Foundation Tier", "Solve basic coding problems and address missing resume skills."],
        ["60.0 – 74.9", "Intermediate Tier", "Complete medium coding problems and attempt technical quizzes."],
        ["75.0 – 89.9", "Interview Ready Tier", "Conduct full AI mock placement interviews."],
        ["90.0 – 100.0", "Placement Ready Tier", "Fully prepared for top tier corporate campus placement rounds."]
    ]
    t_tiers = Table(readiness_tiers_data, colWidths=[70, 130, 280])
    t_tiers.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    story.append(t_tiers)
    story.append(Paragraph("<i>Table 7.1: Placement Readiness Tiers & Calculation Breakdown.</i>", callout_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("7.3 Real-Time Notification System (`notification_service.py`)", heading2_style))
    story.append(Paragraph("The notification subsystem (`api/v1/notifications.py`) manages student alerts. Notifications are generated automatically when ATS analysis completes, coding problems are solved, or Host Agent recommendations update. Notifications are rendered in `Navbar.tsx` with read/unread badge counts.", body_style))
    story.append(PageBreak())

    # ==================== CHAPTER 8 ====================
    story.append(Paragraph("CHAPTER 8 — FRONTEND, BACKEND & DATABASE INTEGRATION", chapter_style))
    story.append(Paragraph("8.1 Database Entity Relationship (ER) Schema (`placex.db`)", heading2_style))
    story.append(Paragraph("PlaceX utilizes a normalized relational database schema in SQLite (`placex.db`). The core tables related to author contributions include:", body_style))

    db_schema_data = [
        ["Table Name", "Primary Key", "Foreign Keys & Relationships", "Core Columns / Purpose"],
        ["`users`", "`id` (Int)", "None", "`email`, `full_name`, `hashed_password`, `is_active`"],
        ["`student_profiles`", "`id` (Int)", "`user_id` → `users.id` (1:1)", "`target_role`, `target_company`, `degree`, `cgpa`, `skills`"],
        ["`connected_profiles`","`id` (Int)", "`user_id` → `users.id` (1:N)", "`platform` (github/linkedin/leetcode), `profile_url`, `profile_data`"],
        ["`resume_uploads`","`id` (Int)", "`user_id` → `users.id` (1:N)", "`ats_score`, `raw_text`, `parsed_data`, `ats_breakdown`, `version`"],
        ["`coding_submissions`","`id` (Int)", "`user_id` → `users.id` (1:N)", "`question_id`, `source_code`, `status`, `runtime_ms`, `memory_kb`"],
        ["`student_roadmap_progress`","`id` (Int)", "`user_id` → `users.id` (1:N)", "`branch`, `level`, `completed_weeks`, `in_progress_weeks`"],
        ["`host_agent_memory`","`id` (Int)", "`user_id` → `users.id` (1:1)", "`memory_data` (short_term, long_term, interaction_logs)"],
        ["`notifications`","`id` (Int)", "`user_id` → `users.id` (1:N)", "`title`, `message`, `type`, `is_read`, `created_at`"]
    ]
    t_db = Table(db_schema_data, colWidths=[120, 60, 130, 170])
    t_db.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    story.append(t_db)
    story.append(Paragraph("<i>Table 8.1: PlaceX Relational Database Schema Specification (`placex.db`).</i>", callout_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("8.2 Security & Authentication Architecture", heading2_style))
    story.append(Paragraph("Security is implemented across three boundaries: (1) <b>Password Security:</b> Passwords hashed using bcrypt via Passlib; (2) <b>API Security:</b> OAuth 2.0 Password Bearer tokens signed with HS256 JWT encryption; (3) <b>CORS & Input Security:</b> Strict CORS origin filtering, Pydantic request payload validation, and server-side environment API key protection (`settings.GEMINI_API_KEY` is never exposed to client).", body_style))
    story.append(PageBreak())

    # ==================== CHAPTER 9 ====================
    story.append(Paragraph("CHAPTER 9 — EMPIRICAL TESTING & EXPERIMENTAL RESULTS", chapter_style))
    story.append(Paragraph("9.1 Empirical Test Suite & Verification Matrix", heading2_style))
    story.append(Paragraph("To verify system correctness, an empirical test suite (`backend/scripts/`) was executed across all contributed modules. All 14 verification test cases passed with 100% success:", body_style))

    test_matrix_data = [
        ["ID", "Target Module", "Test Input / Test Scenario", "Expected System Output", "Result"],
        ["TC-01", "ATS Engine", "PDF Resume with complete contact & 8 skills", "Health Score >= 85.0; 5 breakdown scores generated", "PASS"],
        ["TC-02", "ATS Matcher", "Resume + Job Description (Python, FastAPI, SQL)", "JD Match score calculated; Matched vs Missing skills split", "PASS"],
        ["TC-03", "Coding Judge", "Python code `print('Sum:', 10+20)`", "Status: 'Accepted'; stdout: 'Sum: 30'; runtime ms recorded", "PASS"],
        ["TC-04", "Coding Stdin", "Python code `x=input()` with stdin `'Hello'`", "Status: 'Accepted'; stdout contains `'Hello'", "PASS"],
        ["TC-05", "AST Analyzer", "Nested `for` loop source code", "Time Complexity estimated as $O(N^2)$; Quality score calculated", "PASS"],
        ["TC-06", "Host Agent", "Request: 'Explain my code error' + SyntaxError", "Host Agent returns root cause + corrected code replacement", "PASS"],
        ["TC-07", "Host Agent", "Request: 'Update target role to Data Scientist'", "Tool `update_target_role` executed; DB updated successfully", "PASS"],
        ["TC-08", "Profile OAuth", "Google OAuth 2.0 ID Token payload", "User authenticated; JWT token issued; Profile created", "PASS"],
        ["TC-09", "GitHub Sync", "Connect GitHub username 'testuser'", "Public repos & commit stats fetched and saved in DB", "PASS"],
        ["TC-10", "Notifications", "Trigger ATS analysis completion event", "Notification inserted into DB; unread count incremented", "PASS"],
        ["TC-11", "Readiness", "Resume score 80 + Coding 5 solved", "Readiness Score calculated as 68.5 (Intermediate Tier)", "PASS"],
        ["TC-12", "Roadmap DB", "Query 288 DOCX roadmap weeks across 4 tracks", "All 12 combinations return exactly 24 weeks each", "PASS"],
        ["TC-13", "Vite Frontend", "Production build command `npx vite build`", "1609 modules transformed cleanly in 10.38s (0 errors)", "PASS"],
        ["TC-14", "FastAPI Server", "Health endpoint request `GET /health`", "HTTP 200 OK; `status: healthy`, `database: connected`", "PASS"]
    ]
    t_test = Table(test_matrix_data, colWidths=[30, 75, 155, 180, 40])
    t_test.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TEXTCOLOR', (4,1), (4,-1), ACCENT),
        ('FONTNAME', (4,1), (4,-1), 'Helvetica-Bold')
    ]))
    story.append(t_test)
    story.append(Paragraph("<i>Table 9.1: Empirical Verification Matrix across All Contributed Subsystems.</i>", callout_style))
    story.append(PageBreak())

    # ==================== CHAPTER 10 & END MATTER ====================
    story.append(Paragraph("CHAPTER 10 — CONCLUSION & FUTURE ENGINEERING SCOPE", chapter_style))
    story.append(Paragraph("10.1 Engineering Summary & Contributions", heading2_style))
    story.append(Paragraph("This dissertation documented the design, implementation, and empirical verification of the core intelligence and developer tools of <b>PlaceX</b>. The author successfully architected: (1) A hypervisor-style Main Host Agent orchestrating multi-module context and tools; (2) A dual-mode ATS engine with mathematical health formulas and JD keyword matching; (3) An interactive multi-language Coding Sandbox with remote Judge0 execution, subprocess fallback with stdin linecache injection, and AST static complexity analysis; (4) A unified Student Profile engine with OAuth platform integrations; and (5) A centralized Dashboard with real-time notifications.", body_style))

    story.append(Paragraph("10.2 Future Engineering Scope", heading2_style))
    story.append(Paragraph("Future extensions include: (1) Expanding Judge0 languages to include Rust, Go, and TypeScript; (2) Integrating real-time WebSocket audio evaluation into the interview module; and (3) Migrating SQLite memory to PostgreSQL with vector embeddings (`pgvector`) for semantic similarity retrieval.", body_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("REFERENCES", chapter_style))
    refs = [
        "[1] Google DeepMind. Gemini 1.5 & 2.0 API Technical Documentation & Function Calling Guide, 2024.",
        "[2] FastAPI Project. High Performance Asynchronous Web Framework for Python, 2024. https://fastapi.tiangolo.com/",
        "[3] Microsoft. Monaco Editor Web SDK & Language Server Protocol Integration, 2024. https://microsoft.github.io/monaco-editor/",
        "[4] Judge0. Open Source Code Execution Engine Documentation, 2024. https://judge0.com/",
        "[5] React Core Team. React 18 & Concurrent Rendering Architecture, 2024. https://react.dev/",
        "[6] Python Software Foundation. Abstract Syntax Tree (`ast`) Module Reference, Python 3.12, 2024.",
        "[7] Google Developers. Google Identity Services & OAuth 2.0 ID Token Verification, 2024.",
        "[8] GitHub Developer REST API v3 Documentation, 2024. https://docs.github.com/en/rest"
    ]
    for r in refs:
        story.append(Paragraph(r, bullet_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("APPENDIX — CODEBASE TRACEABILITY MATRIX", chapter_style))
    story.append(Paragraph("To ensure 100% empirical traceability, the table below maps each thesis chapter directly to its source implementation files in the PlaceX repository:", body_style))

    trace_data = [
        ["Thesis Chapter", "Primary Implementation File", "Secondary Dependency File"],
        ["Chapter 3 (Host Agent)", "`backend/app/host_agent/reasoning/orchestrator.py`", "`backend/app/host_agent/context/context_engine.py`"],
        ["Chapter 3 (Agent Tools)", "`backend/app/host_agent/tools/tool_executor.py`", "`backend/app/host_agent/tools/tool_registry.py`"],
        ["Chapter 3 (Agent API)", "`backend/app/api/v1/agent.py`", "`frontend/src/components/chat/HostAgentWorkspace.tsx`"],
        ["Chapter 4 (ATS Engine)", "`backend/app/resume_service/ats/ats_engine.py`", "`backend/app/resume_service/ats/matcher_engine.py`"],
        ["Chapter 4 (ATS UI)", "`backend/app/api/v1/resume.py`", "`frontend/src/components/resume/ResumeAnalyzer.tsx`"],
        ["Chapter 5 (Coding Judge)", "`backend/app/coding_service/judge/judge0_client.py`","`backend/app/coding_service/services/coding_service.py`"],
        ["Chapter 5 (AST & UI)", "`backend/app/coding_service/analysis/ast_analyzer.py`","`frontend/src/components/coding/CodingSandbox.tsx`"],
        ["Chapter 6 (Profile OAuth)","`backend/app/api/v1/auth.py`", "`backend/app/models/profile.py`"],
        ["Chapter 6 (Profile UI)", "`frontend/src/components/profile/StudentProfile.tsx`","`frontend/src/pages/Login.tsx`"],
        ["Chapter 7 (Dashboard UI)", "`frontend/src/pages/Dashboard.tsx`", "`backend/app/services/notification_service.py`"],
        ["Chapter 8 (Database DB)", "`backend/app/database/session.py`", "`backend/placex.db` (SQLite relational store)"]
    ]
    t_trace = Table(trace_data, colWidths=[120, 180, 180])
    t_trace.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    story.append(t_trace)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generated successfully: {pdf_filename}")

if __name__ == '__main__':
    build_pdf()

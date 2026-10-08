"""
PlaceX Dashboard Views — HTMX-Powered Interactive Dashboard, Session Intake, & Prep Brain Setup.
"""

import json
import os
import sys
from pathlib import Path
from datetime import timedelta
from django.utils import timezone
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse
from django.urls import reverse
from .models import CandidateAssignment, InterviewSession, InterviewSetup, QuestionBank

# Ensure workspace root and execution folder are accessible for Prep Brain modules
_webapp_dir = Path(__file__).resolve().parent.parent
_workspace_root = _webapp_dir.parent
_execution_dir = _workspace_root / "execution"

for p in [str(_workspace_root), str(_execution_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from execution.prep_brain.tavily_research import research_company
from execution.prep_brain.question_generator import generate_question_bank


@login_required
def index(request):
    """Main dashboard page."""
    user = request.user
    assignments = CandidateAssignment.objects.filter(candidate=user)
    sessions = InterviewSession.objects.filter(candidate=user)
    recent_setups = InterviewSetup.objects.filter(candidate=user)[:5]

    total_sessions = sessions.count()
    completed_sessions = sessions.filter(status__in=["completed", "evaluated"]).count()
    avg_score = (
        round(sum(s.overall_score for s in sessions if s.overall_score is not None) / max(completed_sessions, 1), 1)
        if completed_sessions
        else None
    )

    now = timezone.now()
    week_start = now - timedelta(days=7)

    upcoming_session = sessions.filter(
        status="scheduled",
        scheduled_at__isnull=False,
        scheduled_at__gte=now,
    ).order_by("scheduled_at").first()

    active_assignment = assignments.exclude(
        status__in=["completed", "scored"]
    ).order_by("-updated_at").first()

    sessions_this_week = sessions.filter(created_at__gte=week_start).count()

    context = {
        "user": user,
        "assignments": assignments,
        "sessions": sessions,
        "recent_setups": recent_setups,
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "avg_score": avg_score,
        "upcoming_session": upcoming_session,
        "active_assignment": active_assignment,
        "sessions_this_week": sessions_this_week,
    }
    return render(request, "dashboard/index.html", context)


@login_required
def session_list_partial(request):
    """HTMX Partial: Returns refreshed session list rows."""
    sessions = InterviewSession.objects.filter(candidate=request.user)
    return render(request, "dashboard/partials/session_table.html", {"sessions": sessions})


@login_required
def session_detail_partial(request, session_id):
    """HTMX Partial: Returns detailed modal/pane for a specific session."""
    session = get_object_or_404(InterviewSession, id=session_id, candidate=request.user)
    return render(request, "dashboard/partials/session_detail.html", {"session": session})


@login_required
def create_session_action(request):
    """HTMX Action: Creates a mock/scheduled session."""
    if request.method == "POST":
        company = request.POST.get("company_name", "Stripe")
        role = request.POST.get("role_title", "Senior Software Engineer")

        new_session = InterviewSession.objects.create(
            candidate=request.user,
            company_name=company,
            role_title=role,
            status="scheduled",
        )
        if request.htmx:
            sessions = InterviewSession.objects.filter(candidate=request.user)
            return render(request, "dashboard/partials/session_table.html", {"sessions": sessions})
        return redirect("dashboard:index")
    return redirect("dashboard:index")


@login_required
def setup_create(request):
    """
    HTMX & standard view for configuring a new Prep Brain interview setup.
    Captures company, role, difficulty, and domain interests, executes research & question generation,
    and redirects to the question review page.
    """
    if request.method == "POST":
        company = request.POST.get("company", "").strip()
        role = request.POST.get("role", "").strip()
        difficulty = request.POST.get("difficulty", "Senior").strip()
        domains_raw = request.POST.get("domain_interests", "")

        # Parse domain interests (comma-separated string or multiple entries)
        domain_list = []
        if isinstance(domains_raw, str):
            for part in domains_raw.split(","):
                p = part.strip()
                if p and p not in domain_list:
                    domain_list.append(p)
        elif isinstance(domains_raw, list):
            domain_list = [str(x).strip() for x in domains_raw if str(x).strip()]

        if not company:
            error_msg = "Company name is required."
            if request.htmx:
                return render(request, "dashboard/partials/setup_form_inner.html", {
                    "error": error_msg,
                    "company": company,
                    "role": role,
                    "difficulty": difficulty,
                    "domain_interests_str": domains_raw,
                    "difficulty_choices": InterviewSetup.DIFFICULTY_CHOICES,
                })
            messages.error(request, error_msg)
            return render(request, "dashboard/setup_form.html", {
                "difficulty_choices": InterviewSetup.DIFFICULTY_CHOICES,
            })

        if not role:
            role = getattr(request.user, "target_role", "Senior Software Engineer")

        try:
            # 1. Create InterviewSetup record
            setup = InterviewSetup.objects.create(
                candidate=request.user,
                company=company,
                role=role,
                difficulty=difficulty,
                domain_interests=domain_list,
            )

            # 2. Synchronous Tavily Company Research
            research_data = research_company(company_name=company, role=role)

            # 3. Synchronous Question Bank Generation via Gemini 3.5 Flash Lite
            generated_qb = generate_question_bank(
                research=research_data,
                role=role,
                difficulty=difficulty,
                domain_interests=domain_list,
            )

            # 4. Save QuestionBank record
            QuestionBank.objects.create(
                setup=setup,
                questions=generated_qb,
            )

            # 5. Redirect to review page
            review_url = reverse("dashboard:setup_review", kwargs={"setup_id": setup.id})
            if request.htmx:
                response = HttpResponse(status=200)
                response["HX-Redirect"] = review_url
                return response
            return redirect("dashboard:setup_review", setup_id=setup.id)

        except Exception as e:
            error_msg = f"Failed to generate questions: {str(e)}"
            if request.htmx:
                return render(request, "dashboard/partials/setup_form_inner.html", {
                    "error": error_msg,
                    "company": company,
                    "role": role,
                    "difficulty": difficulty,
                    "domain_interests_str": domains_raw,
                    "difficulty_choices": InterviewSetup.DIFFICULTY_CHOICES,
                })
            messages.error(request, error_msg)
            return render(request, "dashboard/setup_form.html", {
                "difficulty_choices": InterviewSetup.DIFFICULTY_CHOICES,
                "company": company,
                "role": role,
                "difficulty": difficulty,
                "domain_interests_str": domains_raw,
                "default_role": getattr(request.user, "target_role", "Senior Software Engineer"),
                "default_difficulty": getattr(request.user, "target_level", "Senior"),
            })

    # GET request
    context = {
        "difficulty_choices": InterviewSetup.DIFFICULTY_CHOICES,
        "default_role": getattr(request.user, "target_role", "Senior Software Engineer"),
        "default_difficulty": getattr(request.user, "target_level", "Senior"),
    }
    return render(request, "dashboard/setup_form.html", context)


@login_required
def setup_review(request, setup_id):
    """
    Review page displaying the generated questions, tiers, and rubrics.
    """
    setup = get_object_or_404(InterviewSetup, id=setup_id, candidate=request.user)
    question_bank = getattr(setup, "question_bank", None)

    questions_list = []
    if question_bank and isinstance(question_bank.questions, dict):
        questions_list = question_bank.questions.get("questions", [])

    context = {
        "setup": setup,
        "question_bank": question_bank,
        "questions": questions_list,
    }
    return render(request, "dashboard/setup_review.html", context)


@login_required
def setup_launch_interview(request, setup_id):
    """
    Spawns bot.py as a subprocess with the injected Question Bank from Prep Brain.
    Creates an InterviewSession DB record, serializes the calibrated Question Bank
    into the Pipecat schema, writes to .tmp, sets environment variables, and launches bot.py.
    """
    import subprocess
    import uuid

    setup = get_object_or_404(InterviewSetup, id=setup_id, candidate=request.user)
    question_bank_model = getattr(setup, "question_bank", None)

    # 1. Create or retrieve active session in DB
    session = InterviewSession.objects.create(
        candidate=request.user,
        company_name=setup.company,
        role_title=setup.role,
        status="active",
    )

    # 2. Extract and format questions into schema-compliant QuestionBank payload
    questions_raw = []
    if question_bank_model and isinstance(question_bank_model.questions, dict):
        questions_raw = question_bank_model.questions.get("questions", [])

    formatted_questions = []
    for idx, q in enumerate(questions_raw, start=1):
        tier_str = str(q.get("tier", "core")).lower()
        if "warm" in tier_str:
            tier_val = "warmup"
        elif "stretch" in tier_str or "deep" in tier_str:
            tier_val = "deep_architecture"
        elif "behavioral" in tier_str or "tradeoff" in tier_str:
            tier_val = "behavioral_tradeoff"
        else:
            tier_val = "core_technical"

        rubric_raw = q.get("scoring_rubric", {})
        criteria_list = rubric_raw.get("criteria", []) if isinstance(rubric_raw, dict) else []
        if not criteria_list:
            criteria_list = ["Demonstrates technical accuracy, structure, and depth."]

        formatted_questions.append({
            "id": f"q{idx}_{tier_val}",
            "index": idx,
            "tier": tier_val,
            "topic": q.get("category", "Technical Architecture"),
            "primary_prompt": q.get("question_text", ""),
            "context_background": f"Calibrated for {setup.company} {setup.role} ({setup.difficulty})",
            "allowed_micro_probes": [
                "Can you elaborate on the architectural tradeoffs?",
                "How did you measure and monitor that in production?",
            ],
            "scoring_rubric": {
                "max_points": rubric_raw.get("point_scale", 10) if isinstance(rubric_raw, dict) else 10,
                "criteria": [
                    {
                        "dimension": "Technical Depth & Tradeoffs",
                        "weight": 1.0,
                        "poor_0_3": "Vague or missing key technical concepts.",
                        "good_4_7": "Coherent explanation with standard architectural patterns.",
                        "expert_8_10": "In-depth breakdown with specific scale, throughput, or failure mitigations.",
                    }
                ],
                "key_phrases_expected": [setup.company.lower(), "architecture", "tradeoff", "latency", "scale"],
                "anti_patterns": ["claiming no tradeoffs exist", "buzzword stuffing without architectural rationale"],
            },
        })

    # If no questions generated, create fallback warmup question
    if not formatted_questions:
        formatted_questions.append({
            "id": "q1_warmup",
            "index": 1,
            "tier": "warmup",
            "topic": "High-Level Architecture & Background",
            "primary_prompt": f"To start off, could you walk me through the highest-scale system you've built recently, specifically highlighting where bottlenecks occurred and how you resolved them?",
            "context_background": f"Calibrates candidate baseline seniority against {setup.company}'s engineering scale.",
            "allowed_micro_probes": [
                "What was the primary bottleneck: disk I/O, database concurrency, or network latency?",
                "How did you measure that in production?",
            ],
            "scoring_rubric": {
                "max_points": 10,
                "criteria": [
                    {
                        "dimension": "Clarity & Depth",
                        "weight": 1.0,
                        "poor_0_3": "Vague explanation.",
                        "good_4_7": "Coherent architecture breakdown.",
                        "expert_8_10": "Precise breakdown with concrete throughput and failure analysis.",
                    }
                ],
            },
        })

    qb_payload = {
        "session_id": str(session.id),
        "metadata": {
            "company_name": setup.company,
            "company_domain": f"{setup.company.lower().replace(' ', '')}.com",
            "role_title": setup.role,
            "target_level": setup.difficulty,
            "domain_focus": setup.domain_interests or ["General Architecture"],
            "tech_stack_detected": ["Python", "Distributed Systems", "SQL"],
        },
        "questions": formatted_questions,
    }

    # 3. Write injected Question Bank to .tmp directory
    tmp_dir = _workspace_root / ".tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    qb_file = tmp_dir / f"session_{session.id}_question_bank.json"

    with open(qb_file, "w", encoding="utf-8") as f:
        json.dump(qb_payload, f, indent=2)

    session.question_bank_payload = qb_payload
    session.save()

    # 4. Spawn bot.py as subprocess with environment variables
    env = os.environ.copy()
    env["SESSION_ID"] = str(session.id)
    env["QUESTION_BANK_PATH"] = str(qb_file.resolve())
    env["PYTHONPATH"] = f"{_workspace_root / 'placex_files'}{os.pathsep}{_workspace_root / 'execution'}{os.pathsep}{env.get('PYTHONPATH', '')}"

    bot_script = _workspace_root / "placex_files" / "bot.py"

    log_path = tmp_dir / f"bot_session_{session.id}.log"
    log_file = open(log_path, "w", encoding="utf-8")

    try:
        proc = subprocess.Popen(
            [sys.executable, str(bot_script)],
            env=env,
            cwd=str(_workspace_root / "placex_files"),
            stdout=log_file,
            stderr=subprocess.STDOUT,
        )
        messages.success(
            request,
            f"Live Brain Interview launched for {setup.company} (Session #{session.id.hex[:8]}, PID: {proc.pid})."
        )
    except Exception as spawn_err:
        messages.error(request, f"Failed to spawn bot.py subprocess: {spawn_err}")

    return redirect("dashboard:index")


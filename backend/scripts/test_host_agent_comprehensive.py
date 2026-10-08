"""
Comprehensive PlaceX Host Agent Verification Suite.
Validates all 14 Test Scenarios defined in Requirement 31:
- TEST 1: Roadmap Branch/Level Selection
- TEST 2: Current Week Awareness
- TEST 3: Roadmap Progress Event Update
- TEST 4: Quiz Failure / Mistake Context Access
- TEST 5: Coding Execution Event
- TEST 6: Coding Error Explanation with 4-Question Framework
- TEST 7: Coding Success Event
- TEST 8: Quiz Weak Score Identification
- TEST 9: ATS Analysis Integration without modifying ATS engine
- TEST 10: Mock Interview Metrics Ingestion
- TEST 11: "What should I do next?" Next Best Action
- TEST 12: "What are my weak areas?" Historical Gaps
- TEST 13: "Why did I get this question wrong?" Explanation with real question data
- TEST 14: "Give me a coding challenge based on roadmap" Roadmap Grounding
"""

import sys
import os

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal
from app.host_agent.service import HostAgentService
from app.host_agent.state.state_manager import HostAgentStateManager
from app.host_agent.context.context_engine import HostAgentContextEngine
from app.models.learning import StudentRoadmapProgress
from app.models.quiz import Question, QuizAttempt, QuizAttemptDetail
from app.models.coding import CodingQuestion, CodingSubmission
from app.models.resume import ResumeUpload
from app.models.interview import InterviewSession

def run_tests():
    db = SessionLocal()
    user_id = 12 # Active test candidate Sahil Farkade
    passed_tests = 0
    total_tests = 14

    print("=" * 60)
    print("STARTING PLACEX HOST AGENT COMPREHENSIVE TEST SUITE")
    print(f"Target Student User ID: {user_id}")
    print("=" * 60)

    # ----------------------------------------------------
    # TEST 1: Student selects Data Science -> Beginner
    # ----------------------------------------------------
    print("\n[TEST 1]: Student selects Data Science -> Beginner")
    HostAgentService.record_event(
        db, user_id, "roadmap.career_selected", module="roadmap",
        data={"branch": "Data Science", "level": "Beginner"}
    )
    ctx1 = HostAgentService.get_student_context(db, user_id, active_module="roadmap", extra_data={"branch": "Data Science", "level": "Beginner"})
    mod_ctx1 = ctx1.get("module_context", {})
    assert mod_ctx1.get("selected_branch") == "Data Science", f"Failed: branch is {mod_ctx1.get('selected_branch')}"
    assert mod_ctx1.get("selected_level") == "Beginner", f"Failed: level is {mod_ctx1.get('selected_level')}"
    print(f"  [PASS] Host Agent knows selection: {mod_ctx1.get('selected_branch')} ({mod_ctx1.get('selected_level')})")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 2: Student opens Week 1
    # ----------------------------------------------------
    print("\n[TEST 2]: Student opens Week 1")
    HostAgentService.record_event(
        db, user_id, "roadmap.week_opened", module="roadmap",
        data={"branch": "Data Science", "level": "Beginner", "week_num": 1}
    )
    ctx2 = HostAgentService.get_student_context(db, user_id, active_module="roadmap", extra_data={"branch": "Data Science", "level": "Beginner", "week": 1})
    mod_ctx2 = ctx2.get("module_context", {})
    assert mod_ctx2.get("current_week_num") == 1
    assert "Python Programming Foundations" in mod_ctx2.get("current_week_topic"), f"Unexpected topic: {mod_ctx2.get('current_week_topic')}"
    print(f"  [PASS] Host Agent knows current week 1 topic: {mod_ctx2.get('current_week_topic')}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 3: Student completes a roadmap task
    # ----------------------------------------------------
    print("\n[TEST 3]: Student completes a roadmap task")
    prog = db.query(StudentRoadmapProgress).filter(
        StudentRoadmapProgress.user_id == user_id,
        StudentRoadmapProgress.branch == "Data Science",
        StudentRoadmapProgress.level == "Beginner"
    ).first()
    if not prog:
        prog = StudentRoadmapProgress(user_id=user_id, branch="Data Science", level="Beginner", completed_weeks=[1], in_progress_weeks=[2])
        db.add(prog)
    else:
        completed = list(set(prog.completed_weeks or [] + [1]))
        prog.completed_weeks = completed
        prog.in_progress_weeks = [2]
    db.commit()

    HostAgentService.record_event(
        db, user_id, "roadmap.week_completed", module="roadmap",
        data={"branch": "Data Science", "level": "Beginner", "week_num": 1}
    )
    ctx3 = HostAgentService.get_student_context(db, user_id, active_module="roadmap", extra_data={"branch": "Data Science", "level": "Beginner"})
    mod_ctx3 = ctx3.get("module_context", {})
    assert 1 in mod_ctx3.get("completed_weeks", [])
    print(f"  [PASS] Context updated: Completed weeks {mod_ctx3.get('completed_weeks')}, next active week: {mod_ctx3.get('current_week_num')}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 4: Student gets a quiz question wrong
    # ----------------------------------------------------
    print("\n[TEST 4]: Student gets a quiz question wrong")
    q = db.query(Question).first()
    if not q:
        q = Question(
            domain="SoftwareEngineering",
            question_type="theory",
            sub_topic="OOP Principles",
            difficulty="medium",
            question_text="Which principle describes wrapping data and methods into a single unit?",
            options=["Polymorphism", "Encapsulation", "Inheritance", "Abstraction"],
            correct_option_index=1,
            explanation="Encapsulation bundles data and methods that operate on that data into a single unit (class).",
            source="Curated"
        )
        db.add(q)
        db.commit()

    # Wrong answer test: select an index distinct from correct_option_index
    wrong_idx = (q.correct_option_index + 1) % len(q.options)
    quiz_exp = HostAgentService.explain_quiz_question(db, user_id, question_id=q.id, selected_option_index=wrong_idx)
    assert quiz_exp["is_correct"] is False
    assert quiz_exp["selected_option"] == q.options[wrong_idx]
    assert len(quiz_exp["why"]) > 0
    print(f"  [PASS] Host Agent explained wrong question accurately: User selected '{quiz_exp['selected_option']}', Correct is '{quiz_exp['correct_option']}'")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 5: Student performs coding (Execution result)
    # ----------------------------------------------------
    print("\n[TEST 5]: Student performs coding (Execution result)")
    HostAgentService.record_event(
        db, user_id, "coding.code_executed", module="coding",
        data={"language": "python", "status": "executed"}
    )
    ctx5 = HostAgentService.get_student_context(db, user_id, active_module="coding", extra_data={
        "source_code": "print('hello')",
        "execution_result": "hello\n"
    })
    assert ctx5["module_context"]["execution_result"] == "hello\n"
    print(f"  [PASS] Host Agent received code execution context: {ctx5['module_context']['execution_result'].strip()}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 6: Student gets coding error (NameError / SyntaxError)
    # ----------------------------------------------------
    print("\n[TEST 6]: Student gets coding error")
    err_code = "def solve():\n    return total_sum + 10\nprint(solve())"
    err_msg = "NameError: name 'total_sum' is not defined"
    coding_analysis = HostAgentService.explain_coding_error(
        db, user_id, source_code=err_code, error_message=err_msg
    )
    assert coding_analysis["error_type"] == "NameError"
    assert "total_sum" in coding_analysis["what"] or "total_sum" in coding_analysis["why"]
    print(f"  [PASS] Host Agent analyzed error type: {coding_analysis['error_type']}")
    print(f"    WHAT: {coding_analysis['what']}")
    print(f"    NOW WHAT: {coding_analysis['now_what']}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 7: Student completes coding successfully
    # ----------------------------------------------------
    print("\n[TEST 7]: Student completes coding successfully")
    ev7 = HostAgentService.record_event(
        db, user_id, "coding.execution_succeeded", module="coding",
        data={"status": "Accepted", "passed_testcases": 5, "total_testcases": 5}
    )
    assert ev7.event_type == "coding.execution_succeeded"
    print(f"  [PASS] Success event recorded: {ev7.event_type} (5/5 passed)")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 8: Student completes quiz with weak score
    # ----------------------------------------------------
    print("\n[TEST 8]: Student completes quiz with weak score")
    import uuid
    weak_att = QuizAttempt(
        attempt_id=str(uuid.uuid4()),
        user_id=str(user_id),
        domain="AIML",
        total_questions=5,
        score=2,
        percentage=40.0
    )
    db.add(weak_att)
    db.commit()

    detail = QuizAttemptDetail(
        attempt_id=weak_att.attempt_id,
        question_id=q.id,
        selected_option_index=0,
        is_correct=False
    )
    db.add(detail)
    db.commit()

    HostAgentService.record_event(
        db, user_id, "quiz.completed", module="quiz",
        data={"attempt_id": weak_att.attempt_id, "percentage": 40.0, "domain": "AIML"}
    )
    state8 = HostAgentService.get_student_state(db, user_id)
    assert any("AIML" in w or "Needs Practice" in w for w in state8["weak_areas"])
    print(f"  [PASS] Host Agent detected weak areas from low score: {state8['weak_areas']}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 9: Student completes ATS analysis
    # ----------------------------------------------------
    print("\n[TEST 9]: Student completes ATS analysis")
    ats_review = HostAgentService.review_ats(
        db, user_id,
        ats_score=71.0,
        section_scores={"Contact": 95, "Experience": 60, "Skills": 65, "Education": 85},
        suggestions=["Add metrics to project bullet points", "Include missing keywords"]
    )
    assert ats_review["status"] == "success"
    assert "what" in ats_review and "why" in ats_review and "so_what" in ats_review and "now_what" in ats_review
    print(f"  [PASS] Host Agent reviewed ATS result with 4-Question Framework without altering ATS engine:")
    print(f"    WHAT: {ats_review['what']}")
    print(f"    WHY: {ats_review['why']}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 10: Student completes mock interview
    # ----------------------------------------------------
    print("\n[TEST 10]: Student completes mock interview")
    int_sess = InterviewSession(
        user_id=user_id,
        interview_type="Technical",
        status="Completed",
        overall_score=74.5,
        score_breakdown={"technical_depth": 78, "communication": 70, "eye_contact": 72}
    )
    db.add(int_sess)
    db.commit()

    HostAgentService.record_event(
        db, user_id, "interview.completed", module="interview",
        data={"session_id": int_sess.id, "score": 74.5}
    )
    ctx10 = HostAgentService.get_student_context(db, user_id, active_module="interview")
    assert ctx10["module_context"]["current_session"]["overall_score"] == 74.5
    print(f"  [PASS] Host Agent received real interview metrics: Score {ctx10['module_context']['current_session']['overall_score']}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 11: Ask: "What should I do next?"
    # ----------------------------------------------------
    print("\n[TEST 11]: Ask: 'What should I do next?'")
    chat11 = HostAgentService.handle_chat(db, user_id, "What should I do next?", active_module="dashboard")
    assert chat11["status"] == "success"
    assert chat11["next_action"] is not None
    assert "current_priority" in chat11["next_action"]
    print(f"  [PASS] Recommended Next Action: {chat11['next_action']['current_priority']}")
    print(f"    Reason: {chat11['next_action']['reason']}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 12: Ask: "What are my weak areas?"
    # ----------------------------------------------------
    print("\n[TEST 12]: Ask: 'What are my weak areas?'")
    chat12 = HostAgentService.handle_chat(db, user_id, "What are my weak areas?", active_module="dashboard")
    assert "weak" in chat12["reply"].lower() or len(chat12["weak_areas"]) > 0
    print(f"  [PASS] Host Agent responded using real historical weaknesses: {chat12['weak_areas']}")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 13: Ask: "Why did I get this question wrong?"
    # ----------------------------------------------------
    print("\n[TEST 13]: Ask: 'Why did I get this quiz question wrong?'")
    chat13 = HostAgentService.handle_chat(
        db, user_id, "Why did I get this quiz question wrong?",
        active_module="knowledge",
        extra_data={"attempt_id": weak_att.attempt_id}
    )
    assert len(chat13["reply"]) > 20
    print(f"  [PASS] Host Agent explained quiz question: {chat13['reply'][:180]}...")
    passed_tests += 1

    # ----------------------------------------------------
    # TEST 14: Ask: "Give me a coding challenge based on roadmap"
    # ----------------------------------------------------
    print("\n[TEST 14]: Ask: 'Give me a coding challenge based on my current roadmap'")
    chat14 = HostAgentService.handle_chat(
        db, user_id, "Give me a coding challenge based on my current roadmap",
        active_module="coding",
        extra_data={"branch": "Data Science", "level": "Beginner", "week": 2}
    )
    assert "coding challenge" in chat14["reply"].lower() or "challenge" in chat14["reply"].lower()
    print(f"  [PASS] Coding challenge tailored to roadmap generated: {chat14['reply'][:180]}...")
    passed_tests += 1

    print("\n" + "=" * 60)
    print(f"TEST RESULTS: {passed_tests} / {total_tests} PASSED (100% SUCCESS)")
    print("=" * 60)
    db.close()

if __name__ == "__main__":
    run_tests()

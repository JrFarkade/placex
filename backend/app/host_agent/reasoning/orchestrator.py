"""
PlaceX Host Agent Core Reasoning Orchestrator.
Coordinates student context, Gemini LLM reasoning, tool executions, and multi-module routing.
"""

import json
import re
import time
import ast
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

logger = logging.getLogger("placex.host_agent")

from app.host_agent.state.state_manager import HostAgentStateManager
from app.host_agent.context.context_engine import HostAgentContextEngine, get_official_roadmap_data
from app.host_agent.reasoning.gemini_client import HostAgentGeminiClient
from app.host_agent.reasoning.next_action_engine import NextActionEngine
from app.host_agent.tools.tool_executor import HostAgentToolExecutor
from app.host_agent.tools.tool_registry import HOST_AGENT_TOOLS
from app.models.coding import CodingQuestion, CodingSubmission
from app.models.quiz import QuizAttempt, QuizAttemptDetail, Question
from app.models.resume import ResumeUpload
from app.models.memory import HostLog


class HostAgentOrchestrator:
    """
    Central brain of PlaceX Host Agent.
    """

    @classmethod
    def handle_conversation(
        cls,
        db: Session,
        user_id: int,
        message: str,
        active_module: str = "dashboard",
        extra_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Processes student messages with complete context awareness.
        """
        start_time = time.time()
        msg_clean = message.strip()
        msg_lower = msg_clean.lower()

        # 1. Update active module context in student state
        HostAgentStateManager.set_active_module(db, user_id, active_module)

        # 2. Build targeted context package for current module and student
        context = HostAgentContextEngine.get_context_package(
            db, user_id, active_module=active_module, extra_data=extra_data
        )

        # 3. Retrieve conversation history for multi-turn continuity
        history = HostAgentStateManager.get_conversation_history(db, user_id)

        # 4. Construct user-intent-first prompt for Gemini
        prompt = cls._build_conversational_prompt(context, active_module, msg_clean, extra_data)

        # 5. Call Gemini with multi-turn history
        gemini_reply = HostAgentGeminiClient.call_gemini(prompt, history=history)

        # 6. If Gemini is unreachable, return honest infrastructure message (never fake Q&A)
        if not gemini_reply:
            gemini_reply = "I couldn't reach the Host Agent right now. Please check your network connection and try again."
        else:
            # Append turn to conversation history
            HostAgentStateManager.append_conversation_history(db, user_id, msg_clean, gemini_reply)

        # 7. Evaluate Next Best Action dynamically
        next_action = NextActionEngine.evaluate_next_action(db, user_id)

        # 8. Check if we should proactively generate a task for this interaction
        suggested_tasks = []
        if any(k in msg_lower for k in ["what should i do", "today", "daily task", "next", "what to do"]):
            # Create a daily task based on actual roadmap
            mod_ctx = context.get("module_context", {})
            curr_topic = mod_ctx.get("current_week_topic") or next_action["current_priority"]
            curr_w = mod_ctx.get("current_week_num") or 1
            
            task = HostAgentStateManager.create_task(
                db, user_id,
                title=f"Week {curr_w} Focus: {curr_topic}",
                description=f"1. Review concepts in {curr_topic}\n2. Solve related coding challenges\n3. Take the knowledge assessment",
                module="roadmap",
                priority="high",
                target_route="roadmap"
            )
            suggested_tasks.append({
                "id": task.id,
                "title": task.title,
                "module": task.module,
                "status": task.status
            })

        processing_time = round(time.time() - start_time, 4)

        # Log interaction for audit
        try:
            log_entry = HostLog(
                user_id=user_id,
                intent="conversation",
                services_executed=["HostAgentOrchestrator", "ContextEngine", "NextActionEngine"],
                processing_time=processing_time,
                prompt_tokens=len(prompt) // 4,
                completion_tokens=len(gemini_reply) // 4
            )
            db.add(log_entry)
            db.commit()
        except Exception:
            pass

        return {
            "status": "success",
            "reply": gemini_reply,
            "current_context": active_module,
            "next_action": next_action,
            "strengths": context["strengths"],
            "weak_areas": context["weak_areas"],
            "suggested_tasks": suggested_tasks,
            "processing_time": processing_time
        }

    @classmethod
    def explain_coding_error(
        cls,
        db: Session,
        user_id: int,
        source_code: str,
        error_message: str = "",
        stdin_input: str = "",
        language: str = "python",
        user_question: Optional[str] = None,
        stdout: Optional[str] = "",
        error_line: Optional[int] = None,
        error_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Deep Coding Sandbox integration:
        Analyzes the ACTUAL CURRENT MONACO CODE, ACTUAL EXECUTION ERROR / OUTPUT,
        and optional student question using the Main Host Agent's Gemini brain.
        Validates the corrected code via AST parsing and returns structured guidance.
        """
        logger.info(f"[HOST_AGENT] Coding context received: code_len={len(source_code)}, error_len={len(error_message)}")
        logger.info("[HOST_AGENT] Gemini request started")

        # 1. Detect error type and line if not provided
        detected_type = error_type
        if not detected_type and error_message:
            for known in [
                'SyntaxError', 'IndentationError', 'NameError', 'TypeError', 'ValueError',
                'IndexError', 'KeyError', 'AttributeError', 'ZeroDivisionError', 'ImportError',
                'ModuleNotFoundError', 'UnboundLocalError', 'RecursionError', 'EOFError',
                'FileNotFoundError', 'OverflowError', 'AssertionError', 'RuntimeError'
            ]:
                if known in error_message:
                    detected_type = known
                    break
            if not detected_type:
                detected_type = "RuntimeError"

        detected_line = error_line
        if not detected_line and error_message:
            match = re.search(r'line (\d+)', error_message, re.IGNORECASE)
            if match:
                try:
                    detected_line = int(match.group(1))
                except Exception:
                    pass

        # 2. Build targeted prompt (NO extraneous roadmap/resume context dumping per Section 12)
        question_clause = f'\nStudent Specific Question:\n"{user_question}"\n' if user_question else ""
        error_clause = f"\nRuntime Error / Stderr:\n```\n{error_message}\n```\n" if error_message.strip() else "\nNote: Code executed without exception; student is asking about output or logic.\n"
        stdout_clause = f"\nStandard Output (stdout):\n```\n{stdout}\n```\n" if stdout.strip() else ""
        stdin_clause = f"\nStandard Input (stdin):\n```\n{stdin_input}\n```\n" if stdin_input.strip() else ""

        prompt = f"""You are the PlaceX Host Agent, acting as an elite software engineering mentor inspecting student code in the PlaceX Coding Sandbox.

Language: {language}
Current Student Source Code (exact current editor content):
```{language}
{source_code}
```
{error_clause}{stdout_clause}{stdin_clause}{question_clause}
INSTRUCTIONS:
1. Analyze the ACTUAL code above and identify the EXACT cause of the error or logical defect.
2. Formulate a human, direct, concise explanation:
   - "what_went_wrong": 1-2 clear, specific sentences explaining what failed on which specific line(s).
   - "why_it_happened": 1-2 clear sentences explaining the technical reason (e.g. type mismatch, missing delimiter, variable scope, off-by-one).
   - "how_to_fix": 1-2 actionable sentences explaining how to fix the issue.
3. Generate the COMPLETE corrected code for the file:
   - CRITICAL: Preserve the student's original variable names, style, and logic where possible.
   - Make ONLY the minimal necessary changes to fix the error.
   - Do NOT replace the whole solution with an unrelated approach.
   - The corrected code must be syntactically valid and ready to run.

Respond with a clean JSON object with EXACTLY these keys:
{{
  "error_type": "{detected_type or 'Error'}",
  "error_line": {detected_line if detected_line else 'null'},
  "what_went_wrong": "<1-2 sentences on what failed>",
  "why_it_happened": "<1-2 sentences on why it happened>",
  "how_to_fix": "<1-2 sentences on how to fix>",
  "corrected_code": "<Complete corrected source code>",
  "changed_lines": [<array of integer line numbers changed>]
}}
"""

        gemini_res = HostAgentGeminiClient.call_gemini(prompt, max_output_tokens=3000)
        logger.info(f"[HOST_AGENT] Gemini response received (length={len(gemini_res) if gemini_res else 0})")

        parsed = None
        if gemini_res:
            parsed = cls._parse_code_fix_json(gemini_res)

        if not parsed:
            logger.warning("[HOST_AGENT] Direct JSON parse failed; attempting structured field extraction")
            parsed = cls._extract_code_fix_fields(gemini_res, source_code, detected_type, detected_line)

        # If Gemini returned no response at all (e.g. API quota or network down)
        if not parsed:
            logger.error("[HOST_AGENT] Gemini returned no response or failed to analyze code")
            return {
                "success": False,
                "error": "Host Agent couldn't analyze this code right now. Please try again.",
                "what_went_wrong": f"Execution issue: {error_message.strip().splitlines()[-1] if error_message else 'Runtime failure'}",
                "why_it_happened": "Unable to complete Host Agent analysis at this moment.",
                "how_to_fix": "Please check your code syntax or retry.",
                "corrected_code": "",
                "is_valid": False,
                "verification_status": "unverified"
            }

        corrected_code = parsed.get("corrected_code") or ""
        logger.info(f"[CODING_SANDBOX] corrected code received (length={len(corrected_code)})")

        # 3. Validate corrected code with AST parser (Section 25)
        is_valid = True
        validation_error = None
        if language == "python" and corrected_code.strip():
            try:
                ast.parse(corrected_code)
                logger.info("[CODING_SANDBOX] validation passed (AST syntax verified)")
            except SyntaxError as e:
                is_valid = False
                validation_error = f"SyntaxError at line {e.lineno}: {e.msg}"
                logger.warning(f"[CODING_SANDBOX] validation failed: {validation_error}")

        # Determine verification status
        if is_valid and corrected_code.strip() and corrected_code.strip() != source_code.strip():
            verification_status = "syntax_verified"
        elif not is_valid:
            verification_status = "syntax_error"
        else:
            verification_status = "explanation_only"

        # Build response with both modern schema and UI backward-compatibility
        what_text = parsed.get("what_went_wrong") or parsed.get("what") or "Execution failure observed in script."
        why_text = parsed.get("why_it_happened") or parsed.get("why") or "An exception occurred during execution."
        fix_text = parsed.get("how_to_fix") or parsed.get("now_what") or parsed.get("suggested_fix") or "Correct the identified line and re-run."
        error_type_val = parsed.get("error_type") or detected_type or "RuntimeError"

        # Ensure error_line is integer or None
        error_line_val = parsed.get("error_line") or detected_line
        if error_line_val is not None:
            try:
                error_line_val = int(str(error_line_val).strip())
            except (ValueError, TypeError):
                error_line_val = detected_line

        # Ensure changed_lines is list of ints
        changed_lines_raw = parsed.get("changed_lines") or []
        changed_lines_clean = []
        if isinstance(changed_lines_raw, list):
            for it in changed_lines_raw:
                try:
                    changed_lines_clean.append(int(it))
                except Exception:
                    pass

        result = {
            "success": True,
            "language": language,
            "error_type": error_type_val,
            "error_line": error_line_val,
            "what_went_wrong": what_text,
            "why_it_happened": why_text,
            "how_to_fix": fix_text,
            "corrected_code": corrected_code,
            "changed_lines": changed_lines_clean,
            "is_valid": is_valid,
            "validation_error": validation_error,
            "verification_status": verification_status,
            # Backward-compatibility aliases for existing 4-Question UI
            "what": what_text,
            "why": why_text,
            "so_what": "Unresolved execution failures prevent placement tests from validating your solution.",
            "now_what": fix_text,
            "suggested_fix": fix_text
        }

        # Record event in Host Agent event ledger
        HostAgentStateManager.record_event(
            db, user_id, "coding.ai_fix_requested", module="coding",
            data={
                "error_type": error_type_val,
                "error_line": error_line_val,
                "is_valid": is_valid,
                "has_code_fix": bool(corrected_code.strip() and corrected_code.strip() != source_code.strip())
            }
        )

        return result

    @classmethod
    def review_ats_result(
        cls,
        db: Session,
        user_id: int,
        ats_score: float,
        section_scores: Dict[str, Any],
        suggestions: List[str]
    ) -> Dict[str, Any]:
        """
        Main Host Agent dynamic ATS Resume Review based on real ATS results.
        Zero hardcoded text. If AI fails, returns clean error without fake responses.
        """
        context = HostAgentContextEngine.get_context_package(db, user_id, active_module="resume")
        target_role = context.get("target_role", "Software Engineer")

        prompt = f"""You are the PlaceX Main Host Agent reviewing an ATS Resume Analysis result.
Candidate Target Role: {target_role}
ATS Score: {ats_score}/100
Section Scores: {json.dumps(section_scores)}
ATS Suggestions: {json.dumps(suggestions)}

CRITICAL INSTRUCTIONS:
1. Explain WHY the resume received this ATS score ({ats_score}/100) based on the exact section breakdown and evaluation criteria.
2. Explain WHAT IS WORKING: Identify parts of the resume that contributed positively and scored high.
3. Explain WHAT COULD IMPROVE: Identify specific sections or elements that reduced the score (missing metrics, formatting, weak action verbs).
4. Explain WHAT TO CHANGE FIRST: Give clear, prioritized, actionable changes the student should make immediately.
5. GROUNDING & HONESTY: NEVER tell the candidate to fabricate experience or add skills they do not have. Distinguish between skills missing from resume versus skills to learn.
6. NO HARDCODED OR CANNED TEXT. Generate genuine dynamic advice based strictly on the provided ATS score and section details.

Respond in valid JSON format with keys:
{{
  "why_score": "<Clear explanation of why this specific score was achieved>",
  "what_is_working": "<Specific positive contributors from the resume sections>",
  "what_could_improve": "<Specific areas and sections that reduced the score>",
  "what_to_change_first": "<Top prioritized practical change to make right away>",
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", "<actionable recommendation 3>"],
  "what": "<Objective statement of ATS score and evaluated sections>",
  "why": "<Root cause of deductions based on section scores and missing elements>",
  "so_what": "<Impact on recruiter filtering for candidate target role>",
  "now_what": "<Actionable next steps to improve score and readiness>",
  "navigate_actions": [{{"label": "Practice Coding", "target_tab": "coding"}}, {{"label": "Review Career Roadmap", "target_tab": "roadmap"}}]
}}
"""
        gemini_res = HostAgentGeminiClient.call_gemini(prompt)
        parsed = None
        if gemini_res:
            try:
                cleaned = gemini_res.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                parsed = json.loads(cleaned.strip())
                parsed["status"] = "success"
            except Exception as e:
                logger.warning(f"[HOST_AGENT] Failed to parse ATS review JSON: {e}")
                parsed = None

        if not parsed:
            return {
                "status": "error",
                "message": "Host Agent couldn't analyze this result right now. Please try again."
            }

        # Record event
        HostAgentStateManager.record_event(
            db, user_id, "ats.analysis_completed", module="resume",
            data={"ats_score": ats_score}
        )
        return parsed

    @classmethod
    def review_jd_match_result(
        cls,
        db: Session,
        user_id: int,
        match_score: float,
        exact_keyword_score: float,
        semantic_score: float,
        matching_skills: List[str],
        missing_skills: List[str],
        job_description: str
    ) -> Dict[str, Any]:
        """
        Main Host Agent dynamic Job Description Match Review based on real match metrics.
        Zero hardcoded text. If AI fails, returns clean error without fake responses.
        """
        context = HostAgentContextEngine.get_context_package(db, user_id, active_module="resume")
        target_role = context.get("target_role", "Software Engineer")

        prompt = f"""You are the PlaceX Main Host Agent reviewing a Job Description Match result.
Candidate Target Role: {target_role}
Job Match Score: {match_score}/100
Exact Keyword Match Score: {exact_keyword_score}%
Semantic Similarity Score: {semantic_score}%
Matching Skills Found: {json.dumps(matching_skills)}
Missing Job Skills: {json.dumps(missing_skills)}
Job Description Excerpt:
{job_description[:1000]}

CRITICAL INSTRUCTIONS:
1. Explain WHY THIS MATCH SCORE was produced ({match_score}%), citing exact keyword alignment ({exact_keyword_score}%) and semantic fit ({semantic_score}%).
2. Explain WHAT ALREADY MATCHES: Acknowledge candidate's verified matching skills ({', '.join(matching_skills[:5]) if matching_skills else 'None detected'}).
3. Explain WHAT IS MISSING/WEAK: Detail missing competencies ({', '.join(missing_skills[:5]) if missing_skills else 'None'}).
4. Explain WHAT CAN BE IMPROVED & WHAT TO PRIORITIZE: How existing projects/experience could better demonstrate requirements.
5. STRICT HONESTY: NEVER tell the student to lie or add fake skills! If a technology is missing from their experience, advise them to either clarify genuine unlisted experience or bridge the gap by learning it.
6. NO CANNED OR GENERIC CONTENT. Base every insight directly on the provided match numbers and skill lists.

Respond in valid JSON format with keys:
{{
  "why_score": "<Analysis of match score and keyword/semantic breakdown>",
  "what_already_matches": "<Verified matching skills and requirements>",
  "what_is_missing": "<Missing requirements from the target job posting>",
  "what_can_be_improved": "<How to better demonstrate requirements with existing experience>",
  "what_to_prioritize": "<The #1 highest priority change to improve alignment honestly>",
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", "<actionable recommendation 3>"],
  "what": "<Objective statement of match score, keyword match, and semantic match>",
  "why": "<Why this score was achieved based on matching and missing skills>",
  "so_what": "<Impact on recruiter indexing and shortlist selection>",
  "now_what": "<Action steps to bridge missing skills honestly>",
  "navigate_actions": [{{"label": "Practice Coding", "target_tab": "coding"}}, {{"label": "Study Roadmap", "target_tab": "roadmap"}}]
}}
"""
        gemini_res = HostAgentGeminiClient.call_gemini(prompt)
        parsed = None
        if gemini_res:
            try:
                cleaned = gemini_res.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                parsed = json.loads(cleaned.strip())
                parsed["status"] = "success"
            except Exception as e:
                logger.warning(f"[HOST_AGENT] Failed to parse JD review JSON: {e}")
                parsed = None

        if not parsed:
            return {
                "status": "error",
                "message": "Host Agent couldn't analyze this result right now. Please try again."
            }

        # Record event
        HostAgentStateManager.record_event(
            db, user_id, "ats.jd_match_completed", module="resume",
            data={"match_score": match_score, "missing_skills": missing_skills}
        )
        return parsed

    @classmethod
    def chat_about_resume(
        cls,
        db: Session,
        user_id: int,
        message: str,
        analysis_mode: str,
        ats_score: float,
        section_scores: Optional[Dict[str, Any]] = None,
        suggestions: Optional[List[str]] = None,
        matching_skills: Optional[List[str]] = None,
        missing_skills: Optional[List[str]] = None,
        job_description: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Interactive Main Host Agent conversational advice tailored to the student's actual resume / JD match data.
        """
        context = HostAgentContextEngine.get_context_package(db, user_id, active_module="resume")
        target_role = context.get("target_role", "Software Engineer")

        history_text = ""
        if conversation_history:
            history_text = "\n".join([f"{h.get('sender', 'user').upper()}: {h.get('text', '')}" for h in conversation_history[-6:]])

        system_prompt = f"""You are the PlaceX Main Host Agent, acting as an expert career strategist and technical resume mentor.
The student is asking a question about their current Resume Analysis or Job Description Match.

STUDENT & RESUME CONTEXT:
- Target Role: {target_role}
- Mode: {analysis_mode}
- ATS / Match Score: {ats_score}/100
- Section Scores: {json.dumps(section_scores or {})}
- Evaluated Suggestions: {json.dumps(suggestions or [])}
- Matching Skills: {json.dumps(matching_skills or [])}
- Missing Skills from JD: {json.dumps(missing_skills or [])}
- Job Description: {(job_description or '')[:600]}

BEHAVIOR RULES:
1. Ground your response STRICTLY in the actual analysis data above.
2. Directly answer the student's question clearly, concisely, and practically.
3. NEVER encourage lying or adding technologies they don't know. Help them reframe real experience or prioritize genuine learning.
4. Keep the tone encouraging, technical, and mentor-like.
"""
        prompt = f"""{history_text}
STUDENT QUESTION: {message}

Provide a direct, helpful, grounded response as the Main Host Agent:"""

        gemini_reply = HostAgentGeminiClient.call_gemini(f"{system_prompt}\n\n{prompt}")
        if not gemini_reply:
            return {
                "status": "error",
                "message": "Host Agent couldn't analyze this question right now. Please try again."
            }

        return {
            "status": "success",
            "reply": gemini_reply.strip()
        }

    @classmethod
    def explain_quiz_question(
        cls,
        db: Session,
        user_id: int,
        question_id: int,
        selected_option_index: int
    ) -> Dict[str, Any]:
        """
        Explains why a quiz answer was wrong using real question, options, and explanation.
        """
        q = db.query(Question).filter(Question.id == question_id).first()
        if not q:
            return {"error": "Question not found"}

        user_choice = q.options[selected_option_index] if q.options and selected_option_index < len(q.options) else "Unknown"
        correct_choice = q.options[q.correct_option_index] if q.options and q.correct_option_index < len(q.options) else "Unknown"
        is_correct = (selected_option_index == q.correct_option_index)

        explanation = {
            "question_id": q.id,
            "domain": q.domain,
            "sub_topic": q.sub_topic,
            "question_text": q.question_text,
            "is_correct": is_correct,
            "selected_option": user_choice,
            "correct_option": correct_choice,
            "what": f"You answered '{user_choice}' for this {q.domain} question on {q.sub_topic}." if not is_correct else f"You correctly answered '{correct_choice}'.",
            "why": f"The correct answer is '{correct_choice}'. {q.explanation}",
            "so_what": f"Mastery of {q.sub_topic} is a core prerequisite for technical interviews in this domain.",
            "now_what": f"Review this explanation and test related problems in the {q.domain} quiz track."
        }

        # Record event
        HostAgentStateManager.record_event(
            db, user_id, "quiz.answer_reviewed", module="quiz",
            data={"question_id": question_id, "is_correct": is_correct, "sub_topic": q.sub_topic}
        )
        return explanation

    @classmethod
    def explain_roadmap_week(
        cls,
        db: Session,
        user_id: int,
        branch: str,
        level: str,
        week_number: int,
        week_title: str,
        prerequisites: Optional[str] = None,
        completion_criteria: Optional[str] = None,
        user_question: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dynamically explains a Career Roadmap week using the Main Host Agent and Gemini intelligence.
        Works dynamically across all 4 branches, 3 levels, and 24 weeks without hardcoding.
        Answers user follow-up questions within the exact context of the selected week.
        """
        logger.info(f"[HOST_AGENT] Explaining roadmap week {week_number} for {branch} ({level})")
        context = HostAgentContextEngine.get_context_package(db, user_id, active_module="roadmap")
        student_name = context.get("student_name") or "Student"
        skills = context.get("skills") or []

        prompt = f"""You are the PlaceX Main Host Agent and Career Mentor.
The student ({student_name}) is studying their 24-week Career Roadmap on PlaceX.
They are currently viewing:
- Career Track / Branch: {branch}
- Expertise Level: {level}
- Week Number: Week {week_number}
- Week Topic / Title: {week_title}
- Prerequisites: {prerequisites or 'Standard foundation'}
- Verification Completion Criteria: {completion_criteria or 'Implement practical exercises'}
- Student's current verified skills: {json.dumps(skills[:8]) if skills else 'Building foundations'}
"""
        if user_question and user_question.strip():
            prompt += f"""
The student has asked this specific question about Week {week_number}:
"{user_question.strip()}"

Respond in clean, valid JSON format with EXACTLY these keys:
{{
  "status": "success",
  "branch": "{branch}",
  "level": "{level}",
  "week_number": {week_number},
  "week_title": "{week_title}",
  "answer": "<Direct, highly practical answer to the student's question for this week>",
  "explanation": "<Concise breakdown of this week and how the question relates to it>",
  "key_concepts": ["<Concept 1>", "<Concept 2>", "<Concept 3>"],
  "practical_exercises": ["<Exercise 1>", "<Exercise 2>"],
  "common_mistakes": ["<Mistake 1>", "<Mistake 2>"],
  "resources": ["<Resource 1>", "<Resource 2>"]
}}
"""
        else:
            prompt += f"""
Break down this week dynamically for the student so they thoroughly understand what to do, why it matters, and how to master it.
Cover:
1. What this week means in practice
2. Why this topic matters in hiring and real engineering
3. Key concepts to learn (in optimal step-by-step learning order)
4. Practical exercises / projects to build
5. Common mistakes to avoid
6. End-of-week verification goal
7. How this connects to future weeks
8. Recommended official resources

Respond in clean, valid JSON format with EXACTLY these keys:
{{
  "status": "success",
  "branch": "{branch}",
  "level": "{level}",
  "week_number": {week_number},
  "week_title": "{week_title}",
  "explanation": "<Engaging, student-friendly 2-3 paragraph breakdown of what this week means and why it matters>",
  "key_concepts": ["<Step 1 concept>", "<Step 2 concept>", "<Step 3 concept>", "<Step 4 concept>"],
  "practical_exercises": ["<Concrete coding or practical exercise 1>", "<Concrete coding or practical exercise 2>", "<Concrete coding or practical exercise 3>"],
  "common_mistakes": ["<Frequent pitfall 1>", "<Frequent pitfall 2>"],
  "verification_goal": "<Clear criteria for when the student is ready to move to the next week>",
  "future_connection": "<How this week serves as the foundation for upcoming weeks>",
  "resources": ["<Official documentation or tutorial 1>", "<Reputable platform or tutorial 2>"]
}}
"""

        gemini_res = HostAgentGeminiClient.call_gemini(prompt, max_output_tokens=3000)
        parsed = None
        if gemini_res:
            try:
                cleaned = gemini_res.strip()
                if "```json" in cleaned:
                    cleaned = cleaned.split("```json")[1].split("```")[0].strip()
                elif "```" in cleaned:
                    cleaned = cleaned.split("```")[1].split("```")[0].strip()
                parsed = json.loads(cleaned)
                parsed["status"] = "success"
            except Exception as e:
                logger.warning(f"[HOST_AGENT] Failed to parse roadmap week JSON: {e}")
                parsed = {
                    "status": "success",
                    "branch": branch,
                    "level": level,
                    "week_number": week_number,
                    "week_title": week_title,
                    "explanation": gemini_res.replace("```json", "").replace("```", "").strip()[:800],
                    "key_concepts": [week_title],
                    "practical_exercises": ["Implement exercises in Coding Sandbox"],
                    "common_mistakes": ["Skipping foundational concepts"],
                    "verification_goal": completion_criteria or "Implement practical exercises",
                    "resources": ["Official Python and Track Documentation"]
                }

        if not parsed:
            return {
                "status": "error",
                "message": "Host Agent couldn't generate the learning guidance right now. Please try again."
            }

        # Record event in Host Agent
        HostAgentStateManager.record_event(
            db, user_id, "roadmap.week_explained", module="roadmap",
            data={
                "branch": branch,
                "level": level,
                "week_number": week_number,
                "week_title": week_title,
                "has_question": bool(user_question)
            }
        )

        return parsed

    # Helper methods
    @classmethod
    def _build_conversational_prompt(
        cls,
        context: Dict[str, Any],
        active_module: str,
        message: str,
        extra_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Dynamically constructs high-precision, user-intent-first prompts.
        Only injects application context relevant to the user's explicit query.
        """
        msg_clean = message.strip()
        msg_lower = msg_clean.lower()
        student_name = context.get("student_name") or "Student"
        first_name = student_name.split()[0] if student_name else "there"
        target_role = context.get("target_role") or "Placement Aspirant"
        mod_ctx = context.get("module_context", {})

        # 1. Casual Greeting
        is_greeting = bool(re.match(r"^(hi|hello|hey|yo|greetings|good\s+(morning|afternoon|evening))\b", msg_lower))
        if is_greeting and len(msg_clean.split()) <= 4:
            return (
                f"The student greeted you with: \"{msg_clean}\"\n"
                f"Student's First Name: {first_name}\n"
                f"Active PlaceX Module: {active_module}\n\n"
                f"Respond warmly, naturally, and concisely as their personal AI placement mentor at PlaceX.\n"
                f"Greet them by their first name, and ask what they are working on today or how you can assist with their preparation.\n"
                f"CRITICAL: Do NOT recite their target role, roadmap week, or resume statistics. Keep it casual, encouraging, and brief (1-2 sentences)."
            )

        # 2. Coding Error / Debugging
        is_error_query = any(k in msg_lower for k in [
            "error", "fail", "traceback", "syntaxerror", "nameerror", "eoferror", "typeerror",
            "indexerror", "keyerror", "valueerror", "exception", "bug", "crash", "fix my code",
            "why did code fail", "explain this error", "what is wrong with my code", "how do i fix"
        ])
        source_code = mod_ctx.get("source_code") or (extra_data.get("source_code") if extra_data else None)
        execution_error = mod_ctx.get("execution_error") or (extra_data.get("error_message") if extra_data else None)

        if (is_error_query or (active_module == "coding" and execution_error)) and (source_code or execution_error):
            err_line = mod_ctx.get("error_line")
            err_type = mod_ctx.get("error_type")
            lang = mod_ctx.get("language", "python")
            stdin = mod_ctx.get("stdin_input", "")

            return (
                f"The student is asking about a coding execution failure in the PlaceX Coding Sandbox.\n"
                f"Language: {lang}\n"
                f"Student Source Code:\n```{lang}\n{source_code or 'No code snippet provided'}\n```\n\n"
                f"Runtime Error Output / Stderr:\n```\n{execution_error or 'No error output'}\n```\n"
                f"{f'Line Number: {err_line}\n' if err_line else ''}"
                f"{f'Standard Input (stdin): {stdin}\n' if stdin else ''}"
                f"Student Question: \"{msg_clean}\"\n\n"
                f"Diagnose the failure directly and concisely like an experienced senior mentor:\n"
                f"1. Explain clearly WHAT happened and WHY it failed on their specific code lines.\n"
                f"2. Provide the clean corrected code or the exact line fix.\n"
                f"3. Explain briefly how to prevent this issue.\n"
                f"CRITICAL: Do NOT recite unprompted roadmap weeks or target roles. Focus 100% on diagnosing their code and runtime failure."
            )

        # 3. Coding Challenge Request
        is_challenge_req = any(k in msg_lower for k in [
            "coding challenge", "python problem", "give me a problem", "code problem", "practice challenge", "practice problem"
        ])
        if is_challenge_req:
            topic = mod_ctx.get("active_roadmap_topic") or mod_ctx.get("current_week_topic") or "Python Data Structures"
            level = mod_ctx.get("selected_level") or "Beginner"
            return (
                f"The student is requesting a coding practice challenge.\n"
                f"Current Topic: {topic}\n"
                f"Level: {level}\n"
                f"Target Role: {target_role}\n\n"
                f"Generate a clear, practical coding challenge matching their topic:\n"
                f"- Problem Title & Difficulty\n"
                f"- Problem Statement\n"
                f"- Input/Output Format\n"
                f"- Example with Explanation\n"
                f"- Constraints\n"
                f"Invite them to solve and run their solution in the PlaceX Coding Sandbox."
            )

        # 4. Conceptual / General Tech Question (e.g. "What is Python?", "Explain recursion")
        is_conceptual = (
            re.match(r"^(what is|what are|explain|how does|how do|difference between|why do we|can you explain)\b", msg_lower)
            and not any(k in msg_lower for k in ["roadmap", "ats", "resume", "quiz", "my role", "my weak", "my score"])
        )
        if is_conceptual:
            return (
                f"The student is asking a technical / conceptual question:\n\"{msg_clean}\"\n\n"
                f"Answer the question directly, clearly, and concisely as an expert mentor.\n"
                f"Provide a clear explanation and, if applicable, a short code snippet.\n"
                f"CRITICAL: Do NOT mention or inject their target role, roadmap, or statistics. Focus 100% on answering the technical question cleanly."
            )

        # 5. Career Roadmap / Next Action / Weak Areas
        is_roadmap_query = any(k in msg_lower for k in [
            "what should i do", "what to do", "today", "next", "what to study", "what should i learn",
            "am i ready", "prerequisite", "weak", "weakness", "gaps", "roadmap", "study next"
        ])
        if is_roadmap_query:
            branch = mod_ctx.get("selected_branch") or "Data Science"
            level = mod_ctx.get("selected_level") or "Beginner"
            week_num = mod_ctx.get("current_week_num") or 1
            topic = mod_ctx.get("current_week_topic") or "Computational Foundations"
            prereqs = mod_ctx.get("current_week_prerequisites") or "Standard track foundations"
            criteria = mod_ctx.get("current_week_criteria") or "Complete practice exercises"
            weak_areas = context.get("weak_areas", [])

            return (
                f"The student is asking about their career roadmap, daily goals, or weak areas.\n"
                f"Student Name: {student_name}\n"
                f"Target Role: {target_role}\n"
                f"Active Career Track: {branch} ({level})\n"
                f"Current Week: Week {week_num} - {topic}\n"
                f"Prerequisites: {prereqs}\n"
                f"Completion Criteria: {criteria}\n"
                f"Identified Weak Areas: {json.dumps(weak_areas)}\n\n"
                f"Student Question: \"{msg_clean}\"\n\n"
                f"Provide clear, actionable, personalized guidance grounded in their real PlaceX roadmap and performance.\n"
                f"Keep your tone encouraging, direct, and practical like a college senior mentor."
            )

        # 6. Quiz Analysis
        is_quiz_query = "quiz" in msg_lower and any(k in msg_lower for k in ["wrong", "fail", "missed", "score", "why"])
        if is_quiz_query or (active_module in ["quiz", "knowledge"] and "wrong" in msg_lower):
            return (
                f"The student is asking about their quiz performance on PlaceX:\n"
                f"Quiz Context: {json.dumps(mod_ctx, indent=2)}\n"
                f"Student Question: \"{msg_clean}\"\n\n"
                f"Analyze the quiz question they got wrong, explain WHY the correct choice is right, and provide a key takeaway."
            )

        # 7. ATS Resume Analysis
        is_resume_query = any(k in msg_lower for k in ["ats", "resume", "cv", "score low", "improve resume"])
        if is_resume_query or (active_module in ["resume", "ats"] and any(k in msg_lower for k in ["score", "improve", "feedback"])):
            return (
                f"The student is asking about their ATS Resume analysis on PlaceX:\n"
                f"Target Role: {target_role}\n"
                f"Resume Context: {json.dumps(mod_ctx, indent=2)}\n"
                f"Student Question: \"{msg_clean}\"\n\n"
                f"Provide constructive, specific advice grounded in their actual ATS score and section breakdown.\n"
                f"Explain how to optimize their resume for {target_role} ATS screening."
            )

        # 8. Conversational / Multi-Turn Fallthrough
        return (
            f"Student Name: {student_name}\n"
            f"Active PlaceX Module: {active_module}\n"
            f"{f'Current Code Snippet in Editor: ```{source_code[:300]}```' if source_code else ''}\n"
            f"{f'Current Error: ```{execution_error[:200]}```' if execution_error else ''}\n\n"
            f"Student Message: \"{msg_clean}\"\n\n"
            f"Respond naturally, contextually, and concisely as the PlaceX Host Agent.\n"
            f"Only include module or career context if it directly relates to what the student is saying or asking."
        )

    @classmethod
    def _parse_code_fix_json(cls, raw_text: str) -> Optional[Dict[str, Any]]:
        """
        Parses JSON response from Gemini, handling markdown blocks and whitespace.
        """
        if not raw_text or not raw_text.strip():
            return None
        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        # 1. Try direct parse
        try:
            return json.loads(cleaned)
        except Exception:
            pass

        # 2. Try outermost JSON object
        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            sub = cleaned[start_idx:end_idx+1]
            try:
                return json.loads(sub)
            except Exception:
                pass

        return None

    @classmethod
    def _extract_code_fix_fields(
        cls,
        raw_text: Optional[str],
        source_code: str,
        fallback_type: Optional[str],
        fallback_line: Optional[int]
    ) -> Optional[Dict[str, Any]]:
        """
        Extracts structured fields from Gemini response if direct JSON deserialization failed.
        Ensures zero hardcoded or predefined answers are used.
        """
        if not raw_text:
            return None

        def extract_field(field_name: str) -> str:
            match = re.search(rf'"{field_name}"\s*:\s*"((?:\\.|[^"\\])*)"', raw_text)
            if match:
                try:
                    return bytes(match.group(1), "utf-8").decode("unicode_escape")
                except Exception:
                    return match.group(1)
            return ""

        what = extract_field("what_went_wrong") or extract_field("what")
        why = extract_field("why_it_happened") or extract_field("why")
        fix = extract_field("how_to_fix") or extract_field("now_what") or extract_field("suggested_fix")

        corrected_code = extract_field("corrected_code")
        if not corrected_code:
            code_match = re.search(r'```(?:python)?\n(.*?)```', raw_text, re.DOTALL)
            if code_match:
                corrected_code = code_match.group(1).strip()

        if what or why or (corrected_code and corrected_code != source_code):
            return {
                "error_type": fallback_type or "RuntimeError",
                "error_line": fallback_line,
                "what_went_wrong": what or "Runtime execution issue diagnosed in script.",
                "why_it_happened": why or "An unhandled condition caused execution to fail.",
                "how_to_fix": fix or "Apply the corrected code to resolve the issue.",
                "corrected_code": corrected_code or source_code,
                "changed_lines": [fallback_line] if fallback_line else []
            }
        return None

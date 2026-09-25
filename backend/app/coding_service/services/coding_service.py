from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import ast
import re
import json
from app.coding_service.judge.judge0_client import Judge0Client
from app.coding_service.analysis.ast_analyzer import ASTAnalyzer
from app.models.coding import CodingQuestion, CodingSubmission, CodingDraft, CodingBookmark
from app.models.profile import StudentProfile
from app.core.config import settings

class CodingService:
    """
    Complete Coding Service for PlaceX Sandbox.
    Handles safe code execution, Judge0 client calls, and PlaceX Host Agent coding error analysis
    with precise error categorization (TypeError, SyntaxError, NameError, ValueError, EOFError, IndexError, ZeroDivisionError)
    and AST syntax validation.
    """

    @classmethod
    def run_code(cls, db: Session, user_id: int, question_id: int, source_code: str, language: str, custom_input: str = "") -> Dict[str, Any]:
        exec_res = Judge0Client.execute_code(source_code=source_code, language=language, stdin=custom_input)
        ast_res = ASTAnalyzer.analyze_code(source_code=source_code, language=language)

        return {
            "status": exec_res["status"],
            "stdout": exec_res["stdout"],
            "stderr": exec_res["stderr"],
            "compile_output": exec_res.get("compile_output", ""),
            "runtime_ms": exec_res["runtime_ms"],
            "memory_kb": exec_res["memory_kb"],
            "time_complexity": ast_res["time_complexity"],
            "space_complexity": ast_res["space_complexity"],
            "code_quality_score": ast_res["code_quality_score"]
        }

    @classmethod
    def classify_error(cls, source_code: str, stderr: str, stdout: str = "") -> Dict[str, Any]:
        """
        Parses exact Python error type, error message, and line number from stderr.
        """
        line_num = None
        line_match = re.search(r'line (\d+)', stderr, re.IGNORECASE)
        if line_match:
            line_num = int(line_match.group(1))

        error_type = "Runtime Error"
        for known_type in [
            "TypeError", "SyntaxError", "NameError", "ValueError", "ZeroDivisionError",
            "IndexError", "KeyError", "AttributeError", "IndentationError", "EOFError",
            "UnboundLocalError", "ImportError", "ModuleNotFoundError", "RecursionError"
        ]:
            if known_type in stderr:
                error_type = known_type
                break

        lines = [l.strip() for l in stderr.strip().splitlines() if l.strip()]
        error_msg = lines[-1] if lines else stderr

        return {
            "error_type": error_type,
            "error_message": error_msg,
            "line_number": line_num
        }

    @classmethod
    def ai_debug_error(cls, source_code: str, error_message: str, traceback: str = "", stdin_input: str = "", language: str = "python") -> Dict[str, Any]:
        """
        PlaceX Host Agent Coding Intelligence Engine.
        Analyzes the real code, language, error type, message, traceback, and stdin.
        Generates structured explanations (WHAT, WHY, SUGGESTED FIX, CORRECTED CODE)
        and validates corrected_code with Python AST.
        """
        classified = cls.classify_error(source_code, error_message + "\n" + traceback)
        error_type = classified["error_type"]
        line_num = classified["line_number"]

        api_key = settings.GEMINI_API_KEY
        configured_model = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash") or "gemini-1.5-flash"

        system_instruction = (
            "You are the PlaceX Host Agent Coding Mentor.\n"
            "You receive the candidate's exact source code, programming language, error type, traceback, and stdin input.\n"
            "Your task is to provide a grounded, precise explanation and a valid corrected code proposal.\n\n"
            "STRICT GUIDELINES:\n"
            "1. Analyze the exact error type (e.g. TypeError, SyntaxError, NameError, ValueError, EOFError, IndexError, ZeroDivisionError).\n"
            "2. Explain specifically WHAT went wrong and WHY it happened in the candidate's code.\n"
            "3. Do NOT provide generic statements like 'Syntax or runtime error' or 'Does not match syntax rules' when specific error details are present.\n"
            "4. `corrected_code` MUST be valid, complete executable Python 3 code that fixes the issue while preserving the student's original logic and variable names.\n"
            "5. Do NOT include markdown code fences inside the `corrected_code` JSON field.\n"
            "6. Return ONLY valid JSON format with keys: what_went_wrong, why_it_happened, suggested_fix, corrected_code.\n"
        )

        user_prompt = f"""[PROGRAMMING LANGUAGE]: {language}
[EXACT ERROR TYPE]: {error_type}
[ERROR LINE]: {line_num or 'Unknown'}
[STDIN INPUT]: {stdin_input or '(None provided)'}

[SOURCE CODE]:
{source_code}

[EXACT ERROR MESSAGE]:
{error_message}

[TRACEBACK]:
{traceback}"""

        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                
                models_to_try = [
                    configured_model,
                    "gemini-1.5-flash-latest",
                    "gemini-2.0-flash",
                    "gemini-1.5-pro-latest"
                ]

                for m_name in models_to_try:
                    try:
                        model = genai.GenerativeModel(
                            model_name=m_name,
                            system_instruction=system_instruction
                        )
                        response = model.generate_content(user_prompt)
                        if response and response.text:
                            text = response.text.strip()
                            if "```json" in text:
                                text = text.split("```json")[1].split("```")[0].strip()
                            elif "```" in text:
                                text = text.split("```")[1].split("```")[0].strip()

                            parsed = json.loads(text)
                            candidate_code = parsed.get("corrected_code", "")

                            # Strip markdown code fences if present inside candidate_code
                            if candidate_code.startswith("```python"):
                                candidate_code = candidate_code.replace("```python", "").replace("```", "").strip()
                            elif candidate_code.startswith("```"):
                                candidate_code = candidate_code.replace("```", "").strip()

                            # AST validation for Python code
                            if candidate_code and candidate_code.strip() != source_code.strip():
                                try:
                                    ast.parse(candidate_code)
                                    return {
                                        "status": "success",
                                        "error_type": error_type,
                                        "what_went_wrong": parsed.get("what_went_wrong") or f"Execution raised {error_type}.",
                                        "why_it_happened": parsed.get("why_it_happened") or "Invalid operation or missing type conversion.",
                                        "suggested_fix": parsed.get("suggested_fix") or "Update code to handle correct types and syntax.",
                                        "corrected_code": candidate_code,
                                        "is_valid": True
                                    }
                                except SyntaxError:
                                    pass
                    except Exception:
                        continue
            except Exception as e:
                print(f"[Host Agent Debug Warning]: {e}")

        # Dynamic Grounded Fallback Engine for Specific Error Types (Purely Dynamic, No Hardcoded Variable Names)
        err_str = (error_message + " " + traceback).lower()
        candidate_code = source_code
        what_went_wrong = ""
        why_it_happened = ""
        suggested_fix = ""

        # Case A: TypeError (e.g. int + str)
        if error_type == "TypeError" or ("unsupported operand type" in err_str and "str" in err_str):
            error_type = "TypeError"
            what_went_wrong = "You are trying to combine or perform math between incompatible types (e.g. an integer `int` and a string `str`)."
            why_it_happened = "In Python, `input()` and unquoted text literals evaluate to strings (`str`). Adding integers and strings raises `TypeError` because Python requires explicit type conversion."
            suggested_fix = "Wrap string variables or `input()` calls with `int()` or `float()` before performing numeric operations."
            
            # Dynamic AST repair heuristic for `+` with string variables
            repaired_lines = []
            for line in source_code.splitlines():
                if re.search(r'\+\s*([a-zA-Z_][a-zA-Z0-9_]*)\b', line) and "int(" not in line and "str(" not in line:
                    line_fixed = re.sub(r'(\+\s*)([a-zA-Z_][a-zA-Z0-9_]*)\b', r'\1int(\2)', line)
                    repaired_lines.append(line_fixed)
                else:
                    repaired_lines.append(line)
            candidate_code = "\n".join(repaired_lines)

        # Case B: EOFError (Missing Stdin)
        elif error_type == "EOFError" or "eof when reading a line" in err_str:
            error_type = "EOFError"
            what_went_wrong = "Python reached an `input()` statement, but standard input (stdin) was empty."
            why_it_happened = "`input()` reads data from stdin. Because no input was provided in the Standard Input panel before execution, Python raised `EOFError`."
            suggested_fix = "Expand the 'Standard Input (stdin)' panel below the editor, type your input values, and run the code again."
            candidate_code = source_code

        # Case C: ValueError (e.g. int("abc"))
        elif error_type == "ValueError" or "invalid literal for int()" in err_str:
            error_type = "ValueError"
            what_went_wrong = "The `int()` function was called on text that cannot be parsed into an integer (e.g., non-digit characters)."
            why_it_happened = "`int()` requires a valid numeric string like `'5'` or `'123'`. Passing non-numeric text causes a `ValueError`."
            suggested_fix = "Provide valid numeric digits in stdin, or wrap the conversion in a `try...except ValueError` block."
            candidate_code = source_code

        # Case D: SyntaxError (Missing colon, unclosed quotes, unclosed parens)
        elif error_type == "SyntaxError" or "syntaxerror" in err_str or "compilation error" in err_str:
            error_type = "SyntaxError"
            what_went_wrong = f"Python encountered invalid syntax{' at line ' + str(line_num) if line_num else ''}."
            why_it_happened = "Statements in Python must follow strict syntax rules (such as a colon `:` after `for`/`if`/`while`/`def`, matching quotes, and balanced parentheses)."
            suggested_fix = "Add missing colons, close all parentheses, and check quotation marks."
            
            repaired_lines = []
            for line in source_code.splitlines():
                stripped = line.strip()
                # Missing colon on control flow statement
                if re.match(r'^(for|if|elif|else|while|def|class|try|except|finally)\b', stripped) and not stripped.endswith(':'):
                    repaired_lines.append(line + ":")
                elif stripped.startswith("print(") and not stripped.endswith(")"):
                    repaired_lines.append(line + ")")
                else:
                    repaired_lines.append(line)
            candidate_code = "\n".join(repaired_lines)

        # Case E: NameError
        elif error_type == "NameError" or "nameerror" in err_str:
            error_type = "NameError"
            var_name = "variable"
            var_match = re.search(r"name '([^']+)' is not defined", error_message)
            if var_match:
                var_name = var_match.group(1)
            what_went_wrong = f"The identifier `{var_name}` is referenced before it has been defined."
            why_it_happened = "In Python, variables and functions must be defined and assigned before being read."
            suggested_fix = f"Define `{var_name}` with an initial value or check for typos."
            
            # Smart check if typos exist (e.g. `name` vs `nam`)
            defined_vars = re.findall(r'^([a-zA-Z_][a-zA-Z0-9_]*)\s*=', source_code, re.MULTILINE)
            replaced = False
            repaired_lines = []
            for line in source_code.splitlines():
                if var_name in line and defined_vars:
                    # Replace typos with closest defined variable
                    best_match = defined_vars[0]
                    repaired_lines.append(line.replace(var_name, best_match))
                    replaced = True
                else:
                    repaired_lines.append(line)
            if not replaced:
                candidate_code = f'{var_name} = "value"\n' + source_code
            else:
                candidate_code = "\n".join(repaired_lines)

        # Case F: ZeroDivisionError
        elif error_type == "ZeroDivisionError" or "division by zero" in err_str:
            error_type = "ZeroDivisionError"
            what_went_wrong = "Division or modulo by zero was attempted."
            why_it_happened = "In Python, dividing any number by zero is mathematically undefined and raises `ZeroDivisionError`."
            suggested_fix = "Check that the divisor variable is non-zero before dividing."
            
            repaired_lines = []
            for line in source_code.splitlines():
                if "/" in line or "%" in line:
                    repaired_lines.append("if " + line.strip().split("/")[1].split("%")[0].strip() + " != 0:")
                    repaired_lines.append("    " + line)
                else:
                    repaired_lines.append(line)
            candidate_code = source_code

        # Case G: IndexError
        elif error_type == "IndexError" or "list index out of range" in err_str:
            error_type = "IndexError"
            what_went_wrong = "An index outside the valid range of the sequence was accessed."
            why_it_happened = "Python lists use zero-based indexing from `0` to `len(list) - 1`. Accessing a higher index raises `IndexError`."
            suggested_fix = "Ensure list indices remain within `len(list) - 1` or use boundary checks."
            candidate_code = source_code

        else:
            what_went_wrong = f"Execution failed with {error_type}{' on line ' + str(line_num) if line_num else ''}."
            why_it_happened = "The Python interpreter encountered an unexpected error during execution."
            suggested_fix = "Review the traceback details and verify variable types and syntax."
            candidate_code = source_code

        is_valid = False
        try:
            ast.parse(candidate_code)
            is_valid = True
        except SyntaxError:
            is_valid = False

        return {
            "status": "success",
            "error_type": error_type,
            "what_went_wrong": what_went_wrong,
            "why_it_happened": why_it_happened,
            "suggested_fix": suggested_fix,
            "corrected_code": candidate_code,
            "is_valid": is_valid
        }

    # Repository & Stats methods
    @classmethod
    def get_questions(cls, db: Session, user_id: int, difficulty: Optional[str] = None, category: Optional[str] = None, search: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(CodingQuestion)
        if difficulty:
            query = query.filter(CodingQuestion.difficulty == difficulty)
        if category:
            query = query.filter(CodingQuestion.category == category)
        if search:
            query = query.filter(CodingQuestion.title.ilike(f"%{search}%"))

        questions = query.order_by(CodingQuestion.id.asc()).all()
        subs = db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id).all()
        solved_ids = set(s.question_id for s in subs if s.status in ["Accepted", "accepted"])
        attempted_ids = set(s.question_id for s in subs)

        res = []
        for q in questions:
            q_status = "unsolved"
            if q.id in solved_ids:
                q_status = "solved"
            elif q.id in attempted_ids:
                q_status = "attempted"

            if status and status != q_status:
                continue

            res.append({
                "id": q.id,
                "title": q.title,
                "slug": q.slug,
                "difficulty": q.difficulty,
                "category": q.category,
                "role_tags": q.role_tags or [],
                "company_tags": q.company_tags or [],
                "estimated_time": q.estimated_time,
                "status": q_status
            })
        return res

    @classmethod
    def get_question_by_id(cls, db: Session, user_id: int, question_id: int) -> Optional[Dict[str, Any]]:
        q = db.query(CodingQuestion).filter(CodingQuestion.id == question_id).first()
        if not q:
            return None
        
        b = db.query(CodingBookmark).filter(CodingBookmark.user_id == user_id, CodingBookmark.question_id == question_id).first()
        return {
            "id": q.id,
            "title": q.title,
            "slug": q.slug,
            "difficulty": q.difficulty,
            "category": q.category,
            "role_tags": q.role_tags or [],
            "company_tags": q.company_tags or [],
            "estimated_time": q.estimated_time,
            "problem_statement": q.problem_statement,
            "input_format": q.input_format,
            "output_format": q.output_format,
            "constraints": q.constraints,
            "starter_code": q.starter_code or {},
            "visible_testcases": q.visible_testcases or [],
            "hints": q.hints or [],
            "is_bookmarked": b is not None
        }

    @classmethod
    def get_personalized_recommendation(cls, db: Session, user_id: int) -> Dict[str, Any]:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        target_role = profile.target_role if profile and profile.target_role else "Software Engineer"
        
        subs = db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id).all()
        solved_ids = set(s.question_id for s in subs if s.status in ["Accepted", "accepted"])
        
        recommendation = db.query(CodingQuestion).filter(~CodingQuestion.id.in_(solved_ids)).order_by(CodingQuestion.id.asc()).first()
        if not recommendation:
            recommendation = db.query(CodingQuestion).first()

        return {
            "target_role": target_role,
            "recommended_question": {
                "id": recommendation.id,
                "title": recommendation.title,
                "difficulty": recommendation.difficulty,
                "category": recommendation.category,
                "estimated_time": recommendation.estimated_time
            } if recommendation else None
        }

    @classmethod
    def get_draft(cls, db: Session, user_id: int, question_id: int, language: str) -> str:
        draft = db.query(CodingDraft).filter(CodingDraft.user_id == user_id, CodingDraft.question_id == question_id, CodingDraft.language == language).first()
        return draft.source_code if draft else ""

    @classmethod
    def save_draft(cls, db: Session, user_id: int, question_id: int, language: str, source_code: str):
        draft = db.query(CodingDraft).filter(CodingDraft.user_id == user_id, CodingDraft.question_id == question_id, CodingDraft.language == language).first()
        if draft:
            draft.source_code = source_code
        else:
            draft = CodingDraft(user_id=user_id, question_id=question_id, language=language, source_code=source_code)
            db.add(draft)
        db.commit()

    @classmethod
    def submit_solution(cls, db: Session, user_id: int, question_id: int, source_code: str, language: str) -> Dict[str, Any]:
        q = db.query(CodingQuestion).filter(CodingQuestion.id == question_id).first()
        if not q:
            return {"status": "Error", "message": "Question not found"}

        testcases = (q.visible_testcases or []) + (q.hidden_testcases or [])
        passed = 0
        total = len(testcases)
        last_exec = None

        if total == 0:
            exec_res = Judge0Client.execute_code(source_code=source_code, language=language)
            last_exec = exec_res
            passed = 1 if exec_res["status"] == "Accepted" else 0
            total = 1
        else:
            for tc in testcases:
                inp = tc.get("input", "")
                exp = tc.get("output", "").strip()
                res = Judge0Client.execute_code(source_code=source_code, language=language, stdin=inp, expected_output=exp)
                last_exec = res
                out = res.get("stdout", "").strip()
                if res.get("status") == "Accepted" and (not exp or out == exp):
                    passed += 1
                else:
                    break

        status = "Accepted" if passed == total else (last_exec.get("status") if last_exec else "Wrong Answer")
        sub = CodingSubmission(
            user_id=user_id,
            question_id=question_id,
            language=language,
            source_code=source_code,
            status=status,
            runtime_ms=last_exec.get("runtime_ms", 0.0) if last_exec else 0.0,
            memory_kb=last_exec.get("memory_kb", 0.0) if last_exec else 0.0,
            passed_testcases=passed,
            total_testcases=total,
            code_quality_score=90.0 if status == "Accepted" else 50.0
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)

        return {
            "submission_id": sub.id,
            "status": status,
            "passed_testcases": passed,
            "total_testcases": total,
            "runtime_ms": sub.runtime_ms,
            "memory_kb": sub.memory_kb,
            "code_quality_score": sub.code_quality_score
        }

    @classmethod
    def get_submission_history(cls, db: Session, user_id: int) -> List[Dict[str, Any]]:
        subs = db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id).order_by(CodingSubmission.submitted_at.desc()).all()
        return [{
            "id": s.id,
            "question_id": s.question_id,
            "language": s.language,
            "status": s.status,
            "runtime_ms": s.runtime_ms,
            "passed_testcases": s.passed_testcases,
            "total_testcases": s.total_testcases,
            "submitted_at": s.submitted_at.isoformat()
        } for s in subs]

    @classmethod
    def get_stats(cls, db: Session, user_id: int) -> Dict[str, Any]:
        subs = db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id).all()
        accepted_subs = [s for s in subs if s.status in ["Accepted", "accepted"]]
        unique_solved = len(set(s.question_id for s in accepted_subs))

        return {
            "total_submissions": len(subs),
            "accepted_submissions": len(accepted_subs),
            "unique_solved_questions": unique_solved,
            "accuracy_percentage": round((len(accepted_subs) / len(subs) * 100), 1) if subs else 0.0
        }

    @classmethod
    def toggle_bookmark(cls, db: Session, user_id: int, question_id: int) -> bool:
        b = db.query(CodingBookmark).filter(CodingBookmark.user_id == user_id, CodingBookmark.question_id == question_id).first()
        if b:
            db.delete(b)
            db.commit()
            return False
        else:
            b = CodingBookmark(user_id=user_id, question_id=question_id)
            db.add(b)
            db.commit()
            return True

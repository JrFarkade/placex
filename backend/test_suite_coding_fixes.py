import requests
import ast
import json

BASE_URL = "http://127.0.0.1:8000"

from app.core.security import create_access_token

token = create_access_token(subject='1')
headers = {"Authorization": f"Bearer {token}"}

test_cases = [
    {
        "name": "1. SyntaxError",
        "code": 'print("Hello, PlaceX!"\n',
        "error": 'SyntaxError: unexpected EOF while parsing',
        "error_type": "SyntaxError",
        "line": 1
    },
    {
        "name": "2. TypeError",
        "code": 'age = "25"\nnext_year = age + 1\nprint(next_year)\n',
        "error": 'TypeError: can only concatenate str (not "int") to str',
        "error_type": "TypeError",
        "line": 2
    },
    {
        "name": "3. NameError",
        "code": 'user_name = "Alice"\nprint("Welcome, " + username)\n',
        "error": "NameError: name 'username' is not defined",
        "error_type": "NameError",
        "line": 2
    },
    {
        "name": "4. IndexError",
        "code": 'items = [10, 20, 30]\nprint("Fourth item:", items[3])\n',
        "error": "IndexError: list index out of range",
        "error_type": "IndexError",
        "line": 2
    },
    {
        "name": "5. ZeroDivisionError",
        "code": 'total_score = 100\ncount = 0\navg = total_score / count\nprint(avg)\n',
        "error": "ZeroDivisionError: division by zero",
        "error_type": "ZeroDivisionError",
        "line": 3
    },
    {
        "name": "6. ValueError",
        "code": 'user_input = "forty-two"\nnum = int(user_input)\nprint(num * 2)\n',
        "error": "ValueError: invalid literal for int() with base 10: 'forty-two'",
        "error_type": "ValueError",
        "line": 2
    },
    {
        "name": "7. IndentationError",
        "code": 'def calculate_sum(a, b):\nreturn a + b\nprint(calculate_sum(3, 4))\n',
        "error": "IndentationError: expected an indented block after function definition on line 1",
        "error_type": "IndentationError",
        "line": 2
    },
    {
        "name": "8. Logical Error with User Question",
        "code": 'def sum_first_n(n):\n    total = 0\n    for i in range(n):\n        total = total * i\n    return total\nprint(sum_first_n(5))\n',
        "error": "",
        "stdout": "0",
        "error_type": "LogicalError",
        "user_question": "Why is the sum returning 0 instead of 10 or 15?"
    },
    {
        "name": "9. Long Code (40+ lines)",
        "code": """# Placement Problem: Student Grade Tracker
class Student:
    def __init__(self, name, roll_no):
        self.name = name
        self.roll_no = roll_no
        self.grades = []

    def add_grade(self, subject, score):
        self.grades.append({"subject": subject, "score": score})

    def get_average(self):
        if not self.grades:
            return 0.0
        total = sum(item["score"] for item in self.grades)
        return total / len(self.grades)

    def is_passing(self, threshold=50.0):
        avg = self.get_average()
        return avg >= threshold

class GradeBook:
    def __init__(self):
        self.students = {}

    def register_student(self, student):
        self.students[student.roll_no] = student

    def report_card(self, roll_no):
        if roll_no not in self.students:
            return "Student not found"
        st = self.students[roll_no]
        # Intentional bug on line below: accessing wrong attribute st.title instead of st.name
        return f"Report for {st.title}: Avg={st.get_average()}"

gb = GradeBook()
s1 = Student("John Doe", 101)
s1.add_grade("Math", 85)
s1.add_grade("Physics", 90)
gb.register_student(s1)
print(gb.report_card(101))
""",
        "error": "AttributeError: 'Student' object has no attribute 'title'",
        "error_type": "AttributeError",
        "line": 30
    }
]

print("=== STARTING COMPREHENSIVE CODING SANDBOX AI FIX TEST SUITE ===")
all_passed = True

for tc in test_cases:
    print(f"\nRunning {tc['name']}...")
    payload = {
        "source_code": tc["code"],
        "error_message": tc["error"] or "Execution completed with unexpected result.",
        "stdin_input": "",
        "stdout": tc.get("stdout", ""),
        "language": "python",
        "error_line": tc.get("line"),
        "error_type": tc.get("error_type"),
        "user_question": tc.get("user_question")
    }
    
    res = requests.post(f"{BASE_URL}/api/v1/agent/explain/coding-error", json=payload, headers=headers)
    if res.status_code != 200:
        print(f"FAILED (Status {res.status_code}): {res.text}")
        all_passed = False
        continue
    
    data = res.json()
    corrected_code = data.get("corrected_code", "")
    what = data.get("what_went_wrong") or data.get("what")
    why = data.get("why_it_happened") or data.get("why")
    how = data.get("how_to_fix") or data.get("now_what")
    status = data.get("verification_status")

    print(f"  Error Type: {data.get('error_type')}")
    print(f"  What Went Wrong: {what[:90] if what else 'None'}...")
    print(f"  Verification Status: {status}")
    
    # Verify AST syntax of corrected code
    try:
        ast.parse(corrected_code)
        ast_ok = True
    except Exception as e:
        ast_ok = False
        print(f"  AST parse error on corrected code: {e}")

    checks = [
        ("Corrected code returned", len(corrected_code) > 0),
        ("AST syntax valid", ast_ok),
        ("What went wrong provided", bool(what)),
        ("Why it happened provided", bool(why)),
        ("How to fix provided", bool(how)),
        ("Verification status verified", status == "syntax_verified")
    ]

    failed_checks = [c[0] for c in checks if not c[1]]
    if failed_checks:
        print(f"  FAILED CHECKS: {failed_checks}")
        all_passed = False
    else:
        print("  [PASS] ALL CHECKS PASSED")

if all_passed:
    print("\n=======================================================")
    print("[PASS] SUCCESS: ALL 9 TEST CASES PASSED WITH LIVE HOST AGENT!")
    print("=======================================================")
else:
    print("\nSome tests had issues.")

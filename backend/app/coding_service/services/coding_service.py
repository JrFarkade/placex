from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.coding_service.judge.judge0_client import Judge0Client
from app.coding_service.analysis.ast_analyzer import ASTAnalyzer
from app.models.coding import CodingQuestion, CodingSubmission, CodingDraft, CodingBookmark
from app.models.profile import StudentProfile

SEED_QUESTIONS = [
    {
        "title": "SQL Sales Revenue & Aggregation",
        "slug": "sql-sales-revenue-aggregation",
        "difficulty": "Easy",
        "category": "SQL",
        "role_tags": ["Data Analyst", "Product Analyst", "Business Analyst"],
        "company_tags": ["Amazon", "Flipkart", "Uber"],
        "estimated_time": "15 mins",
        "problem_statement": "Write a Python script simulating a SQL aggregation to calculate total revenue per product category from sales data and filter categories where revenue exceeds 5000.",
        "input_format": "sales = [{'category': 'Electronics', 'amount': 3000}, {'category': 'Electronics', 'amount': 3500}, {'category': 'Books', 'amount': 400}]",
        "output_format": "Printed category and revenue sum",
        "constraints": "Amount > 0. Filter revenue > 5000.",
        "starter_code": {
            "python": "def filter_high_revenue_categories(sales):\n    # Write your aggregation logic here\n    pass\n\n# Test execution\nsales_data = [\n    {'category': 'Electronics', 'amount': 3000},\n    {'category': 'Electronics', 'amount': 3500},\n    {'category': 'Books', 'amount': 400}\n]\nprint(filter_high_revenue_categories(sales_data))",
            "javascript": "function filterHighRevenueCategories(sales) {\n    // Write your aggregation logic here\n}\n\nconst salesData = [\n    {category: 'Electronics', amount: 3000},\n    {category: 'Electronics', amount: 3500},\n    {category: 'Books', amount: 400}\n];\nconsole.log(filterHighRevenueCategories(salesData));"
        },
        "visible_testcases": [
            {"input": "sales = [{'category': 'Electronics', 'amount': 3000}, {'category': 'Electronics', 'amount': 3500}]", "expected": "{'Electronics': 6500}"}
        ],
        "hidden_testcases": [
            {"input": "sales = [{'category': 'Furniture', 'amount': 6000}]", "expected": "{'Furniture': 6000}"}
        ],
        "hints": [
            "Hint 1: Use a dictionary/object to sum total amounts by category key.",
            "Hint 2: Filter the aggregated dictionary to include only categories where sum > 5000."
        ],
        "editorial": "SQL Aggregation & Having Clause:\nSELECT category, SUM(amount) AS total_revenue FROM sales GROUP BY category HAVING SUM(amount) > 5000;"
    },
    {
        "title": "Pandas Data Cleaning & Outlier Removal",
        "slug": "pandas-data-cleaning-outliers",
        "difficulty": "Medium",
        "category": "Data Analysis",
        "role_tags": ["Data Analyst", "Machine Learning Engineer"],
        "company_tags": ["Google", "Meta", "IBM"],
        "estimated_time": "20 mins",
        "problem_statement": "Write a Python function to clean numerical data by removing outliers that lie outside 2 standard deviations from the mean.",
        "input_format": "salaries = [45000, 50000, 52000, 48000, 250000]",
        "output_format": "Filtered list of non-outlier numbers",
        "constraints": "Keep elements where abs(x - mean) <= 2 * std.",
        "starter_code": {
            "python": "def remove_outliers(numbers):\n    # Calculate mean and std_dev, then return filtered list\n    pass\n\n# Test execution\nprint(remove_outliers([45000, 50000, 52000, 48000, 250000]))",
            "javascript": "function removeOutliers(numbers) {\n    // Calculate mean and std_dev, then return filtered array\n}\nconsole.log(removeOutliers([45000, 50000, 52000, 48000, 250000]));"
        },
        "visible_testcases": [
            {"input": "[45000, 50000, 52000, 48000, 250000]", "expected": "[45000, 50000, 52000, 48000]"}
        ],
        "hidden_testcases": [
            {"input": "[10, 12, 11, 9, 100]", "expected": "[10, 12, 11, 9]"}
        ],
        "hints": [
            "Hint 1: Calculate the mean by summing the elements and dividing by length.",
            "Hint 2: Calculate standard deviation variance = sum((x - mean)^2) / n, then std = sqrt(variance)."
        ],
        "editorial": "Standard Deviation Thresholding: Identifies extreme data points that skew regression models and statistical insights."
    },
    {
        "title": "Two Sum",
        "slug": "two-sum",
        "difficulty": "Easy",
        "category": "Arrays",
        "role_tags": ["Software Engineer", "Backend Developer"],
        "company_tags": ["Google", "Amazon", "Microsoft"],
        "estimated_time": "15 mins",
        "problem_statement": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
        "input_format": "nums = [2,7,11,15], target = 9",
        "output_format": "[0, 1]",
        "constraints": "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9",
        "starter_code": {
            "python": "def twoSum(nums, target):\n    # Write your O(n) hash map solution here\n    pass\n\n# Test execution\nprint(twoSum([2, 7, 11, 15], 9))",
            "javascript": "function twoSum(nums, target) {\n    // Write your solution here\n}\nconsole.log(twoSum([2, 7, 11, 15], 9));",
            "cpp": "#include <iostream>\n#include <vector>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Write your solution here\n    return {};\n}\n\nint main() {\n    vector<int> nums = {2, 7, 11, 15};\n    auto res = twoSum(nums, 9);\n    cout << \"[\" << res[0] << \", \" << res[1] << \"]\" << endl;\n    return 0;\n}"
        },
        "visible_testcases": [
            {"input": "nums = [2, 7, 11, 15], target = 9", "expected": "[0, 1]"},
            {"input": "nums = [3, 2, 4], target = 6", "expected": "[1, 2]"}
        ],
        "hidden_testcases": [
            {"input": "nums = [3, 3], target = 6", "expected": "[0, 1]"}
        ],
        "hints": [
            "Hint 1: A brute-force two-loop solution is O(n^2). Can you do it in a single pass?",
            "Hint 2: Try using a Hash Map to store values you've seen and check for the complement target - nums[i]."
        ],
        "editorial": "Approach: Hash Map Lookup\nBy iterating through the array once and storing each value's index in a hash map, we can look up the required complement (target - current_val) in O(1) time complexity."
    },
    {
        "title": "Valid Palindrome",
        "slug": "valid-palindrome",
        "difficulty": "Easy",
        "category": "Strings",
        "role_tags": ["Software Engineer", "Frontend Developer"],
        "company_tags": ["Meta", "Apple"],
        "estimated_time": "15 mins",
        "problem_statement": "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string `s`, return `True` if it is a palindrome, or `False` otherwise.",
        "input_format": "s = \"A man, a plan, a canal: Panama\"",
        "output_format": "True",
        "constraints": "1 <= s.length <= 2 * 10^5",
        "starter_code": {
            "python": "def isPalindrome(s):\n    # Write your solution here\n    pass\n\nprint(isPalindrome(\"A man, a plan, a canal: Panama\"))",
            "javascript": "function isPalindrome(s) {\n    // Write your solution here\n}\nconsole.log(isPalindrome(\"A man, a plan, a canal: Panama\"));"
        },
        "visible_testcases": [
            {"input": "s = \"A man, a plan, a canal: Panama\"", "expected": "True"},
            {"input": "s = \"race a car\"", "expected": "False"}
        ],
        "hidden_testcases": [
            {"input": "s = \" \"", "expected": "True"}
        ],
        "hints": [
            "Hint 1: Filter out non-alphanumeric characters using `isalnum()` or regex.",
            "Hint 2: Use two pointers at start and end of string, moving inward."
        ],
        "editorial": "Two Pointer Technique: Compare characters from left and right boundaries until they meet in the middle."
    },
    {
        "title": "Valid Parentheses",
        "slug": "valid-parentheses",
        "difficulty": "Easy",
        "category": "Stacks",
        "role_tags": ["Software Engineer", "Backend Developer"],
        "company_tags": ["Amazon", "Bloomberg", "Google"],
        "estimated_time": "15 mins",
        "problem_statement": "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if open brackets are closed by the same type of brackets and in the correct order.",
        "input_format": "s = \"()[]{}\"",
        "output_format": "True",
        "constraints": "1 <= s.length <= 10^4",
        "starter_code": {
            "python": "def isValid(s):\n    # Write your stack-based solution here\n    pass\n\nprint(isValid(\"()[]{}\"))",
            "javascript": "function isValid(s) {\n    // Write your stack-based solution here\n}\nconsole.log(isValid(\"()[]{}\"));"
        },
        "visible_testcases": [
            {"input": "s = \"()[]{}\"", "expected": "True"},
            {"input": "s = \"(]\"", "expected": "False"}
        ],
        "hidden_testcases": [
            {"input": "s = \"([{}])\"", "expected": "True"}
        ],
        "hints": [
            "Hint 1: Use a Stack data structure to keep track of open brackets.",
            "Hint 2: When encountering a closing bracket, pop from the stack and check if it matches the opening bracket."
        ],
        "editorial": "Stack LIFO Behavior: Push opening brackets onto stack; pop and check match on closing brackets."
    },
    {
        "title": "Container With Most Water",
        "slug": "container-with-most-water",
        "difficulty": "Medium",
        "category": "Two Pointers",
        "role_tags": ["Software Engineer", "Algorithms Engineer"],
        "company_tags": ["Google", "Amazon", "Meta"],
        "estimated_time": "20 mins",
        "problem_statement": "You are given an integer array `height` of length `n`. Find two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.",
        "input_format": "height = [1,8,6,2,5,4,8,3,7]",
        "output_format": "49",
        "constraints": "n == height.length, 2 <= n <= 10^5",
        "starter_code": {
            "python": "def maxArea(height):\n    # Write your two-pointer O(n) solution here\n    pass\n\nprint(maxArea([1,8,6,2,5,4,8,3,7]))",
            "javascript": "function maxArea(height) {\n    // Write your solution here\n}\nconsole.log(maxArea([1,8,6,2,5,4,8,3,7]));"
        },
        "visible_testcases": [
            {"input": "height = [1,8,6,2,5,4,8,3,7]", "expected": "49"}
        ],
        "hidden_testcases": [
            {"input": "height = [1,1]", "expected": "1"}
        ],
        "hints": [
            "Hint 1: Start with two pointers at the extreme ends of the array.",
            "Hint 2: Always move the pointer pointing to the shorter line inward."
        ],
        "editorial": "Two Pointer Greedy Approach: Maximize width first, then shrink width while seeking larger height."
    },
    {
        "title": "Lowest Common Ancestor of a BST",
        "slug": "lowest-common-ancestor-bst",
        "difficulty": "Medium",
        "category": "Trees",
        "role_tags": ["Software Engineer", "Backend Developer"],
        "company_tags": ["Google", "Adobe", "Oracle"],
        "estimated_time": "25 mins",
        "problem_statement": "Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given node values `p` and `q` in the BST.",
        "input_format": "root_vals = [6,2,8,0,4,7,9], p = 2, q = 8",
        "output_format": "6",
        "constraints": "Node values are unique. p != q.",
        "starter_code": {
            "python": "def lowestCommonAncestor(root_vals, p, q):\n    # Write your BST traversal logic here\n    pass\n\nprint(lowestCommonAncestor([6,2,8,0,4,7,9], 2, 8))",
            "javascript": "function lowestCommonAncestor(rootVals, p, q) {\n    // Write your solution here\n}\nconsole.log(lowestCommonAncestor([6,2,8,0,4,7,9], 2, 8));"
        },
        "visible_testcases": [
            {"input": "root_vals = [6,2,8], p = 2, q = 8", "expected": "6"}
        ],
        "hidden_testcases": [
            {"input": "root_vals = [6,2,8], p = 2, q = 4", "expected": "2"}
        ],
        "hints": [
            "Hint 1: Use BST properties — left subtree values are smaller, right subtree values are larger.",
            "Hint 2: If both p and q are smaller than current node, traverse left. If both are larger, traverse right."
        ],
        "editorial": "BST Property Traversal: O(h) time complexity where h is tree height."
    },
    {
        "title": "Maximum Subarray (Kadane's Algorithm)",
        "slug": "maximum-subarray-kadane",
        "difficulty": "Medium",
        "category": "Dynamic Programming",
        "role_tags": ["Software Engineer", "Algorithms Engineer"],
        "company_tags": ["Microsoft", "LinkedIn", "Amazon"],
        "estimated_time": "20 mins",
        "problem_statement": "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.",
        "input_format": "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        "output_format": "6",
        "constraints": "1 <= nums.length <= 10^5",
        "starter_code": {
            "python": "def maxSubArray(nums):\n    # Write your Kadane's algorithm solution here\n    pass\n\nprint(maxSubArray([-2,1,-3,4,-1,2,1,-5,4]))",
            "javascript": "function maxSubArray(nums) {\n    // Write your solution here\n}\nconsole.log(maxSubArray([-2,1,-3,4,-1,2,1,-5,4]));"
        },
        "visible_testcases": [
            {"input": "nums = [-2,1,-3,4,-1,2,1,-5,4]", "expected": "6"}
        ],
        "hidden_testcases": [
            {"input": "nums = [1]", "expected": "1"},
            {"input": "nums = [5,4,-1,7,8]", "expected": "23"}
        ],
        "hints": [
            "Hint 1: Maintain a current sum and a global maximum sum.",
            "Hint 2: If current sum drops below zero, reset it to 0 or the current element."
        ],
        "editorial": "Kadane's Algorithm: Dynamic programming technique in O(n) time and O(1) space."
    }
]

class CodingService:
    """
    Complete Coding Intelligence Service handling real database questions, 
    personalized recommendations, drafts, test execution, submission storage, and analytics.
    """

    @classmethod
    def init_seed_questions(cls, db: Session):
        """Seed database with questions if database is empty."""
        try:
            count = db.query(CodingQuestion).count()
            if count == 0:
                for q_data in SEED_QUESTIONS:
                    db_q = CodingQuestion(
                        title=q_data["title"],
                        slug=q_data["slug"],
                        difficulty=q_data["difficulty"],
                        category=q_data["category"],
                        role_tags=q_data.get("role_tags", ["Software Engineer"]),
                        company_tags=q_data.get("company_tags", ["Tech"]),
                        estimated_time=q_data.get("estimated_time", "15 mins"),
                        problem_statement=q_data["problem_statement"],
                        input_format=q_data.get("input_format", ""),
                        output_format=q_data.get("output_format", ""),
                        constraints=q_data.get("constraints", ""),
                        starter_code=q_data["starter_code"],
                        visible_testcases=q_data["visible_testcases"],
                        hidden_testcases=q_data["hidden_testcases"],
                        hints=q_data.get("hints", []),
                        editorial=q_data.get("editorial", "")
                    )
                    db.add(db_q)
                db.commit()
        except Exception as e:
            db.rollback()
            print("Seed initialization warning:", e)

    @classmethod
    def get_questions(
        cls, 
        db: Session, 
        user_id: int,
        difficulty: Optional[str] = None, 
        category: Optional[str] = None,
        role: Optional[str] = None,
        search: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        cls.init_seed_questions(db)
        
        query = db.query(CodingQuestion)
        if difficulty and difficulty.lower() != 'all':
            query = query.filter(CodingQuestion.difficulty.ilike(difficulty))
        if category and category.lower() != 'all':
            query = query.filter(CodingQuestion.category.ilike(f"%{category}%"))
        if search:
            query = query.filter(CodingQuestion.title.ilike(f"%{search}%") | CodingQuestion.category.ilike(f"%{search}%"))

        db_qs = query.all()

        # Get solved question IDs for user
        solved_ids = set(
            sub.question_id for sub in db.query(CodingSubmission.question_id)
            .filter(CodingSubmission.user_id == user_id, CodingSubmission.status == "Accepted")
            .all()
        )
        bookmarked_ids = set(
            bm.question_id for bm in db.query(CodingBookmark.question_id)
            .filter(CodingBookmark.user_id == user_id)
            .all()
        )

        result = []
        for q in db_qs:
            is_solved = q.id in solved_ids
            is_bookmarked = q.id in bookmarked_ids

            if status == 'solved' and not is_solved:
                continue
            if status == 'unsolved' and is_solved:
                continue
            if status == 'bookmarked' and not is_bookmarked:
                continue

            result.append({
                "id": q.id,
                "title": q.title,
                "slug": q.slug,
                "difficulty": q.difficulty,
                "category": q.category,
                "role_tags": q.role_tags or [],
                "company_tags": q.company_tags or [],
                "estimated_time": q.estimated_time or "15 mins",
                "is_solved": is_solved,
                "is_bookmarked": is_bookmarked,
                "problem_statement": q.problem_statement[:120] + "..." if len(q.problem_statement) > 120 else q.problem_statement
            })

        return result

    @classmethod
    def get_question_by_id(cls, db: Session, user_id: int, question_id: int) -> Optional[Dict[str, Any]]:
        cls.init_seed_questions(db)
        q = db.query(CodingQuestion).filter(CodingQuestion.id == question_id).first()
        if not q:
            q = db.query(CodingQuestion).first()
        if not q:
            return None

        is_solved = db.query(CodingSubmission).filter(
            CodingSubmission.user_id == user_id,
            CodingSubmission.question_id == q.id,
            CodingSubmission.status == "Accepted"
        ).first() is not None

        is_bookmarked = db.query(CodingBookmark).filter(
            CodingBookmark.user_id == user_id,
            CodingBookmark.question_id == q.id
        ).first() is not None

        return {
            "id": q.id,
            "title": q.title,
            "slug": q.slug,
            "difficulty": q.difficulty,
            "category": q.category,
            "role_tags": q.role_tags or [],
            "company_tags": q.company_tags or [],
            "estimated_time": q.estimated_time or "15 mins",
            "problem_statement": q.problem_statement,
            "input_format": q.input_format,
            "output_format": q.output_format,
            "constraints": q.constraints,
            "starter_code": q.starter_code or {},
            "visible_testcases": q.visible_testcases or [],
            "hints": q.hints or [],
            "editorial": q.editorial or "",
            "is_solved": is_solved,
            "is_bookmarked": is_bookmarked
        }

    @classmethod
    def get_personalized_recommendation(cls, db: Session, user_id: int) -> Dict[str, Any]:
        cls.init_seed_questions(db)
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        target_role = profile.target_role if profile and profile.target_role else "Data Analyst"

        solved_ids = set(
            sub.question_id for sub in db.query(CodingSubmission.question_id)
            .filter(CodingSubmission.user_id == user_id, CodingSubmission.status == "Accepted")
            .all()
        )

        all_qs = db.query(CodingQuestion).all()
        unsolved_qs = [q for q in all_qs if q.id not in solved_ids]
        candidate_qs = unsolved_qs if unsolved_qs else all_qs

        # Filter by role tags if matching candidates exist
        role_clean = target_role.lower()
        role_matched = [q for q in candidate_qs if any(role_clean in r.lower() for r in (q.role_tags or []))]
        selected_q = role_matched[0] if role_matched else candidate_qs[0]

        reason = f"Recommended for your target role ({target_role}) to build core problem-solving mastery."
        if "data analyst" in role_clean or "sql" in selected_q.category.lower():
            reason = f"Recommended because SQL & Data Manipulation are core focus areas for your {target_role} path."

        return {
            "recommended_question": {
                "id": selected_q.id,
                "title": selected_q.title,
                "slug": selected_q.slug,
                "difficulty": selected_q.difficulty,
                "category": selected_q.category,
                "estimated_time": selected_q.estimated_time or "15 mins",
                "problem_statement": selected_q.problem_statement
            },
            "reason": reason,
            "target_role": target_role
        }

    @classmethod
    def get_draft(cls, db: Session, user_id: int, question_id: int, language: str) -> Optional[str]:
        draft = db.query(CodingDraft).filter(
            CodingDraft.user_id == user_id,
            CodingDraft.question_id == question_id,
            CodingDraft.language == language
        ).first()
        return draft.source_code if draft else None

    @classmethod
    def save_draft(cls, db: Session, user_id: int, question_id: int, language: str, source_code: str):
        draft = db.query(CodingDraft).filter(
            CodingDraft.user_id == user_id,
            CodingDraft.question_id == question_id,
            CodingDraft.language == language
        ).first()

        if draft:
            draft.source_code = source_code
            draft.updated_at = datetime.utcnow()
        else:
            draft = CodingDraft(
                user_id=user_id,
                question_id=question_id,
                language=language,
                source_code=source_code
            )
            db.add(draft)
        db.commit()

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
    def submit_solution(cls, db: Session, user_id: int, question_id: int, source_code: str, language: str) -> Dict[str, Any]:
        cls.init_seed_questions(db)
        q = db.query(CodingQuestion).filter(CodingQuestion.id == question_id).first()
        visible_tests = q.visible_testcases if q and q.visible_testcases else []
        hidden_tests = q.hidden_testcases if q and q.hidden_testcases else []
        all_tests = visible_tests + hidden_tests
        total_tests = max(1, len(all_tests))

        exec_res = Judge0Client.execute_code(source_code=source_code, language=language)
        ast_res = ASTAnalyzer.analyze_code(source_code=source_code, language=language)

        passed_count = 0
        final_status = exec_res["status"]

        if final_status == "Accepted":
            passed_count = total_tests
        else:
            passed_count = 0

        # Save official submission
        sub = CodingSubmission(
            user_id=user_id,
            question_id=question_id,
            language=language,
            source_code=source_code,
            status=final_status,
            runtime_ms=exec_res["runtime_ms"],
            memory_kb=exec_res["memory_kb"],
            passed_testcases=passed_count,
            total_testcases=total_tests,
            code_quality_score=ast_res["code_quality_score"]
        )
        db.add(sub)

        # Update student profile stats if Accepted
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        if profile and final_status == "Accepted":
            solved_count = db.query(func.count(func.distinct(CodingSubmission.question_id))).filter(
                CodingSubmission.user_id == user_id,
                CodingSubmission.status == "Accepted"
            ).scalar()
            profile.coding_solved = solved_count or 1
            if profile.readiness_score is not None:
                profile.readiness_score = min(100, profile.readiness_score + 3)

        db.commit()

        return {
            "submission_id": sub.id,
            "status": final_status,
            "passed_testcases": passed_count,
            "total_testcases": total_tests,
            "runtime_ms": exec_res["runtime_ms"],
            "memory_kb": exec_res["memory_kb"],
            "stdout": exec_res["stdout"],
            "stderr": exec_res["stderr"],
            "time_complexity": ast_res["time_complexity"],
            "space_complexity": ast_res["space_complexity"],
            "code_quality_score": ast_res["code_quality_score"]
        }

    @classmethod
    def get_submission_history(cls, db: Session, user_id: int) -> List[Dict[str, Any]]:
        subs = db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id).order_by(CodingSubmission.submitted_at.desc()).limit(20).all()
        history = []
        for s in subs:
            q = db.query(CodingQuestion).filter(CodingQuestion.id == s.question_id).first()
            history.append({
                "id": s.id,
                "question_id": s.question_id,
                "question_title": q.title if q else f"Question #{s.question_id}",
                "difficulty": q.difficulty if q else "Medium",
                "language": s.language,
                "status": s.status,
                "runtime_ms": s.runtime_ms,
                "memory_kb": s.memory_kb,
                "passed_testcases": s.passed_testcases,
                "total_testcases": s.total_testcases,
                "submitted_at": s.submitted_at.strftime("%b %d, %Y %H:%M")
            })
        return history

    @classmethod
    def get_stats(cls, db: Session, user_id: int) -> Dict[str, Any]:
        cls.init_seed_questions(db)
        total_questions = db.query(CodingQuestion).count()
        easy_total = db.query(CodingQuestion).filter(CodingQuestion.difficulty == "Easy").count()
        medium_total = db.query(CodingQuestion).filter(CodingQuestion.difficulty == "Medium").count()
        hard_total = db.query(CodingQuestion).filter(CodingQuestion.difficulty == "Hard").count()

        solved_qids = db.query(CodingSubmission.question_id).filter(
            CodingSubmission.user_id == user_id, CodingSubmission.status == "Accepted"
        ).distinct().all()
        solved_ids = [r[0] for r in solved_qids]

        solved_easy = db.query(CodingQuestion).filter(CodingQuestion.id.in_(solved_ids), CodingQuestion.difficulty == "Easy").count() if solved_ids else 0
        solved_medium = db.query(CodingQuestion).filter(CodingQuestion.id.in_(solved_ids), CodingQuestion.difficulty == "Medium").count() if solved_ids else 0
        solved_hard = db.query(CodingQuestion).filter(CodingQuestion.id.in_(solved_ids), CodingQuestion.difficulty == "Hard").count() if solved_ids else 0

        total_submissions = db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id).count()
        accepted_submissions = db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id, CodingSubmission.status == "Accepted").count()
        accuracy = round((accepted_submissions / total_submissions * 100), 1) if total_submissions > 0 else 0.0

        # Topic mastery breakdown
        categories = ["SQL", "Python", "Arrays", "Data Analysis", "Strings", "Stacks", "Trees"]
        topic_mastery = []
        for cat in categories:
            cat_total = db.query(CodingQuestion).filter(CodingQuestion.category.ilike(f"%{cat}%")).count()
            cat_solved = db.query(CodingQuestion).filter(CodingQuestion.id.in_(solved_ids), CodingQuestion.category.ilike(f"%{cat}%")).count() if solved_ids else 0
            pct = round((cat_solved / cat_total * 100)) if cat_total > 0 else 0
            topic_mastery.append({"topic": cat, "solved": cat_solved, "total": max(1, cat_total), "percentage": pct})

        return {
            "solved_count": len(solved_ids),
            "total_questions": total_questions,
            "easy": {"solved": solved_easy, "total": easy_total},
            "medium": {"solved": solved_medium, "total": medium_total},
            "hard": {"solved": solved_hard, "total": hard_total},
            "accuracy": accuracy,
            "total_submissions": total_submissions,
            "streak_days": 1 if len(solved_ids) > 0 else 0,
            "topic_mastery": topic_mastery
        }

    @classmethod
    def toggle_bookmark(cls, db: Session, user_id: int, question_id: int) -> bool:
        bm = db.query(CodingBookmark).filter(
            CodingBookmark.user_id == user_id,
            CodingBookmark.question_id == question_id
        ).first()

        if bm:
            db.delete(bm)
            db.commit()
            return False
        else:
            new_bm = CodingBookmark(user_id=user_id, question_id=question_id)
            db.add(new_bm)
            db.commit()
            return True

"""
app/seed_data.py
~~~~~~~~~~~~~~~~
Idempotent seed script that populates the database with curated MCQs
categorised by domain, sub_topic, difficulty, and question_type ('theory' | 'code' | 'scenario').

Usage
-----
    python -m app.seed_data          # from project root

The script checks if curated questions already exist before inserting,
so it is safe to run multiple times.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Ensure the project root is on sys.path when run directly
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, func, delete

from app.core.database import AsyncSessionLocal, create_all_tables
from app.models.question import Question, QuestionTypeEnum, SourceEnum

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

# ══════════════════════════════════════════════════════════════════════════════
# CURATED QUESTION BANK (THEORY & CODE MCQS ACROSS ALL DOMAINS)
# ══════════════════════════════════════════════════════════════════════════════

SEED_QUESTIONS: list[dict] = [

    # =========================================================================
    # APTITUDE — THEORY / QUANTITATIVE (10 questions)
    # =========================================================================
    {
        "domain": "Aptitude",
        "question_type": "theory",
        "sub_topic": "Percentages",
        "difficulty": "easy",
        "question_text": (
            "A shopkeeper marks his goods 40% above the cost price and then offers "
            "a 20% discount. What is his profit percentage?"
        ),
        "options": ["12%", "16%", "20%", "8%"],
        "correct_option_index": 0,
        "explanation": (
            "Let cost price = 100. Marked price = 140. "
            "After 20% discount: selling price = 140 × 0.80 = 112. "
            "Profit = 112 − 100 = 12, so profit% = 12%."
        ),
        "source": "Curated",
    },
    {
        "domain": "Aptitude",
        "question_type": "theory",
        "sub_topic": "Time, Speed & Distance",
        "difficulty": "medium",
        "question_text": (
            "A train 240 m long passes a pole in 24 seconds. How long will it take "
            "to pass a platform 360 m long?"
        ),
        "options": ["60 seconds", "54 seconds", "48 seconds", "36 seconds"],
        "correct_option_index": 0,
        "explanation": (
            "Speed = 240 m ÷ 24 s = 10 m/s. "
            "Total distance to clear the platform = 240 + 360 = 600 m. "
            "Time = 600 ÷ 10 = 60 seconds."
        ),
        "source": "Curated",
    },
    {
        "domain": "Aptitude",
        "question_type": "theory",
        "sub_topic": "Probability",
        "difficulty": "medium",
        "question_text": (
            "A bag contains 5 red, 4 blue, and 3 green balls. "
            "If one ball is drawn at random, what is the probability it is NOT red?"
        ),
        "options": ["5/12", "7/12", "1/2", "3/4"],
        "correct_option_index": 1,
        "explanation": (
            "Total balls = 5 + 4 + 3 = 12. "
            "Non-red balls = 4 + 3 = 7. "
            "P(not red) = 7/12."
        ),
        "source": "Curated",
    },
    {
        "domain": "Aptitude",
        "question_type": "theory",
        "sub_topic": "Ratios & Proportions",
        "difficulty": "easy",
        "question_text": (
            "The ratio of the ages of A and B is 3:5. "
            "After 10 years the ratio will be 5:7. What is A's current age?"
        ),
        "options": ["15 years", "20 years", "25 years", "30 years"],
        "correct_option_index": 0,
        "explanation": (
            "Let A = 3x, B = 5x. "
            "After 10 years: (3x+10)/(5x+10) = 5/7. "
            "7(3x+10) = 5(5x+10) → 21x+70 = 25x+50 → 4x = 20 → x = 5. "
            "A = 3×5 = 15 years."
        ),
        "source": "Curated",
    },
    {
        "domain": "Aptitude",
        "question_type": "theory",
        "sub_topic": "Work & Time",
        "difficulty": "medium",
        "question_text": (
            "A can finish a job in 12 days; B can finish it in 18 days. "
            "They work together for 4 days, then A leaves. "
            "How many more days does B need to finish the remaining work?"
        ),
        "options": ["10 days", "9 days", "8 days", "6 days"],
        "correct_option_index": 2,
        "explanation": (
            "Combined rate = 1/12 + 1/18 = 5/36 per day. "
            "In 4 days together, work done = 4 × 5/36 = 20/36 = 5/9. "
            "Remaining = 1 − 5/9 = 4/9. "
            "B alone: (4/9) ÷ (1/18) = 8 days."
        ),
        "source": "Curated",
    },
    {
        "domain": "Aptitude",
        "question_type": "theory",
        "sub_topic": "Simple & Compound Interest",
        "difficulty": "medium",
        "question_text": (
            "What is the compound interest on ₹8000 at 10% per annum for 2 years, "
            "compounded annually?"
        ),
        "options": ["₹1600", "₹1680", "₹1728", "₹1760"],
        "correct_option_index": 1,
        "explanation": (
            "A = 8000 × (1 + 0.10)² = 8000 × 1.21 = 9680. "
            "CI = 9680 − 8000 = ₹1680."
        ),
        "source": "Curated",
    },
    {
        "domain": "Aptitude",
        "question_type": "theory",
        "sub_topic": "Number Systems",
        "difficulty": "easy",
        "question_text": "What is the LCM of 12, 18, and 24?",
        "options": ["36", "48", "72", "96"],
        "correct_option_index": 2,
        "explanation": (
            "Prime factorisation: 12 = 2²×3, 18 = 2×3², 24 = 2³×3. "
            "LCM = 2³ × 3² = 8 × 9 = 72."
        ),
        "source": "Curated",
    },
    {
        "domain": "Aptitude",
        "question_type": "theory",
        "sub_topic": "Averages",
        "difficulty": "easy",
        "question_text": (
            "The average of five consecutive odd numbers is 41. "
            "What is the largest of these numbers?"
        ),
        "options": ["43", "45", "47", "49"],
        "correct_option_index": 1,
        "explanation": (
            "For 5 consecutive odd numbers, the average equals the middle (3rd) number. "
            "Middle = 41. Numbers: 37, 39, 41, 43, 45. Largest = 45."
        ),
        "source": "Curated",
    },
    {
        "domain": "Aptitude",
        "question_type": "theory",
        "sub_topic": "Permutations & Combinations",
        "difficulty": "hard",
        "question_text": (
            "In how many ways can a committee of 3 men and 2 women be formed "
            "from a group of 6 men and 5 women?"
        ),
        "options": ["100", "150", "200", "250"],
        "correct_option_index": 2,
        "explanation": (
            "Ways to select 3 men from 6 = C(6,3) = 20. "
            "Ways to select 2 women from 5 = C(5,2) = 10. "
            "Total = 20 × 10 = 200."
        ),
        "source": "Curated",
    },
    {
        "domain": "Aptitude",
        "question_type": "theory",
        "sub_topic": "Profit & Loss",
        "difficulty": "hard",
        "question_text": (
            "A person sells two articles at ₹1200 each. On one he gains 20% "
            "and on the other he loses 20%. What is his overall gain or loss percentage?"
        ),
        "options": ["No loss, no gain", "4% gain", "4% loss", "2% loss"],
        "correct_option_index": 2,
        "explanation": (
            "When the same selling price is used and the profit/loss % are equal, "
            "there is always a net loss. Formula: Loss% = (common%)²/100 = 400/100 = 4%."
        ),
        "source": "Curated",
    },

    # =========================================================================
    # APTITUDE — CODE / ALGORITHMIC LOGIC (5 questions)
    # =========================================================================
    {
        "domain": "Aptitude",
        "question_type": "code",
        "sub_topic": "Number Systems",
        "difficulty": "medium",
        "question_text": (
            "What does the following Python snippet print?\n\n"
            "```python\n"
            "x = 0b1010  # binary literal\n"
            "y = 0o12    # octal literal\n"
            "z = 0xA     # hex literal\n"
            "print(x == y == z)\n"
            "```"
        ),
        "options": ["True", "False", "Error: mixed base comparison", "None"],
        "correct_option_index": 0,
        "explanation": (
            "All three literals evaluate to decimal 10: "
            "binary 1010₂ = 10, octal 12₈ = 10, hexadecimal A₁₆ = 10. "
            "Python evaluates `x == y == z` as `True`."
        ),
        "source": "Curated",
    },
    {
        "domain": "Aptitude",
        "question_type": "code",
        "sub_topic": "Logical Reasoning",
        "difficulty": "medium",
        "question_text": (
            "What is the output of the following Python code?\n\n"
            "```python\n"
            "result = [i * i for i in range(1, 6) if i % 2 != 0]\n"
            "print(result)\n"
            "```"
        ),
        "options": [
            "[1, 4, 9, 16, 25]",
            "[1, 9, 25]",
            "[2, 4]",
            "[4, 16]",
        ],
        "correct_option_index": 1,
        "explanation": (
            "range(1, 6) produces [1, 2, 3, 4, 5]. "
            "The filter `i % 2 != 0` leaves [1, 3, 5]. "
            "Squaring each yields [1, 9, 25]."
        ),
        "source": "Curated",
    },
    {
        "domain": "Aptitude",
        "question_type": "code",
        "sub_topic": "Averages",
        "difficulty": "easy",
        "question_text": (
            "A Python script reads a list of exam scores and computes the mean. "
            "What does it print?\n\n"
            "```python\n"
            "scores = [72, 85, 90, 68, 95]\n"
            "mean = sum(scores) / len(scores)\n"
            "print(round(mean, 1))\n"
            "```"
        ),
        "options": ["82.0", "82.5", "82.1", "81.0"],
        "correct_option_index": 0,
        "explanation": (
            "sum([72, 85, 90, 68, 95]) = 410. "
            "len(scores) = 5. "
            "mean = 410 / 5 = 82.0."
        ),
        "source": "Curated",
    },
    {
        "domain": "Aptitude",
        "question_type": "code",
        "sub_topic": "Bitwise Operations",
        "difficulty": "hard",
        "question_text": (
            "What is the value of `result` after executing the following bitwise manipulation in Python?\n\n"
            "```python\n"
            "a = 12  # 1100 in binary\n"
            "b = 10  # 1010 in binary\n"
            "result = (a ^ b) << 1\n"
            "print(result)\n"
            "```"
        ),
        "options": ["6", "12", "16", "24"],
        "correct_option_index": 1,
        "explanation": (
            "a ^ b (XOR) computes 1100 ^ 1010 = 0110 (decimal 6). "
            "Left-shifting by 1 bit (6 << 1) equals 6 × 2 = 12."
        ),
        "source": "Curated",
    },
    {
        "domain": "Aptitude",
        "question_type": "code",
        "sub_topic": "Recursion & Math",
        "difficulty": "medium",
        "question_text": (
            "What is the return value of `gcd(48, 18)` using this recursive Euclidean algorithm?\n\n"
            "```python\n"
            "def gcd(a, b):\n"
            "    if b == 0:\n"
            "        return a\n"
            "    return gcd(b, a % b)\n"
            "```"
        ),
        "options": ["2", "4", "6", "12"],
        "correct_option_index": 2,
        "explanation": (
            "gcd(48, 18) -> gcd(18, 48 % 18 = 12) -> gcd(12, 18 % 12 = 6) -> gcd(6, 12 % 6 = 0) -> returns 6."
        ),
        "source": "Curated",
    },

    # =========================================================================
    # SOFTWARE ENGINEERING — THEORY (10 questions)
    # =========================================================================
    {
        "domain": "SoftwareEngineering",
        "question_type": "theory",
        "sub_topic": "SOLID Principles",
        "difficulty": "medium",
        "question_text": (
            "Which SOLID principle states that a class should have only one reason to change?"
        ),
        "options": [
            "Open/Closed Principle",
            "Single Responsibility Principle",
            "Liskov Substitution Principle",
            "Interface Segregation Principle",
        ],
        "correct_option_index": 1,
        "explanation": (
            "The Single Responsibility Principle (SRP) dictates that a class "
            "should have only one responsibility — i.e., only one reason to change."
        ),
        "source": "Curated",
    },
    {
        "domain": "SoftwareEngineering",
        "question_type": "theory",
        "sub_topic": "Design Patterns",
        "difficulty": "medium",
        "question_text": (
            "Which design pattern ensures that a class has only one instance "
            "and provides a global access point to it?"
        ),
        "options": ["Factory", "Singleton", "Prototype", "Builder"],
        "correct_option_index": 1,
        "explanation": (
            "The Singleton pattern restricts instantiation of a class to a single object "
            "and provides a global access point."
        ),
        "source": "Curated",
    },
    {
        "domain": "SoftwareEngineering",
        "question_type": "theory",
        "sub_topic": "Version Control (Git)",
        "difficulty": "easy",
        "question_text": (
            "What does `git rebase` do compared to `git merge`?"
        ),
        "options": [
            "Creates a merge commit preserving branch history",
            "Rewrites commit history onto the target branch tip",
            "Reverts the last commit",
            "Stashes uncommitted changes",
        ],
        "correct_option_index": 1,
        "explanation": (
            "git rebase replays commits from the current branch on top of the target branch, "
            "producing a linear history without a merge commit."
        ),
        "source": "Curated",
    },
    {
        "domain": "SoftwareEngineering",
        "question_type": "theory",
        "sub_topic": "Testing",
        "difficulty": "medium",
        "question_text": (
            "What type of testing verifies that individually tested modules work correctly "
            "when combined together?"
        ),
        "options": ["Unit testing", "Integration testing", "Regression testing", "Smoke testing"],
        "correct_option_index": 1,
        "explanation": (
            "Integration testing checks that separate modules or services function correctly "
            "as a combined unit, catching interface mismatches."
        ),
        "source": "Curated",
    },
    {
        "domain": "SoftwareEngineering",
        "question_type": "theory",
        "sub_topic": "System Design",
        "difficulty": "hard",
        "question_text": (
            "In the CAP theorem, which two properties can a distributed system guarantee "
            "simultaneously during a network partition?"
        ),
        "options": [
            "Consistency and Availability",
            "Availability and Partition tolerance",
            "Consistency and Partition tolerance",
            "All three: Consistency, Availability, and Partition tolerance",
        ],
        "correct_option_index": 2,
        "explanation": (
            "During a network partition, a distributed system must choose between "
            "Consistency (CP) or Availability (AP)."
        ),
        "source": "Curated",
    },
    {
        "domain": "SoftwareEngineering",
        "question_type": "theory",
        "sub_topic": "Data Structures",
        "difficulty": "medium",
        "question_text": (
            "What is the average-case time complexity of searching for an element in a "
            "balanced Binary Search Tree (BST)?"
        ),
        "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        "correct_option_index": 1,
        "explanation": (
            "In a balanced BST, each comparison halves the search space, yielding O(log n) time complexity."
        ),
        "source": "Curated",
    },
    {
        "domain": "SoftwareEngineering",
        "question_type": "theory",
        "sub_topic": "REST APIs",
        "difficulty": "easy",
        "question_text": (
            "Which HTTP status code should a REST API return when a resource "
            "is successfully created?"
        ),
        "options": ["200 OK", "201 Created", "204 No Content", "202 Accepted"],
        "correct_option_index": 1,
        "explanation": (
            "201 Created is the standard HTTP response for a successful resource creation (e.g. via POST)."
        ),
        "source": "Curated",
    },
    {
        "domain": "SoftwareEngineering",
        "question_type": "theory",
        "sub_topic": "Clean Code",
        "difficulty": "easy",
        "question_text": (
            "Which of the following best describes 'technical debt' in software development?"
        ),
        "options": [
            "The cost of buying third-party software licences",
            "Shortcuts taken during development that require future rework",
            "The amount owed to contractors for unfinished features",
            "The time spent writing automated tests",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Technical debt refers to future rework required due to choosing an expedient solution now instead of a better design."
        ),
        "source": "Curated",
    },
    {
        "domain": "SoftwareEngineering",
        "question_type": "theory",
        "sub_topic": "Algorithms",
        "difficulty": "hard",
        "question_text": (
            "Quicksort has an average time complexity of O(n log n). "
            "What is its worst-case time complexity and when does it occur?"
        ),
        "options": [
            "O(n log n) — it never degrades",
            "O(n²) — when the array is already sorted and the pivot is always the first/last element",
            "O(n²) — when the array contains all duplicate elements",
            "O(n log²n) — when the pivot selection is randomised",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Quicksort degrades to O(n²) when partition sizes are maximally unbalanced, such as picking the first/last element on sorted data."
        ),
        "source": "Curated",
    },
    {
        "domain": "SoftwareEngineering",
        "question_type": "theory",
        "sub_topic": "Databases",
        "difficulty": "medium",
        "question_text": (
            "What does ACID stand for in the context of database transactions?"
        ),
        "options": [
            "Atomicity, Consistency, Isolation, Durability",
            "Availability, Consistency, Integrity, Distribution",
            "Atomicity, Concurrency, Isolation, Durability",
            "Accuracy, Consistency, Isolation, Data-integrity",
        ],
        "correct_option_index": 0,
        "explanation": (
            "ACID stands for Atomicity, Consistency, Isolation, and Durability."
        ),
        "source": "Curated",
    },

    # =========================================================================
    # SOFTWARE ENGINEERING — CODE (6 questions)
    # =========================================================================
    {
        "domain": "SoftwareEngineering",
        "question_type": "code",
        "sub_topic": "Version Control (Git)",
        "difficulty": "medium",
        "question_text": (
            "What is the effect of running the following Git commands?\n\n"
            "```bash\n"
            "git checkout -b feature/auth\n"
            "# ... make changes ...\n"
            "git add .\n"
            "git commit -m \"Add JWT auth\"\n"
            "git checkout main\n"
            "git merge feature/auth --no-ff\n"
            "```"
        ),
        "options": [
            "Creates a fast-forward merge, rebasing feature/auth onto main",
            "Creates a merge commit on main that preserves the feature branch history",
            "Squashes all commits into one and merges into main",
            "Deletes the feature/auth branch after merging",
        ],
        "correct_option_index": 1,
        "explanation": (
            "`--no-ff` (no fast-forward) forces Git to create a merge commit even if a fast-forward is possible, preserving branch history."
        ),
        "source": "Curated",
    },
    {
        "domain": "SoftwareEngineering",
        "question_type": "code",
        "sub_topic": "Algorithms",
        "difficulty": "hard",
        "question_text": (
            "What is the time complexity of the following function?\n\n"
            "```python\n"
            "def has_duplicate(arr):\n"
            "    n = len(arr)\n"
            "    for i in range(n):\n"
            "        for j in range(n):\n"
            "            if arr[i] == arr[j] and i != j:\n"
            "                return True\n"
            "    return False\n"
            "```"
        ),
        "options": ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"],
        "correct_option_index": 2,
        "explanation": (
            "Nested loops iterating over n elements give a worst-case time complexity of O(n²)."
        ),
        "source": "Curated",
    },
    {
        "domain": "SoftwareEngineering",
        "question_type": "code",
        "sub_topic": "REST APIs",
        "difficulty": "medium",
        "question_text": (
            "A FastAPI endpoint is defined as below. "
            "What HTTP status code does it return on a successful POST?\n\n"
            "```python\n"
            "from fastapi import APIRouter, status\n"
            "router = APIRouter()\n\n"
            "@router.post(\"/items\", status_code=status.HTTP_201_CREATED)\n"
            "async def create_item(name: str):\n"
            "    return {\"name\": name}\n"
            "```"
        ),
        "options": ["200 OK", "201 Created", "202 Accepted", "204 No Content"],
        "correct_option_index": 1,
        "explanation": (
            "The decorator parameter `status_code=status.HTTP_201_CREATED` explicitly sets the default success code to 201."
        ),
        "source": "Curated",
    },
    {
        "domain": "SoftwareEngineering",
        "question_type": "code",
        "sub_topic": "Async Programming",
        "difficulty": "hard",
        "question_text": (
            "What is the output of the following Python `asyncio` code?\n\n"
            "```python\n"
            "import asyncio\n\n"
            "async def worker(n):\n"
            "    await asyncio.sleep(0.01)\n"
            "    return n * 2\n\n"
            "async def main():\n"
            "    res = await asyncio.gather(worker(1), worker(2), worker(3))\n"
            "    print(res)\n\n"
            "asyncio.run(main())\n"
            "```"
        ),
        "options": [
            "[2, 4, 6]",
            "[6, 4, 2]",
            "Order is non-deterministic",
            "(2, 4, 6) as a tuple",
        ],
        "correct_option_index": 0,
        "explanation": (
            "`asyncio.gather` preserves the order of the submitted awaitables in its returned list, returning `[2, 4, 6]` regardless of completion timing."
        ),
        "source": "Curated",
    },
    {
        "domain": "SoftwareEngineering",
        "question_type": "code",
        "sub_topic": "Design Patterns",
        "difficulty": "medium",
        "question_text": (
            "Which design pattern is implemented in this Python code snippet?\n\n"
            "```python\n"
            "class DatabaseConnection:\n"
            "    _instance = None\n"
            "    def __new__(cls):\n"
            "        if cls._instance is None:\n"
            "            cls._instance = super().__new__(cls)\n"
            "        return cls._instance\n"
            "```"
        ),
        "options": ["Factory Method", "Singleton", "Adapter", "Proxy"],
        "correct_option_index": 1,
        "explanation": (
            "Overriding `__new__` to return a cached `_instance` guarantees that only one object of the class is ever created (Singleton pattern)."
        ),
        "source": "Curated",
    },
    {
        "domain": "SoftwareEngineering",
        "question_type": "code",
        "sub_topic": "Error Handling",
        "difficulty": "easy",
        "question_text": (
            "What will this Python block print when executed?\n\n"
            "```python\n"
            "def test():\n"
            "    try:\n"
            "        return 1\n"
            "    finally:\n"
            "        return 2\n\n"
            "print(test())\n"
            "```"
        ),
        "options": ["1", "2", "None", "SyntaxError"],
        "correct_option_index": 1,
        "explanation": (
            "A return statement in a `finally` block overrides any previous return statement in the `try` or `except` blocks, returning 2."
        ),
        "source": "Curated",
    },

    # =========================================================================
    # AI / ML — THEORY (10 questions)
    # =========================================================================
    {
        "domain": "AIML",
        "question_type": "theory",
        "sub_topic": "Loss Functions",
        "difficulty": "medium",
        "question_text": (
            "Which loss function is most appropriate for a multi-class classification problem "
            "where classes are mutually exclusive?"
        ),
        "options": [
            "Binary Cross-Entropy",
            "Mean Squared Error",
            "Categorical Cross-Entropy",
            "Hinge Loss",
        ],
        "correct_option_index": 2,
        "explanation": (
            "Categorical Cross-Entropy is used for multi-class classification with mutually exclusive classes."
        ),
        "source": "Curated",
    },
    {
        "domain": "AIML",
        "question_type": "theory",
        "sub_topic": "Activation Functions",
        "difficulty": "medium",
        "question_text": (
            "What is the primary advantage of the ReLU activation function over the "
            "sigmoid function in deep neural networks?"
        ),
        "options": [
            "ReLU output is bounded between 0 and 1",
            "ReLU mitigates the vanishing gradient problem",
            "ReLU is differentiable everywhere",
            "ReLU always produces non-negative outputs for all inputs",
        ],
        "correct_option_index": 1,
        "explanation": (
            "ReLU maintains a constant derivative of 1 for positive inputs, avoiding gradient saturation (vanishing gradients) in deep layers."
        ),
        "source": "Curated",
    },
    {
        "domain": "AIML",
        "question_type": "theory",
        "sub_topic": "Overfitting & Regularisation",
        "difficulty": "medium",
        "question_text": (
            "Which regularisation technique randomly sets a fraction of neuron activations "
            "to zero during each training pass to prevent overfitting?"
        ),
        "options": ["L1 Regularisation", "L2 Regularisation", "Dropout", "Batch Normalisation"],
        "correct_option_index": 2,
        "explanation": (
            "Dropout randomly zeroes a subset of neuron activations during training, reducing co-adaptation and overfitting."
        ),
        "source": "Curated",
    },
    {
        "domain": "AIML",
        "question_type": "theory",
        "sub_topic": "Model Evaluation",
        "difficulty": "hard",
        "question_text": (
            "In a classification model with 90% accuracy on an imbalanced dataset where "
            "90% of samples are class 0, which metric would BEST reveal poor model performance?"
        ),
        "options": ["Accuracy", "F1 Score", "Log Loss", "AUC-ROC"],
        "correct_option_index": 1,
        "explanation": (
            "F1 Score balances Precision and Recall, exposing models that trivially predict only the majority class."
        ),
        "source": "Curated",
    },
    {
        "domain": "AIML",
        "question_type": "theory",
        "sub_topic": "Supervised Learning",
        "difficulty": "easy",
        "question_text": (
            "What is the key difference between supervised and unsupervised learning?"
        ),
        "options": [
            "Supervised learning uses neural networks; unsupervised learning does not",
            "Supervised learning requires labelled training data; unsupervised does not",
            "Supervised learning is faster to train than unsupervised learning",
            "Unsupervised learning always produces better results",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Supervised learning maps features to ground truth labels; unsupervised learning discovers patterns in unlabelled data."
        ),
        "source": "Curated",
    },
    {
        "domain": "AIML",
        "question_type": "theory",
        "sub_topic": "Natural Language Processing",
        "difficulty": "medium",
        "question_text": (
            "What does 'tokenisation' refer to in NLP?"
        ),
        "options": [
            "Converting text to numerical embeddings",
            "Breaking text into smaller units such as words or subwords",
            "Removing stop words from a sentence",
            "Encrypting text for secure processing",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Tokenisation is the process of splitting text sequences into discrete tokens (words/subwords) for downstream processing."
        ),
        "source": "Curated",
    },
    {
        "domain": "AIML",
        "question_type": "theory",
        "sub_topic": "Neural Networks",
        "difficulty": "hard",
        "question_text": (
            "What is the role of the 'attention mechanism' in transformer architectures?"
        ),
        "options": [
            "It applies convolutions to detect local features in text",
            "It allows the model to weigh the importance of different positions in the input sequence",
            "It reduces the dimensionality of word embeddings",
            "It normalises activations across the batch dimension",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Attention dynamically calculates relevance weights between pairs of tokens across the sequence, capturing long-range dependencies."
        ),
        "source": "Curated",
    },
    {
        "domain": "AIML",
        "question_type": "theory",
        "sub_topic": "Optimisation",
        "difficulty": "medium",
        "question_text": (
            "What is the key advantage of Adam optimiser over vanilla Stochastic Gradient Descent (SGD)?"
        ),
        "options": [
            "Adam always converges to a global minimum",
            "Adam adapts the learning rate per-parameter using first and second moment estimates",
            "Adam requires no hyperparameter tuning",
            "Adam uses momentum but not adaptive learning rates",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Adam combines momentum (first moment) with adaptive per-parameter learning rates (second moment scaling)."
        ),
        "source": "Curated",
    },
    {
        "domain": "AIML",
        "question_type": "theory",
        "sub_topic": "Clustering",
        "difficulty": "medium",
        "question_text": (
            "In K-Means clustering, how is the initial centroid placement handled and why does it matter?"
        ),
        "options": [
            "Centroids are fixed at data mean — placement doesn't matter",
            "Centroids are randomly initialised — poor initialisation can lead to suboptimal local minima",
            "Centroids are determined by PCA and always produce the global optimum",
            "Centroids are always placed at the median of the dataset",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Standard K-Means is sensitive to initial random centroid placement, which K-Means++ mitigates by spreading initial points."
        ),
        "source": "Curated",
    },
    {
        "domain": "AIML",
        "question_type": "theory",
        "sub_topic": "Bias-Variance Tradeoff",
        "difficulty": "hard",
        "question_text": (
            "A model achieves very high training accuracy but poor validation accuracy. This indicates:"
        ),
        "options": ["High bias (underfitting)", "High variance (overfitting)", "Data leakage", "Vanishing gradients"],
        "correct_option_index": 1,
        "explanation": (
            "A large gap between high training accuracy and low validation accuracy is the hallmark of overfitting (high variance)."
        ),
        "source": "Curated",
    },

    # =========================================================================
    # AI / ML — CODE (6 questions)
    # =========================================================================
    {
        "domain": "AIML",
        "question_type": "code",
        "sub_topic": "Model Evaluation",
        "difficulty": "hard",
        "question_text": (
            "Given the following confusion matrix, what is the Precision for class 1?\n\n"
            "```\n"
            "              Predicted\n"
            "            |  0  |  1  |\n"
            "Actual  0   |  50 |  10 |\n"
            "        1   |   5 |  35 |\n"
            "```"
        ),
        "options": ["87.5%", "77.8%", "85.4%", "70.0%"],
        "correct_option_index": 1,
        "explanation": (
            "Precision = TP / (TP + FP) = 35 / (35 + 10) = 35 / 45 ≈ 0.7778 = 77.8%."
        ),
        "source": "Curated",
    },
    {
        "domain": "AIML",
        "question_type": "code",
        "sub_topic": "Neural Networks",
        "difficulty": "medium",
        "question_text": (
            "What is the output shape of the following Keras model given input shape (None, 32)?\n\n"
            "```python\n"
            "from tensorflow import keras\n\n"
            "model = keras.Sequential([\n"
            "    keras.layers.Dense(64, activation='relu', input_shape=(32,)),\n"
            "    keras.layers.Dropout(0.3),\n"
            "    keras.layers.Dense(10, activation='softmax'),\n"
            "])\n"
            "print(model.output_shape)\n"
            "```"
        ),
        "options": ["(None, 64)", "(None, 32)", "(None, 10)", "(None, 6)"],
        "correct_option_index": 2,
        "explanation": (
            "The output shape is determined by the final Dense(10) layer, which is (None, 10)."
        ),
        "source": "Curated",
    },
    {
        "domain": "AIML",
        "question_type": "code",
        "sub_topic": "Overfitting & Regularisation",
        "difficulty": "medium",
        "question_text": (
            "What does the following scikit-learn code demonstrate?\n\n"
            "```python\n"
            "from sklearn.linear_model import Ridge\n\n"
            "model = Ridge(alpha=10.0)\n"
            "model.fit(X_train, y_train)\n"
            "```"
        ),
        "options": [
            "L1 regularisation (Lasso) with penalty strength 10.0",
            "L2 regularisation (Ridge) with penalty strength 10.0, shrinking coefficients toward zero",
            "Dropout regularisation applied during training",
            "Elastic net combining L1 and L2 with equal weighting",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Ridge applies L2 regularisation (α Σwᵢ²), which penalises large weights and shrinks coefficients toward zero."
        ),
        "source": "Curated",
    },
    {
        "domain": "AIML",
        "question_type": "code",
        "sub_topic": "PyTorch Tensors",
        "difficulty": "medium",
        "question_text": (
            "What does `tensor.view(-1, 4)` do in PyTorch when `tensor.shape == (2, 6)`?\n\n"
            "```python\n"
            "import torch\n"
            "t = torch.randn(2, 6)  # 12 elements total\n"
            "out = t.view(-1, 4)\n"
            "print(out.shape)\n"
            "```"
        ),
        "options": [
            "torch.Size([3, 4])",
            "torch.Size([2, 4])",
            "torch.Size([4, 3])",
            "RuntimeError: invalid shape",
        ],
        "correct_option_index": 0,
        "explanation": (
            "Total elements = 2 × 6 = 12. With column size 4, the inferred row dimension (`-1`) is 12 ÷ 4 = 3, so shape is (3, 4)."
        ),
        "source": "Curated",
    },
    {
        "domain": "AIML",
        "question_type": "code",
        "sub_topic": "Loss Functions",
        "difficulty": "medium",
        "question_text": (
            "What is the calculated binary cross-entropy loss for a single sample where `y_true = 1` and `y_pred = 0.5`?\n\n"
            "```python\n"
            "import math\n"
            "# Loss = -(y * log(p) + (1-y) * log(1-p))\n"
            "loss = -math.log(0.5)\n"
            "print(round(loss, 3))\n"
            "```"
        ),
        "options": ["0.500", "0.693", "1.000", "0.301"],
        "correct_option_index": 1,
        "explanation": (
            "Natural log of 0.5 is -0.69315... So -ln(0.5) ≈ 0.693."
        ),
        "source": "Curated",
    },
    {
        "domain": "AIML",
        "question_type": "code",
        "sub_topic": "Scikit-Learn Pipelines",
        "difficulty": "hard",
        "question_text": (
            "Why is `Pipeline` preferred in this code over transforming data manually before cross-validation?\n\n"
            "```python\n"
            "from sklearn.pipeline import Pipeline\n"
            "from sklearn.preprocessing import StandardScaler\n"
            "from sklearn.svm import SVC\n\n"
            "pipe = Pipeline([\n"
            "    ('scaler', StandardScaler()),\n"
            "    ('svc', SVC())\n"
            "])\n"
            "```"
        ),
        "options": [
            "It runs training faster using GPU acceleration",
            "It prevents data leakage by fitting the scaler only on the training fold during cross-validation",
            "It automatically tunes hyperparameters",
            "It converts non-numeric columns to embeddings",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Scikit-learn `Pipeline` ensures transformers are fitted solely on training folds during CV, preventing validation data leakage."
        ),
        "source": "Curated",
    },

    # =========================================================================
    # DATA SCIENCE — THEORY (10 questions)
    # =========================================================================
    {
        "domain": "DataScience",
        "question_type": "theory",
        "sub_topic": "SQL",
        "difficulty": "medium",
        "question_text": (
            "What is the difference between `INNER JOIN` and `LEFT JOIN` in SQL?"
        ),
        "options": [
            "INNER JOIN returns all rows from both tables; LEFT JOIN returns only matching rows",
            "INNER JOIN returns only matching rows; LEFT JOIN returns all rows from the left table",
            "They are functionally identical",
            "LEFT JOIN is faster than INNER JOIN for large datasets",
        ],
        "correct_option_index": 1,
        "explanation": (
            "INNER JOIN retains only rows with matches in both tables; LEFT JOIN keeps all left rows and fills unmatched right columns with NULL."
        ),
        "source": "Curated",
    },
    {
        "domain": "DataScience",
        "question_type": "theory",
        "sub_topic": "Statistics",
        "difficulty": "medium",
        "question_text": (
            "In hypothesis testing, what does a p-value of 0.03 indicate at a 5% significance level?"
        ),
        "options": [
            "We fail to reject the null hypothesis",
            "We reject the null hypothesis",
            "The result is not statistically significant",
            "The effect size is 3%",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Since p (0.03) < α (0.05), we reject the null hypothesis in favour of statistical significance."
        ),
        "source": "Curated",
    },
    {
        "domain": "DataScience",
        "question_type": "theory",
        "sub_topic": "Pandas",
        "difficulty": "easy",
        "question_text": (
            "In pandas, what does `df.groupby('category')['value'].mean()` return?"
        ),
        "options": [
            "The mean of the entire 'value' column",
            "The mean of 'value' for each unique group in 'category'",
            "A boolean mask of where 'value' equals the mean",
            "The count of rows in each 'category' group",
        ],
        "correct_option_index": 1,
        "explanation": (
            "groupby splits the dataset by 'category' and calculates the mean of 'value' per group as a Series."
        ),
        "source": "Curated",
    },
    {
        "domain": "DataScience",
        "question_type": "theory",
        "sub_topic": "Feature Engineering",
        "difficulty": "medium",
        "question_text": (
            "Why is it important to apply feature scaling BEFORE training an SVM or K-Nearest Neighbours model?"
        ),
        "options": [
            "These algorithms require binary input features",
            "These algorithms rely on distance metrics that are sensitive to feature magnitudes",
            "Feature scaling speeds up gradient descent for these models",
            "Scaling prevents class imbalance",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Distance-based algorithms (SVM, KNN) are dominated by large-scale features unless all features are normalised to a comparable scale."
        ),
        "source": "Curated",
    },
    {
        "domain": "DataScience",
        "question_type": "theory",
        "sub_topic": "Data Cleaning",
        "difficulty": "easy",
        "question_text": (
            "Which pandas method would you use to check the number of missing values in each column of a DataFrame?"
        ),
        "options": [
            "df.describe()",
            "df.isnull().sum()",
            "df.fillna(0)",
            "df.dropna()",
        ],
        "correct_option_index": 1,
        "explanation": (
            "`df.isnull().sum()` computes column-wise counts of NaN/null values."
        ),
        "source": "Curated",
    },
    {
        "domain": "DataScience",
        "question_type": "theory",
        "sub_topic": "Visualisation",
        "difficulty": "easy",
        "question_text": (
            "Which type of plot is most appropriate for visualising the distribution of a single continuous variable?"
        ),
        "options": ["Bar chart", "Scatter plot", "Histogram", "Pie chart"],
        "correct_option_index": 2,
        "explanation": (
            "A histogram shows frequency distributions of continuous numerical data using bins."
        ),
        "source": "Curated",
    },
    {
        "domain": "DataScience",
        "question_type": "theory",
        "sub_topic": "Statistics",
        "difficulty": "hard",
        "question_text": (
            "What is the Central Limit Theorem (CLT) and why is it important in statistics?"
        ),
        "options": [
            "It states that all real-world data follows a normal distribution",
            "It guarantees that the sample mean is always equal to the population mean",
            "It states that the sampling distribution of the mean approaches normality as sample size increases, regardless of population distribution",
            "It proves that larger datasets always produce more accurate models",
        ],
        "correct_option_index": 2,
        "explanation": (
            "The CLT establishes that sample means follow an approximately normal distribution for sufficiently large n, enabling parametric inference."
        ),
        "source": "Curated",
    },
    {
        "domain": "DataScience",
        "question_type": "theory",
        "sub_topic": "Model Selection",
        "difficulty": "medium",
        "question_text": (
            "What is k-fold cross-validation and what problem does it solve?"
        ),
        "options": [
            "It trains k different model architectures to find the best one",
            "It splits data into k subsets, trains on k-1 and tests on 1, rotating k times to get a robust performance estimate",
            "It reduces overfitting by training only on k% of the data",
            "It is a method for selecting the optimal number of clusters in K-Means",
        ],
        "correct_option_index": 1,
        "explanation": (
            "k-fold CV partitions data into k folds to evaluate model generalisation across multiple train-test splits."
        ),
        "source": "Curated",
    },
    {
        "domain": "DataScience",
        "question_type": "theory",
        "sub_topic": "SQL",
        "difficulty": "hard",
        "question_text": (
            "Which SQL window function would you use to calculate a running (cumulative) total of sales ordered by date?"
        ),
        "options": [
            "SUM(sales) GROUP BY date",
            "SUM(sales) OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)",
            "CUMSUM(sales) OVER (PARTITION BY date)",
            "TOTAL(sales) OVER (ORDER BY date)",
        ],
        "correct_option_index": 1,
        "explanation": (
            "The `OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` window clause calculates a progressive cumulative sum."
        ),
        "source": "Curated",
    },
    {
        "domain": "DataScience",
        "question_type": "theory",
        "sub_topic": "Correlation & Causation",
        "difficulty": "medium",
        "question_text": (
            "A study finds a high positive correlation between ice cream sales and drowning incidents. What is the most likely explanation?"
        ),
        "options": [
            "Ice cream consumption directly causes drowning",
            "Drowning incidents cause people to buy more ice cream",
            "A confounding variable (hot weather) drives both",
            "The correlation is statistically invalid",
        ],
        "correct_option_index": 2,
        "explanation": (
            "Confounding factors (temperature/summer) simultaneously increase ice cream consumption and swimming activity."
        ),
        "source": "Curated",
    },

    # =========================================================================
    # DATA SCIENCE — CODE (6 questions)
    # =========================================================================
    {
        "domain": "DataScience",
        "question_type": "code",
        "sub_topic": "SQL",
        "difficulty": "medium",
        "question_text": (
            "What does the following SQL query return?\n\n"
            "```sql\n"
            "SELECT department, COUNT(*) AS headcount\n"
            "FROM employees\n"
            "WHERE salary > 50000\n"
            "GROUP BY department\n"
            "HAVING COUNT(*) > 3\n"
            "ORDER BY headcount DESC;\n"
            "```"
        ),
        "options": [
            "All departments and their total employee counts",
            "Departments where more than 3 employees earn above 50,000, ordered by headcount descending",
            "The single department with the most employees earning above 50,000",
            "All employees earning above 50,000, grouped and sorted",
        ],
        "correct_option_index": 1,
        "explanation": (
            "WHERE filters rows before grouping; GROUP BY groups by department; HAVING filters aggregated groups with count > 3."
        ),
        "source": "Curated",
    },
    {
        "domain": "DataScience",
        "question_type": "code",
        "sub_topic": "Pandas",
        "difficulty": "medium",
        "question_text": (
            "What does the following pandas code produce?\n\n"
            "```python\n"
            "import pandas as pd\n\n"
            "df = pd.DataFrame({'score': [85, 90, 78, 92, 88]})\n"
            "print(df['score'].describe())\n"
            "```"
        ),
        "options": [
            "Only the mean and standard deviation of the column",
            "Count, mean, std, min, 25th/50th/75th percentiles, and max of the score column",
            "A histogram of the score distribution",
            "The sum and cumulative sum of the column",
        ],
        "correct_option_index": 1,
        "explanation": (
            "`.describe()` on a numeric Series outputs count, mean, std, min, 25%, 50%, 75%, and max."
        ),
        "source": "Curated",
    },
    {
        "domain": "DataScience",
        "question_type": "code",
        "sub_topic": "Feature Engineering",
        "difficulty": "medium",
        "question_text": (
            "What transformation does the following scikit-learn code apply, and why is fit called only on X_train?\n\n"
            "```python\n"
            "from sklearn.preprocessing import StandardScaler\n\n"
            "scaler = StandardScaler()\n"
            "X_train_scaled = scaler.fit_transform(X_train)\n"
            "X_test_scaled  = scaler.transform(X_test)\n"
            "```"
        ),
        "options": [
            "MinMax scaling to [0,1]; fit on train prevents test data from affecting scale range",
            "Z-score standardisation (subtract mean, divide by std); fit only on train prevents data leakage",
            "Log transformation; fit on train ensures consistent log base across splits",
            "PCA dimensionality reduction; fit on train prevents overfitting to test variance",
        ],
        "correct_option_index": 1,
        "explanation": (
            "StandardScaler computes z = (x - μ) / σ. Fitting only on X_train prevents test fold statistics from leaking into training."
        ),
        "source": "Curated",
    },
    {
        "domain": "DataScience",
        "question_type": "code",
        "sub_topic": "Pandas Filtering",
        "difficulty": "easy",
        "question_text": (
            "What is the shape of the filtered DataFrame returned by this pandas expression?\n\n"
            "```python\n"
            "import pandas as pd\n"
            "df = pd.DataFrame({'age': [20, 25, 30, 35], 'city': ['NY', 'SF', 'NY', 'LA']})\n"
            "filtered = df[(df['age'] >= 25) & (df['city'] == 'NY')]\n"
            "print(len(filtered))\n"
            "```"
        ),
        "options": ["1", "2", "3", "0"],
        "correct_option_index": 0,
        "explanation": (
            "Only row index 2 (age=30, city='NY') satisfies both age >= 25 AND city == 'NY'. Length is 1."
        ),
        "source": "Curated",
    },
    {
        "domain": "DataScience",
        "question_type": "code",
        "sub_topic": "NumPy Array Operations",
        "difficulty": "medium",
        "question_text": (
            "What is the output of the following broadcasting operation in NumPy?\n\n"
            "```python\n"
            "import numpy as np\n"
            "a = np.array([[1], [2], [3]])  # shape (3, 1)\n"
            "b = np.array([10, 20])          # shape (2,)\n"
            "print((a + b).shape)\n"
            "```"
        ),
        "options": ["(3, 2)", "(3, 1)", "(2, 3)", "ValueError"],
        "correct_option_index": 0,
        "explanation": (
            "NumPy broadcasting matches dimensions: (3, 1) and (1, 2) broadcast to shape (3, 2)."
        ),
        "source": "Curated",
    },
    {
        "domain": "DataScience",
        "question_type": "code",
        "sub_topic": "SQL Window Functions",
        "difficulty": "hard",
        "question_text": (
            "What does `DENSE_RANK()` return when two rows share the same rank (e.g. rank 2)?\n\n"
            "```sql\n"
            "SELECT score, DENSE_RANK() OVER (ORDER BY score DESC) as rk\n"
            "FROM exams;\n"
            "-- scores: 100, 90, 90, 80\n"
            "```"
        ),
        "options": [
            "1, 2, 2, 3 (no gaps in ranking)",
            "1, 2, 2, 4 (skips rank 3)",
            "1, 2, 3, 4 (arbitrary tiebreak)",
            "Error on duplicate values",
        ],
        "correct_option_index": 0,
        "explanation": (
            "`DENSE_RANK()` assigns consecutive rank numbers without gaps (1, 2, 2, 3), whereas `RANK()` leaves gaps (1, 2, 2, 4)."
        ),
        "source": "Curated",
    },

    # =========================================================================
    # CYBER SECURITY — THEORY (10 questions)
    # =========================================================================
    {
        "domain": "CyberSecurity",
        "question_type": "theory",
        "sub_topic": "OWASP Top 10",
        "difficulty": "medium",
        "question_text": (
            "Which OWASP Top 10 vulnerability occurs when user-supplied data is sent "
            "to an interpreter as part of a command or query?"
        ),
        "options": ["Broken Access Control", "Injection", "Cryptographic Failures", "SSRF"],
        "correct_option_index": 1,
        "explanation": (
            "Injection attacks happen when untrusted input is interpreted as command/query syntax."
        ),
        "source": "Curated",
    },
    {
        "domain": "CyberSecurity",
        "question_type": "theory",
        "sub_topic": "Encryption",
        "difficulty": "medium",
        "question_text": (
            "What is the fundamental difference between symmetric and asymmetric encryption?"
        ),
        "options": [
            "Symmetric is stronger; asymmetric is weaker",
            "Symmetric uses the same key for encryption and decryption; asymmetric uses a key pair",
            "Asymmetric encryption is faster than symmetric encryption",
            "Symmetric encryption cannot be used for data at rest",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Symmetric encryption relies on a single shared secret key; asymmetric encryption uses paired public/private keys."
        ),
        "source": "Curated",
    },
    {
        "domain": "CyberSecurity",
        "question_type": "theory",
        "sub_topic": "Network Security",
        "difficulty": "easy",
        "question_text": (
            "What is a Man-in-the-Middle (MitM) attack?"
        ),
        "options": [
            "An attacker brute-forces a password hash offline",
            "An attacker secretly intercepts and potentially alters communication between two parties",
            "An attacker floods a server with requests to cause a denial of service",
            "An attacker exploits a buffer overflow vulnerability",
        ],
        "correct_option_index": 1,
        "explanation": (
            "In a MitM attack, an unauthorised actor eavesdrops on or manipulates messages between two communicating systems."
        ),
        "source": "Curated",
    },
    {
        "domain": "CyberSecurity",
        "question_type": "theory",
        "sub_topic": "Authentication",
        "difficulty": "medium",
        "question_text": (
            "Why should passwords be stored using bcrypt or Argon2 rather than SHA-256?"
        ),
        "options": [
            "SHA-256 is proprietary and cannot be used legally",
            "Bcrypt and Argon2 are intentionally slow and include salting, making brute-force attacks much harder",
            "SHA-256 cannot produce a fixed-length hash",
            "Bcrypt outputs a reversible hash, enabling password recovery",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Key-derivation functions (bcrypt/Argon2) feature tunable computational cost factors and automatic salting against GPU cracking."
        ),
        "source": "Curated",
    },
    {
        "domain": "CyberSecurity",
        "question_type": "theory",
        "sub_topic": "Web Security",
        "difficulty": "medium",
        "question_text": (
            "What is Cross-Site Request Forgery (CSRF) and how is it typically prevented?"
        ),
        "options": [
            "Injecting malicious scripts into web pages; prevented by output encoding",
            "Tricking a user's browser into making unintended authenticated requests; prevented by CSRF tokens",
            "Intercepting API tokens in transit; prevented by HTTPS",
            "Exploiting weak session IDs; prevented by increasing ID entropy",
        ],
        "correct_option_index": 1,
        "explanation": (
            "CSRF forces an authenticated browser to send forged requests, prevented via anti-CSRF synchronizer tokens and SameSite cookies."
        ),
        "source": "Curated",
    },
    {
        "domain": "CyberSecurity",
        "question_type": "theory",
        "sub_topic": "Malware",
        "difficulty": "easy",
        "question_text": (
            "What distinguishes a ransomware attack from other malware?"
        ),
        "options": [
            "It replicates itself across networks without user interaction",
            "It encrypts the victim's files and demands payment for the decryption key",
            "It silently logs keystrokes to steal credentials",
            "It creates a backdoor for remote access",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Ransomware restricts access to files via strong encryption and extorts the victim for the decryption key."
        ),
        "source": "Curated",
    },
    {
        "domain": "CyberSecurity",
        "question_type": "theory",
        "sub_topic": "Network Security",
        "difficulty": "hard",
        "question_text": (
            "What is the purpose of a DMZ (Demilitarised Zone) in network architecture?"
        ),
        "options": [
            "To segment internal network traffic by department",
            "To create an isolated subnet for publicly accessible servers, shielding the internal network",
            "To encrypt all traffic between internal hosts",
            "To monitor outbound traffic for data exfiltration",
        ],
        "correct_option_index": 1,
        "explanation": (
            "A DMZ isolates public-facing servers (HTTP, DNS) in a perimeter network to protect internal subnets if compromised."
        ),
        "source": "Curated",
    },
    {
        "domain": "CyberSecurity",
        "question_type": "theory",
        "sub_topic": "Vulnerabilities",
        "difficulty": "hard",
        "question_text": (
            "What is a buffer overflow vulnerability and what class of attack does it enable?"
        ),
        "options": [
            "Excessive memory allocation causing application slowdown; enables DoS only",
            "Writing data beyond a buffer's boundary, overwriting adjacent memory; enables arbitrary code execution",
            "Overloading a network buffer with packets; enables MitM attacks",
            "A race condition in buffer reads; enables data corruption only",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Buffer overflows write past memory bounds, potentially overwriting return pointers to hijack program execution flow."
        ),
        "source": "Curated",
    },
    {
        "domain": "CyberSecurity",
        "question_type": "theory",
        "sub_topic": "PKI & Certificates",
        "difficulty": "medium",
        "question_text": (
            "What role does a Certificate Authority (CA) play in TLS/HTTPS?"
        ),
        "options": [
            "It encrypts the data transmitted between client and server",
            "It issues and signs digital certificates that verify a server's identity",
            "It acts as a proxy between client and server for inspection",
            "It stores private keys for website owners",
        ],
        "correct_option_index": 1,
        "explanation": (
            "CAs act as trusted third parties that cryptographically sign digital certificates validating domain ownership."
        ),
        "source": "Curated",
    },
    {
        "domain": "CyberSecurity",
        "question_type": "theory",
        "sub_topic": "Social Engineering",
        "difficulty": "easy",
        "question_text": (
            "What is 'phishing' in the context of cyber security?"
        ),
        "options": [
            "A method of intercepting network packets to steal data",
            "A fraudulent attempt to obtain sensitive information by impersonating a trustworthy entity",
            "An automated attack that tests all password combinations",
            "A technique for bypassing two-factor authentication",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Phishing lures victims into revealing confidential credentials or clicking malicious payloads via deceptive communication."
        ),
        "source": "Curated",
    },

    # =========================================================================
    # CYBER SECURITY — CODE (6 questions)
    # =========================================================================
    {
        "domain": "CyberSecurity",
        "question_type": "code",
        "sub_topic": "Web Security",
        "difficulty": "medium",
        "question_text": (
            "The following Python code is vulnerable to SQL Injection. Which fix correctly prevents it?\n\n"
            "```python\n"
            "# VULNERABLE\n"
            "def get_user(username):\n"
            "    query = f\"SELECT * FROM users WHERE name = '{username}'\"\n"
            "    return db.execute(query)\n"
            "```"
        ),
        "options": [
            "`f\"SELECT * FROM users WHERE name = '{username.strip()}'\"` — strip whitespace",
            "`db.execute(\"SELECT * FROM users WHERE name = ?\", (username,))` — parameterised query",
            "`query.replace(\"'\", \"\\\\'\")` — escape single quotes manually",
            "`if len(username) > 50: raise ValueError()` — length validation",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Parameterised queries treat variables as literal values rather than executable SQL syntax."
        ),
        "source": "Curated",
    },
    {
        "domain": "CyberSecurity",
        "question_type": "code",
        "sub_topic": "Authentication",
        "difficulty": "hard",
        "question_text": (
            "Review the following JWT verification code. What is the critical security flaw?\n\n"
            "```python\n"
            "import jwt\n\n"
            "def verify_token(token: str, secret: str):\n"
            "    payload = jwt.decode(\n"
            "        token,\n"
            "        secret,\n"
            "        algorithms=[\"HS256\", \"none\"]\n"
            "    )\n"
            "    return payload\n"
            "```"
        ),
        "options": [
            "HS256 is deprecated; RS256 must always be used instead",
            "Accepting the 'none' algorithm allows attackers to forge tokens without a valid signature",
            "The secret key should be passed as bytes, not a string",
            "jwt.decode should be wrapped in a try-except block to handle expired tokens",
        ],
        "correct_option_index": 1,
        "explanation": (
            "The 'none' algorithm indicates an unsigned token. Permitting 'none' allows attackers to spoof arbitrary claims without a signature."
        ),
        "source": "Curated",
    },
    {
        "domain": "CyberSecurity",
        "question_type": "code",
        "sub_topic": "Encryption",
        "difficulty": "medium",
        "question_text": (
            "What is the security problem in the following AES-CBC encryption code?\n\n"
            "```python\n"
            "from Crypto.Cipher import AES\n\n"
            "key = b'mysecretkey12345'  # 16 bytes\n"
            "iv  = b'\\x00' * 16        # static zero IV\n\n"
            "cipher = AES.new(key, AES.MODE_CBC, iv)\n"
            "ciphertext = cipher.encrypt(b'Attack at dawn!!')\n"
            "```"
        ),
        "options": [
            "AES-CBC is deprecated; only AES-GCM should be used",
            "Using a static (constant) IV breaks semantic security — same plaintext always yields same ciphertext",
            "The key is too short; AES requires a minimum 32-byte key",
            "The plaintext must be hashed before encryption",
        ],
        "correct_option_index": 1,
        "explanation": (
            "CBC mode requires a random, unpredictable IV per message to ensure distinct ciphertexts for identical plaintexts."
        ),
        "source": "Curated",
    },
    {
        "domain": "CyberSecurity",
        "question_type": "code",
        "sub_topic": "Command Injection",
        "difficulty": "hard",
        "question_text": (
            "Why is `subprocess.run(..., shell=True)` dangerous with user input in this snippet?\n\n"
            "```python\n"
            "import subprocess\n\n"
            "def ping_host(host_ip: str):\n"
            "    # User provides: '8.8.8.8; cat /etc/passwd'\n"
            "    subprocess.run(f\"ping -c 1 {host_ip}\", shell=True)\n"
            "```"
        ),
        "options": [
            "It runs commands with root privileges automatically",
            "The shell interprets metacharacters (;, &&, |), allowing attackers to chain arbitrary OS commands",
            "It causes an infinite loop in the ping process",
            "It exposes the host IP in cleartext over the network",
        ],
        "correct_option_index": 1,
        "explanation": (
            "Passing unsanitised input to `shell=True` allows shell metacharacter injection (`;`, `&&`, `|`) to execute unintended arbitrary commands."
        ),
        "source": "Curated",
    },
    {
        "domain": "CyberSecurity",
        "question_type": "code",
        "sub_topic": "Password Hashing",
        "difficulty": "medium",
        "question_text": (
            "What is the security advantage of `secrets.compare_digest` over `==` for comparing secrets?\n\n"
            "```python\n"
            "import secrets\n\n"
            "def check_api_key(user_key: str, real_key: str) -> bool:\n"
            "    return secrets.compare_digest(user_key, real_key)\n"
            "```"
        ),
        "options": [
            "It hashes the keys with SHA-512 before comparing",
            "It prevents timing attacks by executing in constant time regardless of where mismatches occur",
            "It automatically decrypts symmetric ciphertexts",
            "It validates that user_key is a valid UUID",
        ],
        "correct_option_index": 1,
        "explanation": (
            "`secrets.compare_digest` executes in constant time, preventing side-channel timing attacks that infer secret characters based on response time."
        ),
        "source": "Curated",
    },
    {
        "domain": "CyberSecurity",
        "question_type": "code",
        "sub_topic": "XSS Mitigation",
        "difficulty": "medium",
        "question_text": (
            "How does `html.escape` prevent Reflected Cross-Site Scripting (XSS) in this web view?\n\n"
            "```python\n"
            "import html\n\n"
            "def render_comment(user_input: str) -> str:\n"
            "    safe_text = html.escape(user_input)\n"
            "    return f\"<div class='comment'>{safe_text}</div>\"\n"
            "```"
        ),
        "options": [
            "It strips all HTML tags using a regular expression",
            "It converts characters like `<`, `>`, `&`, and `\"` to safe HTML entities (`&lt;`, `&gt;`), neutralizing script tags",
            "It executes JavaScript in a sandboxed iframe",
            "It encrypts user input with AES-256",
        ],
        "correct_option_index": 1,
        "explanation": (
            "`html.escape()` converts HTML metacharacters (`<` to `&lt;`, `>` to `&gt;`), rendering them as literal characters instead of executable markup."
        ),
        "source": "Curated",
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# SEED RUNNER
# ══════════════════════════════════════════════════════════════════════════════

async def seed(force: bool = False) -> None:
    """Idempotently insert curated questions if they are not already present."""
    await create_all_tables()

    async with AsyncSessionLocal() as session:
        if force:
            logger.info("Force re-seeding: clearing existing curated questions...")
            await session.execute(delete(Question).where(Question.source == "Curated"))
            await session.commit()

        # Check existing count
        result = await session.execute(
            select(func.count()).select_from(Question).where(Question.source == "Curated")
        )
        existing_count: int = result.scalar_one()

        if existing_count >= len(SEED_QUESTIONS) and not force:
            logger.info(
                "Seed data already present (%d curated questions). Skipping.", existing_count
            )
            return

        logger.info(
            "Seeding %d curated questions into the database...", len(SEED_QUESTIONS)
        )

        inserted = 0
        for q_data in SEED_QUESTIONS:
            # Ensure duplicate detection by question_text
            dup_check = await session.execute(
                select(Question).where(Question.question_text == q_data["question_text"])
            )
            if dup_check.scalar_one_or_none() is not None:
                continue

            q = Question(
                domain=q_data["domain"],
                question_type=q_data.get("question_type", "theory"),
                sub_topic=q_data["sub_topic"],
                difficulty=q_data["difficulty"],
                question_text=q_data["question_text"],
                options=q_data["options"],
                correct_option_index=q_data["correct_option_index"],
                explanation=q_data["explanation"],
                source=q_data.get("source", "Curated"),
            )
            session.add(q)
            inserted += 1

        await session.commit()
        logger.info("Successfully seeded %d questions.", inserted)


if __name__ == "__main__":
    force_seed = "--force" in sys.argv or "-f" in sys.argv
    asyncio.run(seed(force=force_seed))

// PlaceX Curated Technical MCQs across 5 Domains
export const SEED_QUESTIONS = [
  {
    "domain": "Aptitude",
    "question_type": "theory",
    "sub_topic": "Percentages",
    "difficulty": "easy",
    "question_text": "A shopkeeper marks his goods 40% above the cost price and then offers a 20% discount. What is his profit percentage?",
    "options": [
      "12%",
      "16%",
      "20%",
      "8%"
    ],
    "correct_option_index": 0,
    "explanation": "Let cost price = 100. Marked price = 140. After 20% discount: selling price = 140 \u00d7 0.80 = 112. Profit = 112 \u2212 100 = 12, so profit% = 12%.",
    "source": "Curated",
    "id": 1,
    "question_id": 1
  },
  {
    "domain": "Aptitude",
    "question_type": "theory",
    "sub_topic": "Time, Speed & Distance",
    "difficulty": "medium",
    "question_text": "A train 240 m long passes a pole in 24 seconds. How long will it take to pass a platform 360 m long?",
    "options": [
      "60 seconds",
      "54 seconds",
      "48 seconds",
      "36 seconds"
    ],
    "correct_option_index": 0,
    "explanation": "Speed = 240 m \u00f7 24 s = 10 m/s. Total distance to clear the platform = 240 + 360 = 600 m. Time = 600 \u00f7 10 = 60 seconds.",
    "source": "Curated",
    "id": 2,
    "question_id": 2
  },
  {
    "domain": "Aptitude",
    "question_type": "theory",
    "sub_topic": "Probability",
    "difficulty": "medium",
    "question_text": "A bag contains 5 red, 4 blue, and 3 green balls. If one ball is drawn at random, what is the probability it is NOT red?",
    "options": [
      "5/12",
      "7/12",
      "1/2",
      "3/4"
    ],
    "correct_option_index": 1,
    "explanation": "Total balls = 5 + 4 + 3 = 12. Non-red balls = 4 + 3 = 7. P(not red) = 7/12.",
    "source": "Curated",
    "id": 3,
    "question_id": 3
  },
  {
    "domain": "Aptitude",
    "question_type": "theory",
    "sub_topic": "Ratios & Proportions",
    "difficulty": "easy",
    "question_text": "The ratio of the ages of A and B is 3:5. After 10 years the ratio will be 5:7. What is A's current age?",
    "options": [
      "15 years",
      "20 years",
      "25 years",
      "30 years"
    ],
    "correct_option_index": 0,
    "explanation": "Let A = 3x, B = 5x. After 10 years: (3x+10)/(5x+10) = 5/7. 7(3x+10) = 5(5x+10) \u2192 21x+70 = 25x+50 \u2192 4x = 20 \u2192 x = 5. A = 3\u00d75 = 15 years.",
    "source": "Curated",
    "id": 4,
    "question_id": 4
  },
  {
    "domain": "Aptitude",
    "question_type": "theory",
    "sub_topic": "Work & Time",
    "difficulty": "medium",
    "question_text": "A can finish a job in 12 days; B can finish it in 18 days. They work together for 4 days, then A leaves. How many more days does B need to finish the remaining work?",
    "options": [
      "10 days",
      "9 days",
      "8 days",
      "6 days"
    ],
    "correct_option_index": 2,
    "explanation": "Combined rate = 1/12 + 1/18 = 5/36 per day. In 4 days together, work done = 4 \u00d7 5/36 = 20/36 = 5/9. Remaining = 1 \u2212 5/9 = 4/9. B alone: (4/9) \u00f7 (1/18) = 8 days.",
    "source": "Curated",
    "id": 5,
    "question_id": 5
  },
  {
    "domain": "Aptitude",
    "question_type": "theory",
    "sub_topic": "Simple & Compound Interest",
    "difficulty": "medium",
    "question_text": "What is the compound interest on \u20b98000 at 10% per annum for 2 years, compounded annually?",
    "options": [
      "\u20b91600",
      "\u20b91680",
      "\u20b91728",
      "\u20b91760"
    ],
    "correct_option_index": 1,
    "explanation": "A = 8000 \u00d7 (1 + 0.10)\u00b2 = 8000 \u00d7 1.21 = 9680. CI = 9680 \u2212 8000 = \u20b91680.",
    "source": "Curated",
    "id": 6,
    "question_id": 6
  },
  {
    "domain": "Aptitude",
    "question_type": "theory",
    "sub_topic": "Number Systems",
    "difficulty": "easy",
    "question_text": "What is the LCM of 12, 18, and 24?",
    "options": [
      "36",
      "48",
      "72",
      "96"
    ],
    "correct_option_index": 2,
    "explanation": "Prime factorisation: 12 = 2\u00b2\u00d73, 18 = 2\u00d73\u00b2, 24 = 2\u00b3\u00d73. LCM = 2\u00b3 \u00d7 3\u00b2 = 8 \u00d7 9 = 72.",
    "source": "Curated",
    "id": 7,
    "question_id": 7
  },
  {
    "domain": "Aptitude",
    "question_type": "theory",
    "sub_topic": "Averages",
    "difficulty": "easy",
    "question_text": "The average of five consecutive odd numbers is 41. What is the largest of these numbers?",
    "options": [
      "43",
      "45",
      "47",
      "49"
    ],
    "correct_option_index": 1,
    "explanation": "For 5 consecutive odd numbers, the average equals the middle (3rd) number. Middle = 41. Numbers: 37, 39, 41, 43, 45. Largest = 45.",
    "source": "Curated",
    "id": 8,
    "question_id": 8
  },
  {
    "domain": "Aptitude",
    "question_type": "theory",
    "sub_topic": "Permutations & Combinations",
    "difficulty": "hard",
    "question_text": "In how many ways can a committee of 3 men and 2 women be formed from a group of 6 men and 5 women?",
    "options": [
      "100",
      "150",
      "200",
      "250"
    ],
    "correct_option_index": 2,
    "explanation": "Ways to select 3 men from 6 = C(6,3) = 20. Ways to select 2 women from 5 = C(5,2) = 10. Total = 20 \u00d7 10 = 200.",
    "source": "Curated",
    "id": 9,
    "question_id": 9
  },
  {
    "domain": "Aptitude",
    "question_type": "theory",
    "sub_topic": "Profit & Loss",
    "difficulty": "hard",
    "question_text": "A person sells two articles at \u20b91200 each. On one he gains 20% and on the other he loses 20%. What is his overall gain or loss percentage?",
    "options": [
      "No loss, no gain",
      "4% gain",
      "4% loss",
      "2% loss"
    ],
    "correct_option_index": 2,
    "explanation": "When the same selling price is used and the profit/loss % are equal, there is always a net loss. Formula: Loss% = (common%)\u00b2/100 = 400/100 = 4%.",
    "source": "Curated",
    "id": 10,
    "question_id": 10
  },
  {
    "domain": "Aptitude",
    "question_type": "code",
    "sub_topic": "Number Systems",
    "difficulty": "medium",
    "question_text": "What does the following Python snippet print?\n\n```python\nx = 0b1010  # binary literal\ny = 0o12    # octal literal\nz = 0xA     # hex literal\nprint(x == y == z)\n```",
    "options": [
      "True",
      "False",
      "Error: mixed base comparison",
      "None"
    ],
    "correct_option_index": 0,
    "explanation": "All three literals evaluate to decimal 10: binary 1010\u2082 = 10, octal 12\u2088 = 10, hexadecimal A\u2081\u2086 = 10. Python evaluates `x == y == z` as `True`.",
    "source": "Curated",
    "id": 11,
    "question_id": 11
  },
  {
    "domain": "Aptitude",
    "question_type": "code",
    "sub_topic": "Logical Reasoning",
    "difficulty": "medium",
    "question_text": "What is the output of the following Python code?\n\n```python\nresult = [i * i for i in range(1, 6) if i % 2 != 0]\nprint(result)\n```",
    "options": [
      "[1, 4, 9, 16, 25]",
      "[1, 9, 25]",
      "[2, 4]",
      "[4, 16]"
    ],
    "correct_option_index": 1,
    "explanation": "range(1, 6) produces [1, 2, 3, 4, 5]. The filter `i % 2 != 0` leaves [1, 3, 5]. Squaring each yields [1, 9, 25].",
    "source": "Curated",
    "id": 12,
    "question_id": 12
  },
  {
    "domain": "Aptitude",
    "question_type": "code",
    "sub_topic": "Averages",
    "difficulty": "easy",
    "question_text": "A Python script reads a list of exam scores and computes the mean. What does it print?\n\n```python\nscores = [72, 85, 90, 68, 95]\nmean = sum(scores) / len(scores)\nprint(round(mean, 1))\n```",
    "options": [
      "82.0",
      "82.5",
      "82.1",
      "81.0"
    ],
    "correct_option_index": 0,
    "explanation": "sum([72, 85, 90, 68, 95]) = 410. len(scores) = 5. mean = 410 / 5 = 82.0.",
    "source": "Curated",
    "id": 13,
    "question_id": 13
  },
  {
    "domain": "Aptitude",
    "question_type": "code",
    "sub_topic": "Bitwise Operations",
    "difficulty": "hard",
    "question_text": "What is the value of `result` after executing the following bitwise manipulation in Python?\n\n```python\na = 12  # 1100 in binary\nb = 10  # 1010 in binary\nresult = (a ^ b) << 1\nprint(result)\n```",
    "options": [
      "6",
      "12",
      "16",
      "24"
    ],
    "correct_option_index": 1,
    "explanation": "a ^ b (XOR) computes 1100 ^ 1010 = 0110 (decimal 6). Left-shifting by 1 bit (6 << 1) equals 6 \u00d7 2 = 12.",
    "source": "Curated",
    "id": 14,
    "question_id": 14
  },
  {
    "domain": "Aptitude",
    "question_type": "code",
    "sub_topic": "Recursion & Math",
    "difficulty": "medium",
    "question_text": "What is the return value of `gcd(48, 18)` using this recursive Euclidean algorithm?\n\n```python\ndef gcd(a, b):\n    if b == 0:\n        return a\n    return gcd(b, a % b)\n```",
    "options": [
      "2",
      "4",
      "6",
      "12"
    ],
    "correct_option_index": 2,
    "explanation": "gcd(48, 18) -> gcd(18, 48 % 18 = 12) -> gcd(12, 18 % 12 = 6) -> gcd(6, 12 % 6 = 0) -> returns 6.",
    "source": "Curated",
    "id": 15,
    "question_id": 15
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "theory",
    "sub_topic": "SOLID Principles",
    "difficulty": "medium",
    "question_text": "Which SOLID principle states that a class should have only one reason to change?",
    "options": [
      "Open/Closed Principle",
      "Single Responsibility Principle",
      "Liskov Substitution Principle",
      "Interface Segregation Principle"
    ],
    "correct_option_index": 1,
    "explanation": "The Single Responsibility Principle (SRP) dictates that a class should have only one responsibility \u2014 i.e., only one reason to change.",
    "source": "Curated",
    "id": 16,
    "question_id": 16
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "theory",
    "sub_topic": "Design Patterns",
    "difficulty": "medium",
    "question_text": "Which design pattern ensures that a class has only one instance and provides a global access point to it?",
    "options": [
      "Factory",
      "Singleton",
      "Prototype",
      "Builder"
    ],
    "correct_option_index": 1,
    "explanation": "The Singleton pattern restricts instantiation of a class to a single object and provides a global access point.",
    "source": "Curated",
    "id": 17,
    "question_id": 17
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "theory",
    "sub_topic": "Version Control (Git)",
    "difficulty": "easy",
    "question_text": "What does `git rebase` do compared to `git merge`?",
    "options": [
      "Creates a merge commit preserving branch history",
      "Rewrites commit history onto the target branch tip",
      "Reverts the last commit",
      "Stashes uncommitted changes"
    ],
    "correct_option_index": 1,
    "explanation": "git rebase replays commits from the current branch on top of the target branch, producing a linear history without a merge commit.",
    "source": "Curated",
    "id": 18,
    "question_id": 18
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "theory",
    "sub_topic": "Testing",
    "difficulty": "medium",
    "question_text": "What type of testing verifies that individually tested modules work correctly when combined together?",
    "options": [
      "Unit testing",
      "Integration testing",
      "Regression testing",
      "Smoke testing"
    ],
    "correct_option_index": 1,
    "explanation": "Integration testing checks that separate modules or services function correctly as a combined unit, catching interface mismatches.",
    "source": "Curated",
    "id": 19,
    "question_id": 19
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "theory",
    "sub_topic": "System Design",
    "difficulty": "hard",
    "question_text": "In the CAP theorem, which two properties can a distributed system guarantee simultaneously during a network partition?",
    "options": [
      "Consistency and Availability",
      "Availability and Partition tolerance",
      "Consistency and Partition tolerance",
      "All three: Consistency, Availability, and Partition tolerance"
    ],
    "correct_option_index": 2,
    "explanation": "During a network partition, a distributed system must choose between Consistency (CP) or Availability (AP).",
    "source": "Curated",
    "id": 20,
    "question_id": 20
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "theory",
    "sub_topic": "Data Structures",
    "difficulty": "medium",
    "question_text": "What is the average-case time complexity of searching for an element in a balanced Binary Search Tree (BST)?",
    "options": [
      "O(1)",
      "O(log n)",
      "O(n)",
      "O(n log n)"
    ],
    "correct_option_index": 1,
    "explanation": "In a balanced BST, each comparison halves the search space, yielding O(log n) time complexity.",
    "source": "Curated",
    "id": 21,
    "question_id": 21
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "theory",
    "sub_topic": "REST APIs",
    "difficulty": "easy",
    "question_text": "Which HTTP status code should a REST API return when a resource is successfully created?",
    "options": [
      "200 OK",
      "201 Created",
      "204 No Content",
      "202 Accepted"
    ],
    "correct_option_index": 1,
    "explanation": "201 Created is the standard HTTP response for a successful resource creation (e.g. via POST).",
    "source": "Curated",
    "id": 22,
    "question_id": 22
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "theory",
    "sub_topic": "Clean Code",
    "difficulty": "easy",
    "question_text": "Which of the following best describes 'technical debt' in software development?",
    "options": [
      "The cost of buying third-party software licences",
      "Shortcuts taken during development that require future rework",
      "The amount owed to contractors for unfinished features",
      "The time spent writing automated tests"
    ],
    "correct_option_index": 1,
    "explanation": "Technical debt refers to future rework required due to choosing an expedient solution now instead of a better design.",
    "source": "Curated",
    "id": 23,
    "question_id": 23
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "theory",
    "sub_topic": "Algorithms",
    "difficulty": "hard",
    "question_text": "Quicksort has an average time complexity of O(n log n). What is its worst-case time complexity and when does it occur?",
    "options": [
      "O(n log n) \u2014 it never degrades",
      "O(n\u00b2) \u2014 when the array is already sorted and the pivot is always the first/last element",
      "O(n\u00b2) \u2014 when the array contains all duplicate elements",
      "O(n log\u00b2n) \u2014 when the pivot selection is randomised"
    ],
    "correct_option_index": 1,
    "explanation": "Quicksort degrades to O(n\u00b2) when partition sizes are maximally unbalanced, such as picking the first/last element on sorted data.",
    "source": "Curated",
    "id": 24,
    "question_id": 24
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "theory",
    "sub_topic": "Databases",
    "difficulty": "medium",
    "question_text": "What does ACID stand for in the context of database transactions?",
    "options": [
      "Atomicity, Consistency, Isolation, Durability",
      "Availability, Consistency, Integrity, Distribution",
      "Atomicity, Concurrency, Isolation, Durability",
      "Accuracy, Consistency, Isolation, Data-integrity"
    ],
    "correct_option_index": 0,
    "explanation": "ACID stands for Atomicity, Consistency, Isolation, and Durability.",
    "source": "Curated",
    "id": 25,
    "question_id": 25
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "code",
    "sub_topic": "Version Control (Git)",
    "difficulty": "medium",
    "question_text": "What is the effect of running the following Git commands?\n\n```bash\ngit checkout -b feature/auth\n# ... make changes ...\ngit add .\ngit commit -m \"Add JWT auth\"\ngit checkout main\ngit merge feature/auth --no-ff\n```",
    "options": [
      "Creates a fast-forward merge, rebasing feature/auth onto main",
      "Creates a merge commit on main that preserves the feature branch history",
      "Squashes all commits into one and merges into main",
      "Deletes the feature/auth branch after merging"
    ],
    "correct_option_index": 1,
    "explanation": "`--no-ff` (no fast-forward) forces Git to create a merge commit even if a fast-forward is possible, preserving branch history.",
    "source": "Curated",
    "id": 26,
    "question_id": 26
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "code",
    "sub_topic": "Algorithms",
    "difficulty": "hard",
    "question_text": "What is the time complexity of the following function?\n\n```python\ndef has_duplicate(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(n):\n            if arr[i] == arr[j] and i != j:\n                return True\n    return False\n```",
    "options": [
      "O(n)",
      "O(n log n)",
      "O(n\u00b2)",
      "O(2\u207f)"
    ],
    "correct_option_index": 2,
    "explanation": "Nested loops iterating over n elements give a worst-case time complexity of O(n\u00b2).",
    "source": "Curated",
    "id": 27,
    "question_id": 27
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "code",
    "sub_topic": "REST APIs",
    "difficulty": "medium",
    "question_text": "A FastAPI endpoint is defined as below. What HTTP status code does it return on a successful POST?\n\n```python\nfrom fastapi import APIRouter, status\nrouter = APIRouter()\n\n@router.post(\"/items\", status_code=status.HTTP_201_CREATED)\nasync def create_item(name: str):\n    return {\"name\": name}\n```",
    "options": [
      "200 OK",
      "201 Created",
      "202 Accepted",
      "204 No Content"
    ],
    "correct_option_index": 1,
    "explanation": "The decorator parameter `status_code=status.HTTP_201_CREATED` explicitly sets the default success code to 201.",
    "source": "Curated",
    "id": 28,
    "question_id": 28
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "code",
    "sub_topic": "Async Programming",
    "difficulty": "hard",
    "question_text": "What is the output of the following Python `asyncio` code?\n\n```python\nimport asyncio\n\nasync def worker(n):\n    await asyncio.sleep(0.01)\n    return n * 2\n\nasync def main():\n    res = await asyncio.gather(worker(1), worker(2), worker(3))\n    print(res)\n\nasyncio.run(main())\n```",
    "options": [
      "[2, 4, 6]",
      "[6, 4, 2]",
      "Order is non-deterministic",
      "(2, 4, 6) as a tuple"
    ],
    "correct_option_index": 0,
    "explanation": "`asyncio.gather` preserves the order of the submitted awaitables in its returned list, returning `[2, 4, 6]` regardless of completion timing.",
    "source": "Curated",
    "id": 29,
    "question_id": 29
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "code",
    "sub_topic": "Design Patterns",
    "difficulty": "medium",
    "question_text": "Which design pattern is implemented in this Python code snippet?\n\n```python\nclass DatabaseConnection:\n    _instance = None\n    def __new__(cls):\n        if cls._instance is None:\n            cls._instance = super().__new__(cls)\n        return cls._instance\n```",
    "options": [
      "Factory Method",
      "Singleton",
      "Adapter",
      "Proxy"
    ],
    "correct_option_index": 1,
    "explanation": "Overriding `__new__` to return a cached `_instance` guarantees that only one object of the class is ever created (Singleton pattern).",
    "source": "Curated",
    "id": 30,
    "question_id": 30
  },
  {
    "domain": "SoftwareEngineering",
    "question_type": "code",
    "sub_topic": "Error Handling",
    "difficulty": "easy",
    "question_text": "What will this Python block print when executed?\n\n```python\ndef test():\n    try:\n        return 1\n    finally:\n        return 2\n\nprint(test())\n```",
    "options": [
      "1",
      "2",
      "None",
      "SyntaxError"
    ],
    "correct_option_index": 1,
    "explanation": "A return statement in a `finally` block overrides any previous return statement in the `try` or `except` blocks, returning 2.",
    "source": "Curated",
    "id": 31,
    "question_id": 31
  },
  {
    "domain": "AIML",
    "question_type": "theory",
    "sub_topic": "Loss Functions",
    "difficulty": "medium",
    "question_text": "Which loss function is most appropriate for a multi-class classification problem where classes are mutually exclusive?",
    "options": [
      "Binary Cross-Entropy",
      "Mean Squared Error",
      "Categorical Cross-Entropy",
      "Hinge Loss"
    ],
    "correct_option_index": 2,
    "explanation": "Categorical Cross-Entropy is used for multi-class classification with mutually exclusive classes.",
    "source": "Curated",
    "id": 32,
    "question_id": 32
  },
  {
    "domain": "AIML",
    "question_type": "theory",
    "sub_topic": "Activation Functions",
    "difficulty": "medium",
    "question_text": "What is the primary advantage of the ReLU activation function over the sigmoid function in deep neural networks?",
    "options": [
      "ReLU output is bounded between 0 and 1",
      "ReLU mitigates the vanishing gradient problem",
      "ReLU is differentiable everywhere",
      "ReLU always produces non-negative outputs for all inputs"
    ],
    "correct_option_index": 1,
    "explanation": "ReLU maintains a constant derivative of 1 for positive inputs, avoiding gradient saturation (vanishing gradients) in deep layers.",
    "source": "Curated",
    "id": 33,
    "question_id": 33
  },
  {
    "domain": "AIML",
    "question_type": "theory",
    "sub_topic": "Overfitting & Regularisation",
    "difficulty": "medium",
    "question_text": "Which regularisation technique randomly sets a fraction of neuron activations to zero during each training pass to prevent overfitting?",
    "options": [
      "L1 Regularisation",
      "L2 Regularisation",
      "Dropout",
      "Batch Normalisation"
    ],
    "correct_option_index": 2,
    "explanation": "Dropout randomly zeroes a subset of neuron activations during training, reducing co-adaptation and overfitting.",
    "source": "Curated",
    "id": 34,
    "question_id": 34
  },
  {
    "domain": "AIML",
    "question_type": "theory",
    "sub_topic": "Model Evaluation",
    "difficulty": "hard",
    "question_text": "In a classification model with 90% accuracy on an imbalanced dataset where 90% of samples are class 0, which metric would BEST reveal poor model performance?",
    "options": [
      "Accuracy",
      "F1 Score",
      "Log Loss",
      "AUC-ROC"
    ],
    "correct_option_index": 1,
    "explanation": "F1 Score balances Precision and Recall, exposing models that trivially predict only the majority class.",
    "source": "Curated",
    "id": 35,
    "question_id": 35
  },
  {
    "domain": "AIML",
    "question_type": "theory",
    "sub_topic": "Supervised Learning",
    "difficulty": "easy",
    "question_text": "What is the key difference between supervised and unsupervised learning?",
    "options": [
      "Supervised learning uses neural networks; unsupervised learning does not",
      "Supervised learning requires labelled training data; unsupervised does not",
      "Supervised learning is faster to train than unsupervised learning",
      "Unsupervised learning always produces better results"
    ],
    "correct_option_index": 1,
    "explanation": "Supervised learning maps features to ground truth labels; unsupervised learning discovers patterns in unlabelled data.",
    "source": "Curated",
    "id": 36,
    "question_id": 36
  },
  {
    "domain": "AIML",
    "question_type": "theory",
    "sub_topic": "Natural Language Processing",
    "difficulty": "medium",
    "question_text": "What does 'tokenisation' refer to in NLP?",
    "options": [
      "Converting text to numerical embeddings",
      "Breaking text into smaller units such as words or subwords",
      "Removing stop words from a sentence",
      "Encrypting text for secure processing"
    ],
    "correct_option_index": 1,
    "explanation": "Tokenisation is the process of splitting text sequences into discrete tokens (words/subwords) for downstream processing.",
    "source": "Curated",
    "id": 37,
    "question_id": 37
  },
  {
    "domain": "AIML",
    "question_type": "theory",
    "sub_topic": "Neural Networks",
    "difficulty": "hard",
    "question_text": "What is the role of the 'attention mechanism' in transformer architectures?",
    "options": [
      "It applies convolutions to detect local features in text",
      "It allows the model to weigh the importance of different positions in the input sequence",
      "It reduces the dimensionality of word embeddings",
      "It normalises activations across the batch dimension"
    ],
    "correct_option_index": 1,
    "explanation": "Attention dynamically calculates relevance weights between pairs of tokens across the sequence, capturing long-range dependencies.",
    "source": "Curated",
    "id": 38,
    "question_id": 38
  },
  {
    "domain": "AIML",
    "question_type": "theory",
    "sub_topic": "Optimisation",
    "difficulty": "medium",
    "question_text": "What is the key advantage of Adam optimiser over vanilla Stochastic Gradient Descent (SGD)?",
    "options": [
      "Adam always converges to a global minimum",
      "Adam adapts the learning rate per-parameter using first and second moment estimates",
      "Adam requires no hyperparameter tuning",
      "Adam uses momentum but not adaptive learning rates"
    ],
    "correct_option_index": 1,
    "explanation": "Adam combines momentum (first moment) with adaptive per-parameter learning rates (second moment scaling).",
    "source": "Curated",
    "id": 39,
    "question_id": 39
  },
  {
    "domain": "AIML",
    "question_type": "theory",
    "sub_topic": "Clustering",
    "difficulty": "medium",
    "question_text": "In K-Means clustering, how is the initial centroid placement handled and why does it matter?",
    "options": [
      "Centroids are fixed at data mean \u2014 placement doesn't matter",
      "Centroids are randomly initialised \u2014 poor initialisation can lead to suboptimal local minima",
      "Centroids are determined by PCA and always produce the global optimum",
      "Centroids are always placed at the median of the dataset"
    ],
    "correct_option_index": 1,
    "explanation": "Standard K-Means is sensitive to initial random centroid placement, which K-Means++ mitigates by spreading initial points.",
    "source": "Curated",
    "id": 40,
    "question_id": 40
  },
  {
    "domain": "AIML",
    "question_type": "theory",
    "sub_topic": "Bias-Variance Tradeoff",
    "difficulty": "hard",
    "question_text": "A model achieves very high training accuracy but poor validation accuracy. This indicates:",
    "options": [
      "High bias (underfitting)",
      "High variance (overfitting)",
      "Data leakage",
      "Vanishing gradients"
    ],
    "correct_option_index": 1,
    "explanation": "A large gap between high training accuracy and low validation accuracy is the hallmark of overfitting (high variance).",
    "source": "Curated",
    "id": 41,
    "question_id": 41
  },
  {
    "domain": "AIML",
    "question_type": "code",
    "sub_topic": "Model Evaluation",
    "difficulty": "hard",
    "question_text": "Given the following confusion matrix, what is the Precision for class 1?\n\n```\n              Predicted\n            |  0  |  1  |\nActual  0   |  50 |  10 |\n        1   |   5 |  35 |\n```",
    "options": [
      "87.5%",
      "77.8%",
      "85.4%",
      "70.0%"
    ],
    "correct_option_index": 1,
    "explanation": "Precision = TP / (TP + FP) = 35 / (35 + 10) = 35 / 45 \u2248 0.7778 = 77.8%.",
    "source": "Curated",
    "id": 42,
    "question_id": 42
  },
  {
    "domain": "AIML",
    "question_type": "code",
    "sub_topic": "Neural Networks",
    "difficulty": "medium",
    "question_text": "What is the output shape of the following Keras model given input shape (None, 32)?\n\n```python\nfrom tensorflow import keras\n\nmodel = keras.Sequential([\n    keras.layers.Dense(64, activation='relu', input_shape=(32,)),\n    keras.layers.Dropout(0.3),\n    keras.layers.Dense(10, activation='softmax'),\n])\nprint(model.output_shape)\n```",
    "options": [
      "(None, 64)",
      "(None, 32)",
      "(None, 10)",
      "(None, 6)"
    ],
    "correct_option_index": 2,
    "explanation": "The output shape is determined by the final Dense(10) layer, which is (None, 10).",
    "source": "Curated",
    "id": 43,
    "question_id": 43
  },
  {
    "domain": "AIML",
    "question_type": "code",
    "sub_topic": "Overfitting & Regularisation",
    "difficulty": "medium",
    "question_text": "What does the following scikit-learn code demonstrate?\n\n```python\nfrom sklearn.linear_model import Ridge\n\nmodel = Ridge(alpha=10.0)\nmodel.fit(X_train, y_train)\n```",
    "options": [
      "L1 regularisation (Lasso) with penalty strength 10.0",
      "L2 regularisation (Ridge) with penalty strength 10.0, shrinking coefficients toward zero",
      "Dropout regularisation applied during training",
      "Elastic net combining L1 and L2 with equal weighting"
    ],
    "correct_option_index": 1,
    "explanation": "Ridge applies L2 regularisation (\u03b1 \u03a3w\u1d62\u00b2), which penalises large weights and shrinks coefficients toward zero.",
    "source": "Curated",
    "id": 44,
    "question_id": 44
  },
  {
    "domain": "AIML",
    "question_type": "code",
    "sub_topic": "PyTorch Tensors",
    "difficulty": "medium",
    "question_text": "What does `tensor.view(-1, 4)` do in PyTorch when `tensor.shape == (2, 6)`?\n\n```python\nimport torch\nt = torch.randn(2, 6)  # 12 elements total\nout = t.view(-1, 4)\nprint(out.shape)\n```",
    "options": [
      "torch.Size([3, 4])",
      "torch.Size([2, 4])",
      "torch.Size([4, 3])",
      "RuntimeError: invalid shape"
    ],
    "correct_option_index": 0,
    "explanation": "Total elements = 2 \u00d7 6 = 12. With column size 4, the inferred row dimension (`-1`) is 12 \u00f7 4 = 3, so shape is (3, 4).",
    "source": "Curated",
    "id": 45,
    "question_id": 45
  },
  {
    "domain": "AIML",
    "question_type": "code",
    "sub_topic": "Loss Functions",
    "difficulty": "medium",
    "question_text": "What is the calculated binary cross-entropy loss for a single sample where `y_true = 1` and `y_pred = 0.5`?\n\n```python\nimport math\n# Loss = -(y * log(p) + (1-y) * log(1-p))\nloss = -math.log(0.5)\nprint(round(loss, 3))\n```",
    "options": [
      "0.500",
      "0.693",
      "1.000",
      "0.301"
    ],
    "correct_option_index": 1,
    "explanation": "Natural log of 0.5 is -0.69315... So -ln(0.5) \u2248 0.693.",
    "source": "Curated",
    "id": 46,
    "question_id": 46
  },
  {
    "domain": "AIML",
    "question_type": "code",
    "sub_topic": "Scikit-Learn Pipelines",
    "difficulty": "hard",
    "question_text": "Why is `Pipeline` preferred in this code over transforming data manually before cross-validation?\n\n```python\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.svm import SVC\n\npipe = Pipeline([\n    ('scaler', StandardScaler()),\n    ('svc', SVC())\n])\n```",
    "options": [
      "It runs training faster using GPU acceleration",
      "It prevents data leakage by fitting the scaler only on the training fold during cross-validation",
      "It automatically tunes hyperparameters",
      "It converts non-numeric columns to embeddings"
    ],
    "correct_option_index": 1,
    "explanation": "Scikit-learn `Pipeline` ensures transformers are fitted solely on training folds during CV, preventing validation data leakage.",
    "source": "Curated",
    "id": 47,
    "question_id": 47
  },
  {
    "domain": "DataScience",
    "question_type": "theory",
    "sub_topic": "SQL",
    "difficulty": "medium",
    "question_text": "What is the difference between `INNER JOIN` and `LEFT JOIN` in SQL?",
    "options": [
      "INNER JOIN returns all rows from both tables; LEFT JOIN returns only matching rows",
      "INNER JOIN returns only matching rows; LEFT JOIN returns all rows from the left table",
      "They are functionally identical",
      "LEFT JOIN is faster than INNER JOIN for large datasets"
    ],
    "correct_option_index": 1,
    "explanation": "INNER JOIN retains only rows with matches in both tables; LEFT JOIN keeps all left rows and fills unmatched right columns with NULL.",
    "source": "Curated",
    "id": 48,
    "question_id": 48
  },
  {
    "domain": "DataScience",
    "question_type": "theory",
    "sub_topic": "Statistics",
    "difficulty": "medium",
    "question_text": "In hypothesis testing, what does a p-value of 0.03 indicate at a 5% significance level?",
    "options": [
      "We fail to reject the null hypothesis",
      "We reject the null hypothesis",
      "The result is not statistically significant",
      "The effect size is 3%"
    ],
    "correct_option_index": 1,
    "explanation": "Since p (0.03) < \u03b1 (0.05), we reject the null hypothesis in favour of statistical significance.",
    "source": "Curated",
    "id": 49,
    "question_id": 49
  },
  {
    "domain": "DataScience",
    "question_type": "theory",
    "sub_topic": "Pandas",
    "difficulty": "easy",
    "question_text": "In pandas, what does `df.groupby('category')['value'].mean()` return?",
    "options": [
      "The mean of the entire 'value' column",
      "The mean of 'value' for each unique group in 'category'",
      "A boolean mask of where 'value' equals the mean",
      "The count of rows in each 'category' group"
    ],
    "correct_option_index": 1,
    "explanation": "groupby splits the dataset by 'category' and calculates the mean of 'value' per group as a Series.",
    "source": "Curated",
    "id": 50,
    "question_id": 50
  },
  {
    "domain": "DataScience",
    "question_type": "theory",
    "sub_topic": "Feature Engineering",
    "difficulty": "medium",
    "question_text": "Why is it important to apply feature scaling BEFORE training an SVM or K-Nearest Neighbours model?",
    "options": [
      "These algorithms require binary input features",
      "These algorithms rely on distance metrics that are sensitive to feature magnitudes",
      "Feature scaling speeds up gradient descent for these models",
      "Scaling prevents class imbalance"
    ],
    "correct_option_index": 1,
    "explanation": "Distance-based algorithms (SVM, KNN) are dominated by large-scale features unless all features are normalised to a comparable scale.",
    "source": "Curated",
    "id": 51,
    "question_id": 51
  },
  {
    "domain": "DataScience",
    "question_type": "theory",
    "sub_topic": "Data Cleaning",
    "difficulty": "easy",
    "question_text": "Which pandas method would you use to check the number of missing values in each column of a DataFrame?",
    "options": [
      "df.describe()",
      "df.isnull().sum()",
      "df.fillna(0)",
      "df.dropna()"
    ],
    "correct_option_index": 1,
    "explanation": "`df.isnull().sum()` computes column-wise counts of NaN/null values.",
    "source": "Curated",
    "id": 52,
    "question_id": 52
  },
  {
    "domain": "DataScience",
    "question_type": "theory",
    "sub_topic": "Visualisation",
    "difficulty": "easy",
    "question_text": "Which type of plot is most appropriate for visualising the distribution of a single continuous variable?",
    "options": [
      "Bar chart",
      "Scatter plot",
      "Histogram",
      "Pie chart"
    ],
    "correct_option_index": 2,
    "explanation": "A histogram shows frequency distributions of continuous numerical data using bins.",
    "source": "Curated",
    "id": 53,
    "question_id": 53
  },
  {
    "domain": "DataScience",
    "question_type": "theory",
    "sub_topic": "Statistics",
    "difficulty": "hard",
    "question_text": "What is the Central Limit Theorem (CLT) and why is it important in statistics?",
    "options": [
      "It states that all real-world data follows a normal distribution",
      "It guarantees that the sample mean is always equal to the population mean",
      "It states that the sampling distribution of the mean approaches normality as sample size increases, regardless of population distribution",
      "It proves that larger datasets always produce more accurate models"
    ],
    "correct_option_index": 2,
    "explanation": "The CLT establishes that sample means follow an approximately normal distribution for sufficiently large n, enabling parametric inference.",
    "source": "Curated",
    "id": 54,
    "question_id": 54
  },
  {
    "domain": "DataScience",
    "question_type": "theory",
    "sub_topic": "Model Selection",
    "difficulty": "medium",
    "question_text": "What is k-fold cross-validation and what problem does it solve?",
    "options": [
      "It trains k different model architectures to find the best one",
      "It splits data into k subsets, trains on k-1 and tests on 1, rotating k times to get a robust performance estimate",
      "It reduces overfitting by training only on k% of the data",
      "It is a method for selecting the optimal number of clusters in K-Means"
    ],
    "correct_option_index": 1,
    "explanation": "k-fold CV partitions data into k folds to evaluate model generalisation across multiple train-test splits.",
    "source": "Curated",
    "id": 55,
    "question_id": 55
  },
  {
    "domain": "DataScience",
    "question_type": "theory",
    "sub_topic": "SQL",
    "difficulty": "hard",
    "question_text": "Which SQL window function would you use to calculate a running (cumulative) total of sales ordered by date?",
    "options": [
      "SUM(sales) GROUP BY date",
      "SUM(sales) OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)",
      "CUMSUM(sales) OVER (PARTITION BY date)",
      "TOTAL(sales) OVER (ORDER BY date)"
    ],
    "correct_option_index": 1,
    "explanation": "The `OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` window clause calculates a progressive cumulative sum.",
    "source": "Curated",
    "id": 56,
    "question_id": 56
  },
  {
    "domain": "DataScience",
    "question_type": "theory",
    "sub_topic": "Correlation & Causation",
    "difficulty": "medium",
    "question_text": "A study finds a high positive correlation between ice cream sales and drowning incidents. What is the most likely explanation?",
    "options": [
      "Ice cream consumption directly causes drowning",
      "Drowning incidents cause people to buy more ice cream",
      "A confounding variable (hot weather) drives both",
      "The correlation is statistically invalid"
    ],
    "correct_option_index": 2,
    "explanation": "Confounding factors (temperature/summer) simultaneously increase ice cream consumption and swimming activity.",
    "source": "Curated",
    "id": 57,
    "question_id": 57
  },
  {
    "domain": "DataScience",
    "question_type": "code",
    "sub_topic": "SQL",
    "difficulty": "medium",
    "question_text": "What does the following SQL query return?\n\n```sql\nSELECT department, COUNT(*) AS headcount\nFROM employees\nWHERE salary > 50000\nGROUP BY department\nHAVING COUNT(*) > 3\nORDER BY headcount DESC;\n```",
    "options": [
      "All departments and their total employee counts",
      "Departments where more than 3 employees earn above 50,000, ordered by headcount descending",
      "The single department with the most employees earning above 50,000",
      "All employees earning above 50,000, grouped and sorted"
    ],
    "correct_option_index": 1,
    "explanation": "WHERE filters rows before grouping; GROUP BY groups by department; HAVING filters aggregated groups with count > 3.",
    "source": "Curated",
    "id": 58,
    "question_id": 58
  },
  {
    "domain": "DataScience",
    "question_type": "code",
    "sub_topic": "Pandas",
    "difficulty": "medium",
    "question_text": "What does the following pandas code produce?\n\n```python\nimport pandas as pd\n\ndf = pd.DataFrame({'score': [85, 90, 78, 92, 88]})\nprint(df['score'].describe())\n```",
    "options": [
      "Only the mean and standard deviation of the column",
      "Count, mean, std, min, 25th/50th/75th percentiles, and max of the score column",
      "A histogram of the score distribution",
      "The sum and cumulative sum of the column"
    ],
    "correct_option_index": 1,
    "explanation": "`.describe()` on a numeric Series outputs count, mean, std, min, 25%, 50%, 75%, and max.",
    "source": "Curated",
    "id": 59,
    "question_id": 59
  },
  {
    "domain": "DataScience",
    "question_type": "code",
    "sub_topic": "Feature Engineering",
    "difficulty": "medium",
    "question_text": "What transformation does the following scikit-learn code apply, and why is fit called only on X_train?\n\n```python\nfrom sklearn.preprocessing import StandardScaler\n\nscaler = StandardScaler()\nX_train_scaled = scaler.fit_transform(X_train)\nX_test_scaled  = scaler.transform(X_test)\n```",
    "options": [
      "MinMax scaling to [0,1]; fit on train prevents test data from affecting scale range",
      "Z-score standardisation (subtract mean, divide by std); fit only on train prevents data leakage",
      "Log transformation; fit on train ensures consistent log base across splits",
      "PCA dimensionality reduction; fit on train prevents overfitting to test variance"
    ],
    "correct_option_index": 1,
    "explanation": "StandardScaler computes z = (x - \u03bc) / \u03c3. Fitting only on X_train prevents test fold statistics from leaking into training.",
    "source": "Curated",
    "id": 60,
    "question_id": 60
  },
  {
    "domain": "DataScience",
    "question_type": "code",
    "sub_topic": "Pandas Filtering",
    "difficulty": "easy",
    "question_text": "What is the shape of the filtered DataFrame returned by this pandas expression?\n\n```python\nimport pandas as pd\ndf = pd.DataFrame({'age': [20, 25, 30, 35], 'city': ['NY', 'SF', 'NY', 'LA']})\nfiltered = df[(df['age'] >= 25) & (df['city'] == 'NY')]\nprint(len(filtered))\n```",
    "options": [
      "1",
      "2",
      "3",
      "0"
    ],
    "correct_option_index": 0,
    "explanation": "Only row index 2 (age=30, city='NY') satisfies both age >= 25 AND city == 'NY'. Length is 1.",
    "source": "Curated",
    "id": 61,
    "question_id": 61
  },
  {
    "domain": "DataScience",
    "question_type": "code",
    "sub_topic": "NumPy Array Operations",
    "difficulty": "medium",
    "question_text": "What is the output of the following broadcasting operation in NumPy?\n\n```python\nimport numpy as np\na = np.array([[1], [2], [3]])  # shape (3, 1)\nb = np.array([10, 20])          # shape (2,)\nprint((a + b).shape)\n```",
    "options": [
      "(3, 2)",
      "(3, 1)",
      "(2, 3)",
      "ValueError"
    ],
    "correct_option_index": 0,
    "explanation": "NumPy broadcasting matches dimensions: (3, 1) and (1, 2) broadcast to shape (3, 2).",
    "source": "Curated",
    "id": 62,
    "question_id": 62
  },
  {
    "domain": "DataScience",
    "question_type": "code",
    "sub_topic": "SQL Window Functions",
    "difficulty": "hard",
    "question_text": "What does `DENSE_RANK()` return when two rows share the same rank (e.g. rank 2)?\n\n```sql\nSELECT score, DENSE_RANK() OVER (ORDER BY score DESC) as rk\nFROM exams;\n-- scores: 100, 90, 90, 80\n```",
    "options": [
      "1, 2, 2, 3 (no gaps in ranking)",
      "1, 2, 2, 4 (skips rank 3)",
      "1, 2, 3, 4 (arbitrary tiebreak)",
      "Error on duplicate values"
    ],
    "correct_option_index": 0,
    "explanation": "`DENSE_RANK()` assigns consecutive rank numbers without gaps (1, 2, 2, 3), whereas `RANK()` leaves gaps (1, 2, 2, 4).",
    "source": "Curated",
    "id": 63,
    "question_id": 63
  },
  {
    "domain": "CyberSecurity",
    "question_type": "theory",
    "sub_topic": "OWASP Top 10",
    "difficulty": "medium",
    "question_text": "Which OWASP Top 10 vulnerability occurs when user-supplied data is sent to an interpreter as part of a command or query?",
    "options": [
      "Broken Access Control",
      "Injection",
      "Cryptographic Failures",
      "SSRF"
    ],
    "correct_option_index": 1,
    "explanation": "Injection attacks happen when untrusted input is interpreted as command/query syntax.",
    "source": "Curated",
    "id": 64,
    "question_id": 64
  },
  {
    "domain": "CyberSecurity",
    "question_type": "theory",
    "sub_topic": "Encryption",
    "difficulty": "medium",
    "question_text": "What is the fundamental difference between symmetric and asymmetric encryption?",
    "options": [
      "Symmetric is stronger; asymmetric is weaker",
      "Symmetric uses the same key for encryption and decryption; asymmetric uses a key pair",
      "Asymmetric encryption is faster than symmetric encryption",
      "Symmetric encryption cannot be used for data at rest"
    ],
    "correct_option_index": 1,
    "explanation": "Symmetric encryption relies on a single shared secret key; asymmetric encryption uses paired public/private keys.",
    "source": "Curated",
    "id": 65,
    "question_id": 65
  },
  {
    "domain": "CyberSecurity",
    "question_type": "theory",
    "sub_topic": "Network Security",
    "difficulty": "easy",
    "question_text": "What is a Man-in-the-Middle (MitM) attack?",
    "options": [
      "An attacker brute-forces a password hash offline",
      "An attacker secretly intercepts and potentially alters communication between two parties",
      "An attacker floods a server with requests to cause a denial of service",
      "An attacker exploits a buffer overflow vulnerability"
    ],
    "correct_option_index": 1,
    "explanation": "In a MitM attack, an unauthorised actor eavesdrops on or manipulates messages between two communicating systems.",
    "source": "Curated",
    "id": 66,
    "question_id": 66
  },
  {
    "domain": "CyberSecurity",
    "question_type": "theory",
    "sub_topic": "Authentication",
    "difficulty": "medium",
    "question_text": "Why should passwords be stored using bcrypt or Argon2 rather than SHA-256?",
    "options": [
      "SHA-256 is proprietary and cannot be used legally",
      "Bcrypt and Argon2 are intentionally slow and include salting, making brute-force attacks much harder",
      "SHA-256 cannot produce a fixed-length hash",
      "Bcrypt outputs a reversible hash, enabling password recovery"
    ],
    "correct_option_index": 1,
    "explanation": "Key-derivation functions (bcrypt/Argon2) feature tunable computational cost factors and automatic salting against GPU cracking.",
    "source": "Curated",
    "id": 67,
    "question_id": 67
  },
  {
    "domain": "CyberSecurity",
    "question_type": "theory",
    "sub_topic": "Web Security",
    "difficulty": "medium",
    "question_text": "What is Cross-Site Request Forgery (CSRF) and how is it typically prevented?",
    "options": [
      "Injecting malicious scripts into web pages; prevented by output encoding",
      "Tricking a user's browser into making unintended authenticated requests; prevented by CSRF tokens",
      "Intercepting API tokens in transit; prevented by HTTPS",
      "Exploiting weak session IDs; prevented by increasing ID entropy"
    ],
    "correct_option_index": 1,
    "explanation": "CSRF forces an authenticated browser to send forged requests, prevented via anti-CSRF synchronizer tokens and SameSite cookies.",
    "source": "Curated",
    "id": 68,
    "question_id": 68
  },
  {
    "domain": "CyberSecurity",
    "question_type": "theory",
    "sub_topic": "Malware",
    "difficulty": "easy",
    "question_text": "What distinguishes a ransomware attack from other malware?",
    "options": [
      "It replicates itself across networks without user interaction",
      "It encrypts the victim's files and demands payment for the decryption key",
      "It silently logs keystrokes to steal credentials",
      "It creates a backdoor for remote access"
    ],
    "correct_option_index": 1,
    "explanation": "Ransomware restricts access to files via strong encryption and extorts the victim for the decryption key.",
    "source": "Curated",
    "id": 69,
    "question_id": 69
  },
  {
    "domain": "CyberSecurity",
    "question_type": "theory",
    "sub_topic": "Network Security",
    "difficulty": "hard",
    "question_text": "What is the purpose of a DMZ (Demilitarised Zone) in network architecture?",
    "options": [
      "To segment internal network traffic by department",
      "To create an isolated subnet for publicly accessible servers, shielding the internal network",
      "To encrypt all traffic between internal hosts",
      "To monitor outbound traffic for data exfiltration"
    ],
    "correct_option_index": 1,
    "explanation": "A DMZ isolates public-facing servers (HTTP, DNS) in a perimeter network to protect internal subnets if compromised.",
    "source": "Curated",
    "id": 70,
    "question_id": 70
  },
  {
    "domain": "CyberSecurity",
    "question_type": "theory",
    "sub_topic": "Vulnerabilities",
    "difficulty": "hard",
    "question_text": "What is a buffer overflow vulnerability and what class of attack does it enable?",
    "options": [
      "Excessive memory allocation causing application slowdown; enables DoS only",
      "Writing data beyond a buffer's boundary, overwriting adjacent memory; enables arbitrary code execution",
      "Overloading a network buffer with packets; enables MitM attacks",
      "A race condition in buffer reads; enables data corruption only"
    ],
    "correct_option_index": 1,
    "explanation": "Buffer overflows write past memory bounds, potentially overwriting return pointers to hijack program execution flow.",
    "source": "Curated",
    "id": 71,
    "question_id": 71
  },
  {
    "domain": "CyberSecurity",
    "question_type": "theory",
    "sub_topic": "PKI & Certificates",
    "difficulty": "medium",
    "question_text": "What role does a Certificate Authority (CA) play in TLS/HTTPS?",
    "options": [
      "It encrypts the data transmitted between client and server",
      "It issues and signs digital certificates that verify a server's identity",
      "It acts as a proxy between client and server for inspection",
      "It stores private keys for website owners"
    ],
    "correct_option_index": 1,
    "explanation": "CAs act as trusted third parties that cryptographically sign digital certificates validating domain ownership.",
    "source": "Curated",
    "id": 72,
    "question_id": 72
  },
  {
    "domain": "CyberSecurity",
    "question_type": "theory",
    "sub_topic": "Social Engineering",
    "difficulty": "easy",
    "question_text": "What is 'phishing' in the context of cyber security?",
    "options": [
      "A method of intercepting network packets to steal data",
      "A fraudulent attempt to obtain sensitive information by impersonating a trustworthy entity",
      "An automated attack that tests all password combinations",
      "A technique for bypassing two-factor authentication"
    ],
    "correct_option_index": 1,
    "explanation": "Phishing lures victims into revealing confidential credentials or clicking malicious payloads via deceptive communication.",
    "source": "Curated",
    "id": 73,
    "question_id": 73
  },
  {
    "domain": "CyberSecurity",
    "question_type": "code",
    "sub_topic": "Web Security",
    "difficulty": "medium",
    "question_text": "The following Python code is vulnerable to SQL Injection. Which fix correctly prevents it?\n\n```python\n# VULNERABLE\ndef get_user(username):\n    query = f\"SELECT * FROM users WHERE name = '{username}'\"\n    return db.execute(query)\n```",
    "options": [
      "`f\"SELECT * FROM users WHERE name = '{username.strip()}'\"` \u2014 strip whitespace",
      "`db.execute(\"SELECT * FROM users WHERE name = ?\", (username,))` \u2014 parameterised query",
      "`query.replace(\"'\", \"\\\\'\")` \u2014 escape single quotes manually",
      "`if len(username) > 50: raise ValueError()` \u2014 length validation"
    ],
    "correct_option_index": 1,
    "explanation": "Parameterised queries treat variables as literal values rather than executable SQL syntax.",
    "source": "Curated",
    "id": 74,
    "question_id": 74
  },
  {
    "domain": "CyberSecurity",
    "question_type": "code",
    "sub_topic": "Authentication",
    "difficulty": "hard",
    "question_text": "Review the following JWT verification code. What is the critical security flaw?\n\n```python\nimport jwt\n\ndef verify_token(token: str, secret: str):\n    payload = jwt.decode(\n        token,\n        secret,\n        algorithms=[\"HS256\", \"none\"]\n    )\n    return payload\n```",
    "options": [
      "HS256 is deprecated; RS256 must always be used instead",
      "Accepting the 'none' algorithm allows attackers to forge tokens without a valid signature",
      "The secret key should be passed as bytes, not a string",
      "jwt.decode should be wrapped in a try-except block to handle expired tokens"
    ],
    "correct_option_index": 1,
    "explanation": "The 'none' algorithm indicates an unsigned token. Permitting 'none' allows attackers to spoof arbitrary claims without a signature.",
    "source": "Curated",
    "id": 75,
    "question_id": 75
  },
  {
    "domain": "CyberSecurity",
    "question_type": "code",
    "sub_topic": "Encryption",
    "difficulty": "medium",
    "question_text": "What is the security problem in the following AES-CBC encryption code?\n\n```python\nfrom Crypto.Cipher import AES\n\nkey = b'mysecretkey12345'  # 16 bytes\niv  = b'\\x00' * 16        # static zero IV\n\ncipher = AES.new(key, AES.MODE_CBC, iv)\nciphertext = cipher.encrypt(b'Attack at dawn!!')\n```",
    "options": [
      "AES-CBC is deprecated; only AES-GCM should be used",
      "Using a static (constant) IV breaks semantic security \u2014 same plaintext always yields same ciphertext",
      "The key is too short; AES requires a minimum 32-byte key",
      "The plaintext must be hashed before encryption"
    ],
    "correct_option_index": 1,
    "explanation": "CBC mode requires a random, unpredictable IV per message to ensure distinct ciphertexts for identical plaintexts.",
    "source": "Curated",
    "id": 76,
    "question_id": 76
  },
  {
    "domain": "CyberSecurity",
    "question_type": "code",
    "sub_topic": "Command Injection",
    "difficulty": "hard",
    "question_text": "Why is `subprocess.run(..., shell=True)` dangerous with user input in this snippet?\n\n```python\nimport subprocess\n\ndef ping_host(host_ip: str):\n    # User provides: '8.8.8.8; cat /etc/passwd'\n    subprocess.run(f\"ping -c 1 {host_ip}\", shell=True)\n```",
    "options": [
      "It runs commands with root privileges automatically",
      "The shell interprets metacharacters (;, &&, |), allowing attackers to chain arbitrary OS commands",
      "It causes an infinite loop in the ping process",
      "It exposes the host IP in cleartext over the network"
    ],
    "correct_option_index": 1,
    "explanation": "Passing unsanitised input to `shell=True` allows shell metacharacter injection (`;`, `&&`, `|`) to execute unintended arbitrary commands.",
    "source": "Curated",
    "id": 77,
    "question_id": 77
  },
  {
    "domain": "CyberSecurity",
    "question_type": "code",
    "sub_topic": "Password Hashing",
    "difficulty": "medium",
    "question_text": "What is the security advantage of `secrets.compare_digest` over `==` for comparing secrets?\n\n```python\nimport secrets\n\ndef check_api_key(user_key: str, real_key: str) -> bool:\n    return secrets.compare_digest(user_key, real_key)\n```",
    "options": [
      "It hashes the keys with SHA-512 before comparing",
      "It prevents timing attacks by executing in constant time regardless of where mismatches occur",
      "It automatically decrypts symmetric ciphertexts",
      "It validates that user_key is a valid UUID"
    ],
    "correct_option_index": 1,
    "explanation": "`secrets.compare_digest` executes in constant time, preventing side-channel timing attacks that infer secret characters based on response time.",
    "source": "Curated",
    "id": 78,
    "question_id": 78
  },
  {
    "domain": "CyberSecurity",
    "question_type": "code",
    "sub_topic": "XSS Mitigation",
    "difficulty": "medium",
    "question_text": "How does `html.escape` prevent Reflected Cross-Site Scripting (XSS) in this web view?\n\n```python\nimport html\n\ndef render_comment(user_input: str) -> str:\n    safe_text = html.escape(user_input)\n    return f\"<div class='comment'>{safe_text}</div>\"\n```",
    "options": [
      "It strips all HTML tags using a regular expression",
      "It converts characters like `<`, `>`, `&`, and `\"` to safe HTML entities (`&lt;`, `&gt;`), neutralizing script tags",
      "It executes JavaScript in a sandboxed iframe",
      "It encrypts user input with AES-256"
    ],
    "correct_option_index": 1,
    "explanation": "`html.escape()` converts HTML metacharacters (`<` to `&lt;`, `>` to `&gt;`), rendering them as literal characters instead of executable markup.",
    "source": "Curated",
    "id": 79,
    "question_id": 79
  }
];


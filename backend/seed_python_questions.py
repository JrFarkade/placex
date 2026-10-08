"""
Seed authentic Python Programming questions into placex.db
"""
import sqlite3
import json

PYTHON_QUESTIONS = [
    {
        "domain": "Python",
        "question_type": "theory",
        "sub_topic": "Memory Management",
        "difficulty": "medium",
        "question_text": "How does CPython primarily handle automated memory management for objects?",
        "options": [
            "Reference counting combined with a cyclic garbage collector",
            "Generational mark-and-sweep garbage collection exclusively",
            "Manual memory allocation with free() pointers",
            "Compile-time static borrow checking"
        ],
        "correct_option_index": 0,
        "explanation": "CPython uses reference counting as its primary memory management mechanism. When an object's reference count drops to zero, its memory is immediately deallocated. A cyclic garbage collector periodically handles reference cycles.",
        "source": "Curated"
    },
    {
        "domain": "Python",
        "question_type": "theory",
        "sub_topic": "Concurrency & GIL",
        "difficulty": "hard",
        "question_text": "What is the primary effect of Python's Global Interpreter Lock (GIL) on multi-threaded execution?",
        "options": [
            "It allows only one native thread to execute Python bytecode at a time per process",
            "It prevents threads from performing I/O operations simultaneously",
            "It automatically converts multi-threaded programs to asynchronous coroutines",
            "It disables memory caching across CPU cores"
        ],
        "correct_option_index": 0,
        "explanation": "The GIL is a mutex that protects access to Python objects, preventing multiple native threads from executing Python bytecodes at once. While I/O-bound threads release the GIL during network/disk operations, CPU-bound tasks do not achieve multi-core parallelism with threading alone and require multiprocessing.",
        "source": "Curated"
    },
    {
        "domain": "Python",
        "question_type": "theory",
        "sub_topic": "Functions & Scope",
        "difficulty": "medium",
        "question_text": "What is the danger of using a mutable default argument like `def append_to(item, target=[])` in Python?",
        "options": [
            "The default list is created only once when the function is defined, causing state to persist across calls",
            "Python raises a SyntaxError at compile time",
            "The list is stored on the call stack and deallocated immediately upon function return",
            "Default arguments are converted into immutable tuples automatically"
        ],
        "correct_option_index": 0,
        "explanation": "In Python, default parameter expressions are evaluated once when the function definition is executed, not each time the function is called. Mutating `target` affects subsequent invocations that use the default.",
        "source": "Curated"
    },
    {
        "domain": "Python",
        "question_type": "theory",
        "sub_topic": "Generators & Iterators",
        "difficulty": "easy",
        "question_text": "What is the primary performance benefit of using a generator expression or `yield` statement over returning a list?",
        "options": [
            "Lazy evaluation with O(1) memory overhead regardless of sequence size",
            "Faster sequential indexing via random access arrays",
            "Compile-time thread safety for concurrent reads",
            "Automatic vectorization on GPU hardware"
        ],
        "correct_option_index": 0,
        "explanation": "Generators compute items on demand (lazy evaluation) and only store the current state and yield value in memory, yielding O(1) auxiliary memory consumption instead of building an entire sequence in RAM.",
        "source": "Curated"
    },
    {
        "domain": "Python",
        "question_type": "theory",
        "sub_topic": "Object Identity vs Equality",
        "difficulty": "easy",
        "question_text": "What is the difference between the `is` keyword and the `==` operator in Python?",
        "options": [
            "`is` checks for object identity (same memory address), whereas `==` checks for value equality",
            "`==` checks for object identity, whereas `is` checks for type equality",
            "`is` invokes `__eq__()`, while `==` compares `id()` values",
            "There is no difference; they are exact aliases in modern Python"
        ],
        "correct_option_index": 0,
        "explanation": "The `is` keyword compares identity: whether two variables point to the exact same object in memory (`id(a) == id(b)`). The `==` operator compares equality: whether two objects hold equivalent values by invoking `__eq__()`.",
        "source": "Curated"
    },
    {
        "domain": "Python",
        "question_type": "theory",
        "sub_topic": "Decorators",
        "difficulty": "medium",
        "question_text": "Why is `@functools.wraps(fn)` commonly applied to the inner wrapper function of a custom decorator?",
        "options": [
            "To preserve the original function's metadata, such as `__name__` and `__doc__`",
            "To automatically memoize return values across function calls",
            "To enforce type annotations on runtime inputs",
            "To ensure the decorator executes on a separate background thread"
        ],
        "correct_option_index": 0,
        "explanation": "`@functools.wraps` copies the function name, docstring, module, and argument signature from the decorated function onto the wrapper, preventing introspection and debugging tools from showing generic wrapper names.",
        "source": "Curated"
    },
    {
        "domain": "Python",
        "question_type": "theory",
        "sub_topic": "Data Structures",
        "difficulty": "easy",
        "question_text": "What is the average time complexity of key lookup in a standard Python `dict`?",
        "options": [
            "O(1)",
            "O(log N)",
            "O(N)",
            "O(N log N)"
        ],
        "correct_option_index": 0,
        "explanation": "Python dictionaries are implemented as dense hash tables using open addressing with quadratic probing, delivering amortized O(1) average time complexity for lookups, insertions, and deletions.",
        "source": "Curated"
    },
    {
        "domain": "Python",
        "question_type": "theory",
        "sub_topic": "Scope & LEGB Rule",
        "difficulty": "medium",
        "question_text": "Which order of scopes does Python search when resolving a variable name (the LEGB rule)?",
        "options": [
            "Local -> Enclosing -> Global -> Built-in",
            "Local -> Global -> Enclosing -> Built-in",
            "Global -> Local -> Enclosing -> Built-in",
            "Built-in -> Global -> Enclosing -> Local"
        ],
        "correct_option_index": 0,
        "explanation": "Python follows the LEGB resolution hierarchy: it searches first in the Local function scope, then Enclosing functions (for nested closures), then Global module scope, and finally Built-in namespace.",
        "source": "Curated"
    },
    {
        "domain": "Python",
        "question_type": "code",
        "sub_topic": "List Slicing",
        "difficulty": "easy",
        "question_text": "What is the output of the following Python code snippet?\n\n```python\nnums = [10, 20, 30, 40, 50]\nprint(nums[::-2])\n```",
        "options": [
            "[50, 30, 10]",
            "[50, 40, 30]",
            "[10, 30, 50]",
            "[40, 20]"
        ],
        "correct_option_index": 0,
        "explanation": "A slice of `[::-2]` steps backwards through the list starting at the last element (50) and taking every second element: 50, then 30, then 10.",
        "source": "Curated"
    },
    {
        "domain": "Python",
        "question_type": "code",
        "sub_topic": "Closures & Late Binding",
        "difficulty": "hard",
        "question_text": "What is the output of the following Python closure snippet?\n\n```python\nfuncs = [lambda: i for i in range(3)]\nprint([f() for f in funcs])\n```",
        "options": [
            "[2, 2, 2]",
            "[0, 1, 2]",
            "[0, 0, 0]",
            "[1, 2, 3]"
        ],
        "correct_option_index": 0,
        "explanation": "Python closures bind variables by reference rather than by value (late binding). When the list comprehension finishes, the variable `i` remains 2. When `f()` is evaluated afterwards, every lambda looks up `i` and evaluates to 2.",
        "source": "Curated"
    },
    {
        "domain": "Python",
        "question_type": "code",
        "sub_topic": "Dictionary Comprehension",
        "difficulty": "easy",
        "question_text": "What is the output of the following dictionary comprehension?\n\n```python\nkeys = ['a', 'b', 'c']\nvals = [1, 2, 3]\nd = {k: v * 2 for k, v in zip(keys, vals) if v % 2 != 0}\nprint(d)\n```",
        "options": [
            "{'a': 2, 'c': 6}",
            "{'a': 2, 'b': 4, 'c': 6}",
            "{'b': 4}",
            "{'a': 1, 'c': 3}"
        ],
        "correct_option_index": 0,
        "explanation": "`zip(keys, vals)` produces ('a', 1), ('b', 2), ('c', 3). The filter `if v % 2 != 0` retains ('a', 1) and ('c', 3). Multiplying the values by 2 yields {'a': 2, 'c': 6}.",
        "source": "Curated"
    },
    {
        "domain": "Python",
        "question_type": "code",
        "sub_topic": "Exception Handling",
        "difficulty": "medium",
        "question_text": "What will this Python block print when executed?\n\n```python\ndef check():\n    try:\n        return 'try'\n    finally:\n        return 'finally'\n\nprint(check())\n```",
        "options": [
            "'finally'",
            "'try'",
            "'tryfinally'",
            "SyntaxError"
        ],
        "correct_option_index": 0,
        "explanation": "A return statement in a `finally` block always takes precedence over return statements inside the `try` or `except` blocks, overriding the earlier return value.",
        "source": "Curated"
    },
    {
        "domain": "Python",
        "question_type": "code",
        "sub_topic": "String Manipulation & Join",
        "difficulty": "easy",
        "question_text": "What is printed by the following string formatting operation?\n\n```python\nwords = ['AI', 'Career', 'OS']\nprint('-'.join(words).lower())\n```",
        "options": [
            "'ai-career-os'",
            "'ai career os'",
            "'aicareeros'",
            "'-ai-career-os-'"
        ],
        "correct_option_index": 0,
        "explanation": "`'-'.join(words)` creates 'AI-Career-OS', and `.lower()` converts every character to lowercase, producing 'ai-career-os'.",
        "source": "Curated"
    },
    {
        "domain": "Python",
        "question_type": "code",
        "sub_topic": "Mutable Default Behavior",
        "difficulty": "medium",
        "question_text": "What is the output of the following function calls?\n\n```python\ndef add(val, items=[]):\n    items.append(val)\n    return items\n\nadd(1)\nprint(add(2))\n```",
        "options": [
            "[1, 2]",
            "[2]",
            "[1]",
            "TypeError"
        ],
        "correct_option_index": 0,
        "explanation": "Because `items=[]` is a mutable default parameter evaluated once at function definition time, both calls mutate the exact same list instance in memory, outputting `[1, 2]`.",
        "source": "Curated"
    },
    {
        "domain": "Python",
        "question_type": "code",
        "sub_topic": "Unpacking Mechanics",
        "difficulty": "easy",
        "question_text": "What is the value of `b` after executing the following extended iterable unpacking?\n\n```python\na, *b, c = [1, 2, 3, 4, 5]\nprint(b)\n```",
        "options": [
            "[2, 3, 4]",
            "(2, 3, 4)",
            "[2, 3, 4, 5]",
            "[1, 2, 3]"
        ],
        "correct_option_index": 0,
        "explanation": "Extended unpacking binds `a` to the first element (1), `c` to the last element (5), and captures all middle elements into a list bound to `*b`, resulting in `[2, 3, 4]`.",
        "source": "Curated"
    }
]

def seed_python():
    conn = sqlite3.connect('placex.db')
    c = conn.cursor()
    
    # Check if Python questions already exist
    existing = c.execute("SELECT COUNT(*) FROM questions WHERE domain = 'Python'").fetchone()[0]
    print(f"Existing Python questions: {existing}")
    
    if existing == 0:
        for q in PYTHON_QUESTIONS:
            c.execute("""
                INSERT INTO questions (domain, question_type, sub_topic, difficulty, question_text, options, correct_option_index, explanation, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                q["domain"],
                q["question_type"],
                q["sub_topic"],
                q["difficulty"],
                q["question_text"],
                json.dumps(q["options"]),
                q["correct_option_index"],
                q["explanation"],
                q["source"]
            ))
        conn.commit()
        print(f"Successfully seeded {len(PYTHON_QUESTIONS)} curated Python questions!")
    else:
        print("Python questions already seeded.")
        
    conn.close()

if __name__ == "__main__":
    seed_python()

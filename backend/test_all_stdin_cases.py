from app.coding_service.judge.judge0_client import Judge0Client

def check(name, code, stdin, expected_in_stdout, expect_error=False, expected_in_stderr=None):
    print(f"=== {name} ===")
    res = Judge0Client.execute_code(code, "python", stdin)
    out = res["stdout"]
    err = res["stderr"]
    print(f"Status: {res['status']}")
    print(f"Stdout:\n{out}")
    if err:
        print(f"Stderr:\n{err}")

    if expect_error:
        assert res["status"] != "Accepted" or (expected_in_stderr and expected_in_stderr in err)
    else:
        assert res["status"] == "Accepted", f"Expected Accepted but got {res['status']}"
        for exp in expected_in_stdout:
            assert exp in out, f"Missing '{exp}' in output!"
    print("PASS\n")

# 1. One input
check(
    "1. One input",
    'age = input("Enter your age: ")\nprint("Your age is:", age)',
    "18",
    ["Enter your age: 18", "Your age is: 18"]
)

# 2. Multiple inputs (Sahil & 21)
check(
    "2. Multiple inputs",
    'name = input("Enter your name: ")\nage = int(input("Enter your age: "))\nprint("Name:", name)\nprint("Age:", age)',
    "Sahil\n21",
    ["Enter your name: Sahil", "Enter your age: 21", "Name: Sahil", "Age: 21"]
)

# 3. Float input
check(
    "3. Float input",
    'score = float(input("Score: "))\nprint("Doubled:", score * 2)',
    "4.5",
    ["Score: 4.5", "Doubled: 9.0"]
)

# 4. Input inside loop
check(
    "4. Loop inputs",
    'total = 0\nfor i in range(3):\n    n = int(input("Num: "))\n    total += n\nprint("Sum:", total)',
    "10\n20\n30",
    ["Num: 10", "Num: 20", "Num: 30", "Sum: 60"]
)

# 5. Program with no input
check(
    "5. No input",
    'print("Hello, World!")',
    "",
    ["Hello, World!"]
)

# 6. Genuine EOFError on insufficient input
check(
    "6. Insufficient input -> EOFError",
    'a = input("First: ")\nb = input("Second: ")',
    "only_one",
    [],
    expect_error=True,
    expected_in_stderr="EOFError"
)

# 7. Runtime error after input
check(
    "7. Runtime error after input",
    'num = int(input("Enter: "))\nres = 100 / num',
    "0",
    [],
    expect_error=True,
    expected_in_stderr="ZeroDivisionError"
)

print("ALL STDIN TESTS PASSED ACCURATELY!")

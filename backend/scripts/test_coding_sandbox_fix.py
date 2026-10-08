import urllib.request
import json
import sys

# Ensure UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8')

def test_coding_sandbox():
    auth_url = "http://localhost:8000/api/v1/auth/login"
    login_payload = json.dumps({"email": "real.student@placex.ai", "password": "SecurePassword123!"}).encode('utf-8')
    req = urllib.request.Request(auth_url, data=login_payload, headers={"Content-Type": "application/json"})
    
    token = None
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            token = data["access_token"]
            print("[+] Successfully authenticated user for Sandbox Test.")
    except Exception as e:
        print(f"[X] Authentication failed: {e}")
        return

    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}

    # TEST 1 — TypeError (input() returns str, num1 is int)
    print("\n--- TEST 1: TypeError (num1 + input()) ---")
    code1 = """num1 = 10
num2 = input("Enter a number: ")
total = num1 + num2
print("The sum is:", total)"""
    
    run_req1 = urllib.request.Request(
        "http://localhost:8000/api/v1/coding/run",
        data=json.dumps({"question_id": 1, "source_code": code1, "language": "python", "custom_input": "5"}).encode('utf-8'),
        headers=headers
    )
    with urllib.request.urlopen(run_req1) as resp:
        res1 = json.loads(resp.read().decode('utf-8'))
        print("Run Status:", res1.get("status"))
        print("Stdout:", repr(res1.get("stdout")))
        print("Stderr snippet:", res1.get("stderr")[:120].strip())
        assert "TypeError" in res1.get("stderr"), "Expected TypeError in stderr"

    debug_req1 = urllib.request.Request(
        "http://localhost:8000/api/v1/coding/ai-debug",
        data=json.dumps({
            "source_code": code1,
            "error_message": res1.get("stderr"),
            "traceback": res1.get("stderr"),
            "stdin_input": "5",
            "language": "python"
        }).encode('utf-8'),
        headers=headers
    )
    with urllib.request.urlopen(debug_req1) as resp:
        debug_res1 = json.loads(resp.read().decode('utf-8'))
        print("Host Agent Error Type:", debug_res1.get("error_type"))
        print("What went wrong:", debug_res1.get("what_went_wrong"))
        print("Corrected code:\n", debug_res1.get("corrected_code"))
        assert debug_res1.get("error_type") == "TypeError"
        assert "int" in debug_res1.get("corrected_code")

    # Run corrected code
    corrected_code1 = debug_res1.get("corrected_code")
    run_corrected1 = urllib.request.Request(
        "http://localhost:8000/api/v1/coding/run",
        data=json.dumps({"question_id": 1, "source_code": corrected_code1, "language": "python", "custom_input": "5"}).encode('utf-8'),
        headers=headers
    )
    with urllib.request.urlopen(run_corrected1) as resp:
        res_corrected1 = json.loads(resp.read().decode('utf-8'))
        print("Run Corrected Status:", res_corrected1.get("status"))
        print("Run Corrected Stdout:", res_corrected1.get("stdout").strip())
        assert res_corrected1.get("status") == "Accepted"
        assert "15" in res_corrected1.get("stdout")

    # TEST 2 — SyntaxError
    print("\n--- TEST 2: SyntaxError (unclosed paren) ---")
    code2 = 'print("Hello"'
    run_req2 = urllib.request.Request(
        "http://localhost:8000/api/v1/coding/run",
        data=json.dumps({"question_id": 1, "source_code": code2, "language": "python"}).encode('utf-8'),
        headers=headers
    )
    with urllib.request.urlopen(run_req2) as resp:
        res2 = json.loads(resp.read().decode('utf-8'))
        print("Run Status:", res2.get("status"))
        assert res2.get("status") == "Compilation Error" or "SyntaxError" in res2.get("stderr")

    # TEST 3 — NameError
    print("\n--- TEST 3: NameError (undefined variable) ---")
    code3 = "print(username)"
    run_req3 = urllib.request.Request(
        "http://localhost:8000/api/v1/coding/run",
        data=json.dumps({"question_id": 1, "source_code": code3, "language": "python"}).encode('utf-8'),
        headers=headers
    )
    with urllib.request.urlopen(run_req3) as resp:
        res3 = json.loads(resp.read().decode('utf-8'))
        print("Run Status:", res3.get("status"))
        assert "NameError" in res3.get("stderr")

    # TEST 4 — ValueError (int("abc"))
    print("\n--- TEST 4: ValueError (invalid integer input) ---")
    code4 = """age = int(input("Age: "))
print("Age is:", age)"""
    run_req4 = urllib.request.Request(
        "http://localhost:8000/api/v1/coding/run",
        data=json.dumps({"question_id": 1, "source_code": code4, "language": "python", "custom_input": "abc"}).encode('utf-8'),
        headers=headers
    )
    with urllib.request.urlopen(run_req4) as resp:
        res4 = json.loads(resp.read().decode('utf-8'))
        print("Run Status:", res4.get("status"))
        assert "ValueError" in res4.get("stderr")

    # TEST 5 — Correct Program
    print("\n--- TEST 5: Correct Program ---")
    code5 = """num1 = 10
num2 = int(input())
print(num1 + num2)"""
    run_req5 = urllib.request.Request(
        "http://localhost:8000/api/v1/coding/run",
        data=json.dumps({"question_id": 1, "source_code": code5, "language": "python", "custom_input": "5"}).encode('utf-8'),
        headers=headers
    )
    with urllib.request.urlopen(run_req5) as resp:
        res5 = json.loads(resp.read().decode('utf-8'))
        print("Run Status:", res5.get("status"))
        print("Output:", res5.get("stdout").strip())
        assert res5.get("status") == "Accepted"
        assert res5.get("stdout").strip() == "15"

    # TEST 6 — Multiple Inputs
    print("\n--- TEST 6: Multiple Inputs (10 \\n 20) ---")
    code6 = """a = int(input())
b = int(input())
print(a + b)"""
    run_req6 = urllib.request.Request(
        "http://localhost:8000/api/v1/coding/run",
        data=json.dumps({"question_id": 1, "source_code": code6, "language": "python", "custom_input": "10\n20"}).encode('utf-8'),
        headers=headers
    )
    with urllib.request.urlopen(run_req6) as resp:
        res6 = json.loads(resp.read().decode('utf-8'))
        print("Run Status:", res6.get("status"))
        print("Output:", res6.get("stdout").strip())
        assert res6.get("status") == "Accepted"
        assert res6.get("stdout").strip() == "30"

    print("\n==============================================")
    print(" ALL 6 CODING SANDBOX TESTS PASSED SUCCESSFULLY! ")
    print("==============================================")

if __name__ == "__main__":
    test_coding_sandbox()

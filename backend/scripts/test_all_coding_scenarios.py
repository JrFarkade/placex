import urllib.request
import json
import sys

# Ensure UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8')

def test_all_coding_scenarios():
    auth_url = "http://localhost:8000/api/v1/auth/login"
    login_payload = json.dumps({"email": "real.student@placex.ai", "password": "SecurePassword123!"}).encode('utf-8')
    req = urllib.request.Request(auth_url, data=login_payload, headers={"Content-Type": "application/json"})
    
    token = None
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            token = data["access_token"]
            print("[+] Successfully authenticated user for All Coding Scenarios Test.")
    except Exception as e:
        print(f"[X] Authentication failed: {e}")
        return

    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}

    # TEST 1 — NameError
    print("\n--- TEST 1: NameError (print(nam)) ---")
    code1 = 'name = "Sahil"\nprint(nam)'
    run1 = urllib.request.Request("http://localhost:8000/api/v1/coding/run", data=json.dumps({"question_id": 1, "source_code": code1, "language": "python"}).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(run1) as resp:
        res1 = json.loads(resp.read().decode('utf-8'))
        print("Run Status:", res1.get("status"))
        assert "NameError" in res1.get("stderr")
    
    debug1 = urllib.request.Request("http://localhost:8000/api/v1/coding/ai-debug", data=json.dumps({"source_code": code1, "error_message": res1.get("stderr"), "traceback": res1.get("stderr"), "language": "python"}).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(debug1) as resp:
        d1 = json.loads(resp.read().decode('utf-8'))
        print("Host Agent Error Type:", d1.get("error_type"))
        print("What went wrong:", d1.get("what_went_wrong"))
        print("Fixed Code:", repr(d1.get("corrected_code")))
        assert d1.get("error_type") == "NameError"
        assert d1.get("is_valid") == True

    # TEST 2 — SyntaxError
    print("\n--- TEST 2: SyntaxError (for i in range(5)) ---")
    code2 = 'for i in range(5)\n    print(i)'
    run2 = urllib.request.Request("http://localhost:8000/api/v1/coding/run", data=json.dumps({"question_id": 1, "source_code": code2, "language": "python"}).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(run2) as resp:
        res2 = json.loads(resp.read().decode('utf-8'))
        print("Run Status:", res2.get("status"))
        assert "SyntaxError" in res2.get("stderr") or res2.get("status") == "Compilation Error"

    debug2 = urllib.request.Request("http://localhost:8000/api/v1/coding/ai-debug", data=json.dumps({"source_code": code2, "error_message": res2.get("stderr"), "traceback": res2.get("stderr"), "language": "python"}).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(debug2) as resp:
        d2 = json.loads(resp.read().decode('utf-8'))
        print("Host Agent Error Type:", d2.get("error_type"))
        print("Fixed Code:", repr(d2.get("corrected_code")))
        assert d2.get("error_type") == "SyntaxError"
        assert d2.get("is_valid") == True

    # TEST 3 — IndexError
    print("\n--- TEST 3: IndexError (numbers[5]) ---")
    code3 = 'numbers = [10, 20, 30]\nprint(numbers[5])'
    run3 = urllib.request.Request("http://localhost:8000/api/v1/coding/run", data=json.dumps({"question_id": 1, "source_code": code3, "language": "python"}).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(run3) as resp:
        res3 = json.loads(resp.read().decode('utf-8'))
        print("Run Status:", res3.get("status"))
        assert "IndexError" in res3.get("stderr")

    debug3 = urllib.request.Request("http://localhost:8000/api/v1/coding/ai-debug", data=json.dumps({"source_code": code3, "error_message": res3.get("stderr"), "traceback": res3.get("stderr"), "language": "python"}).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(debug3) as resp:
        d3 = json.loads(resp.read().decode('utf-8'))
        print("Host Agent Error Type:", d3.get("error_type"))
        assert d3.get("error_type") == "IndexError"

    # TEST 4 — ZeroDivisionError
    print("\n--- TEST 4: ZeroDivisionError (10 / 0) ---")
    code4 = 'a = 10\nb = 0\nprint(a / b)'
    run4 = urllib.request.Request("http://localhost:8000/api/v1/coding/run", data=json.dumps({"question_id": 1, "source_code": code4, "language": "python"}).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(run4) as resp:
        res4 = json.loads(resp.read().decode('utf-8'))
        print("Run Status:", res4.get("status"))
        assert "ZeroDivisionError" in res4.get("stderr")

    # TEST 5 — TypeError
    print("\n--- TEST 5: TypeError (num1 + num2 string) ---")
    code5 = 'num1 = 10\nnum2 = "5"\nprint(num1 + num2)'
    run5 = urllib.request.Request("http://localhost:8000/api/v1/coding/run", data=json.dumps({"question_id": 1, "source_code": code5, "language": "python"}).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(run5) as resp:
        res5 = json.loads(resp.read().decode('utf-8'))
        print("Run Status:", res5.get("status"))
        assert "TypeError" in res5.get("stderr")

    # TEST 6 — Single Input
    print("\n--- TEST 6: Single Input (input() + int()) ---")
    code6 = 'num1 = 10\nnum2 = input("Enter a number: ")\ntotal = num1 + int(num2)\nprint("The sum is:", total)'
    run6 = urllib.request.Request("http://localhost:8000/api/v1/coding/run", data=json.dumps({"question_id": 1, "source_code": code6, "language": "python", "custom_input": "5"}).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(run6) as resp:
        res6 = json.loads(resp.read().decode('utf-8'))
        print("Run Status:", res6.get("status"))
        print("Stdout:", res6.get("stdout").strip())
        assert res6.get("status") == "Accepted"
        assert "15" in res6.get("stdout")

    # TEST 7 — Multiple Inputs
    print("\n--- TEST 7: Multiple Inputs (name & age) ---")
    code7 = 'name = input("Enter your name: ")\nage = input("Enter your age: ")\nprint("Name:", name)\nprint("Age:", age)'
    run7 = urllib.request.Request("http://localhost:8000/api/v1/coding/run", data=json.dumps({"question_id": 1, "source_code": code7, "language": "python", "custom_input": "Alice\n25"}).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(run7) as resp:
        res7 = json.loads(resp.read().decode('utf-8'))
        print("Run Status:", res7.get("status"))
        print("Stdout:\n", res7.get("stdout").strip())
        assert res7.get("status") == "Accepted"
        assert "Alice" in res7.get("stdout")
        assert "25" in res7.get("stdout")

    # TEST 8 — Correct Code
    print("\n--- TEST 8: Correct Code (a = 10, b = 20) ---")
    code8 = 'a = 10\nb = 20\nprint(a + b)'
    run8 = urllib.request.Request("http://localhost:8000/api/v1/coding/run", data=json.dumps({"question_id": 1, "source_code": code8, "language": "python"}).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(run8) as resp:
        res8 = json.loads(resp.read().decode('utf-8'))
        print("Run Status:", res8.get("status"))
        print("Stdout:", res8.get("stdout").strip())
        assert res8.get("status") == "Accepted"
        assert res8.get("stdout").strip() == "30"

    print("\n================================================")
    print(" ALL 8 CODING SCENARIO TESTS PASSED SUCCESSFULLY ")
    print("================================================")

if __name__ == "__main__":
    test_all_coding_scenarios()

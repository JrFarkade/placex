import requests
from app.core.security import create_access_token

BASE_URL = "http://127.0.0.1:8000"
token = create_access_token(subject="1")
headers = {"Authorization": f"Bearer {token}"}

print("=== TESTING ROADMAP HOST AGENT INTEGRATION ===")

# Test 1: Explain Week 1 (Data Science, Beginner)
payload1 = {
    "branch": "Data Science",
    "level": "Beginner",
    "week_number": 1,
    "week_title": "Python Programming Foundations and Computational Problem Solving",
    "prerequisites": "Basic mathematical reasoning and analytical thinking",
    "completion_criteria": "Build console-based computational tools using functions and data structures"
}

res1 = requests.post(f"{BASE_URL}/api/v1/agent/explain/roadmap-week", json=payload1, headers=headers)
print("Test 1 Status Code:", res1.status_code)
assert res1.status_code == 200, f"Failed: {res1.text}"
data1 = res1.json()
print("  Branch:", data1.get("branch"))
print("  Week:", data1.get("week_number"))
print("  Explanation (preview):", data1.get("explanation", "")[:120], "...")
print("  Key Concepts:", data1.get("key_concepts"))
print("  Exercises:", data1.get("practical_exercises"))
assert data1.get("status") == "success"
assert len(data1.get("key_concepts", [])) > 0
print("PASS: Week 1 explained dynamically!\n")

# Test 2: Follow-up question about Week 1
payload2 = {
    **payload1,
    "user_question": "What should I practice first to master this week?"
}
res2 = requests.post(f"{BASE_URL}/api/v1/agent/explain/roadmap-week", json=payload2, headers=headers)
print("Test 2 Status Code:", res2.status_code)
assert res2.status_code == 200, f"Failed: {res2.text}"
data2 = res2.json()
print("  Answer to question (preview):", data2.get("answer", "")[:150], "...")
assert data2.get("answer")
print("PASS: Week 1 question answered with week context!\n")

# Test 3: Switch to Week 2 and ask a question
payload3 = {
    "branch": "Data Science",
    "level": "Beginner",
    "week_number": 2,
    "week_title": "Data Structures, Algorithms and Complexity Analysis",
    "prerequisites": "Python Foundations (Week 1)",
    "completion_criteria": "Implement custom stack, queue, and benchmark lookup complexity",
    "user_question": "Give me five practice problems."
}
res3 = requests.post(f"{BASE_URL}/api/v1/agent/explain/roadmap-week", json=payload3, headers=headers)
print("Test 3 Status Code:", res3.status_code)
assert res3.status_code == 200, f"Failed: {res3.text}"
data3 = res3.json()
print("  Week 2 Answer (preview):", data3.get("answer", "")[:150], "...")
assert data3.get("week_number") == 2
print("PASS: Week 2 context switch verified!\n")

# Test 4: Different branch and level (Cybersecurity, Intermediate, Week 10)
payload4 = {
    "branch": "Cybersecurity",
    "level": "Intermediate",
    "week_number": 10,
    "week_title": "Network Packet Analysis and Intrusion Detection Systems",
    "prerequisites": "TCP/IP Fundamentals and Linux Networking",
    "completion_criteria": "Analyze PCAP files using Wireshark and write Snort detection rules"
}
res4 = requests.post(f"{BASE_URL}/api/v1/agent/explain/roadmap-week", json=payload4, headers=headers)
print("Test 4 Status Code:", res4.status_code)
assert res4.status_code == 200, f"Failed: {res4.text}"
data4 = res4.json()
print("  Cybersecurity Explanation (preview):", data4.get("explanation", "")[:120], "...")
assert data4.get("status") == "success"
print("PASS: Dynamic across branches and levels verified!\n")

print("ALL ROADMAP HOST AGENT BACKEND TESTS PASSED!")

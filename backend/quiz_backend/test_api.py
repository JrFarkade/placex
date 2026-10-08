import httpx
import json

client = httpx.Client(base_url="http://localhost:8000")

# 1. Health check
r_health = client.get("/health")
print("=== Health Check ===")
print(r_health.status_code, r_health.json())

# 2. Domains
r_domains = client.get("/api/quiz/domains")
print("\n=== Supported Domains & Types ===")
print(r_domains.status_code, r_domains.json())

# 3. Start Quiz with question_type='code'
payload_code = {
    "user_id": "alice",
    "domains": ["AIML", "SoftwareEngineering", "DataScience", "CyberSecurity"],
    "question_type": "code",
    "num_questions": 6,
}
r_quiz_code = client.post("/api/quiz/start", json=payload_code)
print("\n=== Start Code Quiz ===")
print("Status:", r_quiz_code.status_code)
quiz_data = r_quiz_code.json()
print("Quiz ID:", quiz_data["quiz_id"])
print("Total Questions:", quiz_data["total_questions"])
for q in quiz_data["questions"]:
    snippet = q["question_text"].split("\n")[0]
    print(f"- [{q['domain']} | {q['question_type']}] {snippet}")

# 4. Start Quiz with question_type='theory'
payload_theory = {
    "user_id": "alice",
    "domains": ["AIML", "CyberSecurity"],
    "question_type": "theory",
    "num_questions": 4,
}
r_quiz_theory = client.post("/api/quiz/start", json=payload_theory)
print("\n=== Start Theory Quiz ===")
print("Status:", r_quiz_theory.status_code)
for q in r_quiz_theory.json()["questions"]:
    snippet = q["question_text"].split("\n")[0]
    print(f"- [{q['domain']} | {q['question_type']}] {snippet}")

# 5. Submit Answers
first_q = quiz_data["questions"][0]
second_q = quiz_data["questions"][1]
submit_payload = {
    "quiz_id": quiz_data["quiz_id"],
    "user_id": "alice",
    "domains": ["AIML", "SoftwareEngineering", "DataScience", "CyberSecurity"],
    "answers": [
        {"question_id": first_q["id"], "selected_option_index": 1},
        {"question_id": second_q["id"], "selected_option_index": 0},
    ],
}
r_submit = client.post("/api/quiz/submit", json=submit_payload)
print("\n=== Submit Quiz ===")
print("Status:", r_submit.status_code)
submit_data = r_submit.json()
print(f"Score: {submit_data['score']}/{submit_data['total_questions']} ({submit_data['percentage']}%)")
print("First question explanation snippet:", submit_data["answer_key"][0]["explanation"][:80])

# 6. Dashboard
r_dash = client.get("/api/quiz/dashboard/alice")
print("\n=== User Dashboard ===")
print(r_dash.status_code, json.dumps(r_dash.json(), indent=2))

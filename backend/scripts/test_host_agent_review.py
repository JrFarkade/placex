import urllib.request
import json
import sys

# Ensure UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8')

def test_agent_review():
    auth_url = "http://localhost:8000/api/v1/auth/login"
    login_payload = json.dumps({"email": "real.student@placex.ai", "password": "SecurePassword123!"}).encode('utf-8')
    req = urllib.request.Request(auth_url, data=login_payload, headers={"Content-Type": "application/json"})
    
    token = None
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            token = data["access_token"]
            print("[+] Successfully authenticated user 'real.student@placex.ai'")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    # 1. Test ATS review endpoint
    ats_payload = json.dumps({
        "ats_score": 76.5,
        "doc_type": "TEXT_RESUME",
        "section_scores": {
            "Contact Information": 100,
            "Education": 90,
            "Skills": 85,
            "Experience & Projects": 60
        },
        "suggestions": ["Add quantifiable metrics to bullet points in Experience section."]
    }).encode('utf-8')

    req_ats = urllib.request.Request(
        "http://localhost:8000/api/v1/agent/review/ats",
        data=ats_payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    )

    try:
        with urllib.request.urlopen(req_ats) as resp:
            review_res = json.loads(resp.read().decode('utf-8'))
            print("\n==============================================")
            print(" HOST AGENT ATS REVIEW OUTPUT (4-QUESTION FRAMEWORK)")
            print("==============================================")
            print("Status:", review_res.get("status"))
            print("WHAT:", review_res.get("what"))
            print("WHY:", review_res.get("why"))
            print("SO WHAT:", review_res.get("so_what"))
            print("NOW WHAT:", review_res.get("now_what"))
            print("Recommendations:", review_res.get("recommendations"))
            print("Navigation Actions:", review_res.get("navigate_actions"))
            print("==============================================\n")
            print("[+] Host Agent ATS review endpoint verified successfully!")
    except Exception as e:
        print(f"[X] ATS Review endpoint test failed: {e}")

    # 2. Test Job Match review endpoint
    jd_payload = json.dumps({
        "match_score": 68.0,
        "exact_keyword_match_score": 50.0,
        "semantic_similarity_score": 72.0,
        "matching_skills": ["Python", "SQL", "Git"],
        "missing_skills": ["FastAPI", "Docker", "PostgreSQL"],
        "job_description": "We are seeking a Backend Engineer skilled in FastAPI, Docker, and PostgreSQL..."
    }).encode('utf-8')

    req_jd = urllib.request.Request(
        "http://localhost:8000/api/v1/agent/review/jd-match",
        data=jd_payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    )

    try:
        with urllib.request.urlopen(req_jd) as resp:
            jd_res = json.loads(resp.read().decode('utf-8'))
            print("\n==============================================")
            print(" HOST AGENT JD MATCH REVIEW OUTPUT")
            print("==============================================")
            print("Status:", jd_res.get("status"))
            print("WHAT:", jd_res.get("what"))
            print("WHY:", jd_res.get("why"))
            print("SO WHAT:", jd_res.get("so_what"))
            print("NOW WHAT:", jd_res.get("now_what"))
            print("Recommendations:", jd_res.get("recommendations"))
            print("Navigation Actions:", jd_res.get("navigate_actions"))
            print("==============================================\n")
            print("[+] Host Agent JD Match review endpoint verified successfully!")
    except Exception as e:
        print(f"[X] JD Match Review endpoint test failed: {e}")

if __name__ == "__main__":
    test_agent_review()

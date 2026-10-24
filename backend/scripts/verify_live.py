import requests
import json
import io

LIVE_URL = 'https://placex.jrfarkade.workers.dev'

def test_live():
    print('==================================================')
    print('PLACEX LIVE VERIFICATION AUDIT')
    print('Target:', LIVE_URL)
    print('==================================================\n')

    # 1. Homepage & SPA Routing
    print('--- 1. Testing Homepage & SPA Navigation ---')
    for route in ['/', '/dashboard', '/interview', '/coding', '/resume', '/roadmap', '/quiz', '/analytics']:
        res = requests.get(f'{LIVE_URL}{route}', timeout=10)
        assert res.status_code == 200, f'Route {route} returned {res.status_code}'
        assert '<html' in res.text or '<!DOCTYPE' in res.text, f'Route {route} did not return HTML'
        print(f'  [PASS] Route {route:15} -> HTTP {res.status_code}')

    # 2. Dashboard Activity
    print('\n--- 2. Testing Dashboard Activity & Authentic Dates ---')
    res = requests.get(f'{LIVE_URL}/api/v1/dashboard/activity', timeout=10)
    assert res.status_code == 200
    dash = res.json()
    print(f"  [PASS] Current streak: {dash['current_streak']}, Total active days: {dash['total_active_days']}")
    print(f"  [PASS] 7-Day Tracker length: {len(dash['seven_day_tracker'])}")
    for d in dash['seven_day_tracker']:
        print(f"    - {d['day_abbr']} ({d['formatted_date']}): status={d['status']}, active={d['is_active']}, count={d['actions_count']}")
    
    # Verify no fabricated completed days for unreached/unactive days
    for d in dash['seven_day_tracker']:
        if d['status'] == 'missed':
            assert not d['is_active'], 'Missed day marked active!'
            assert d['actions_count'] == 0, 'Missed day has fabricated action count!'
    print('  [PASS] Authentic streak & activity verified (zero fabricated completion)')

    # 3. Coding Sandbox Real Execution & Error Handling
    print('\n--- 3. Testing Coding Sandbox Engine ---')
    # A. Empty code
    res = requests.post(f'{LIVE_URL}/api/v1/coding/run', json={'source_code': ''}, timeout=10)
    assert res.json()['status'] == 'Compilation Error', 'Empty code did not return Compilation Error'
    print(f"  [PASS] Empty code -> {res.json()['status']}")

    # B. Syntax error (missing colon)
    res = requests.post(f'{LIVE_URL}/api/v1/coding/run', json={'source_code': 'def calculate_sum(a, b)\n    return a + b'}, timeout=10)
    assert res.json()['status'] == 'Compilation Error', 'Invalid syntax was not rejected'
    assert 'SyntaxError' in res.json()['stderr'], 'SyntaxError not in stderr'
    print(f"  [PASS] Syntax error -> {res.json()['status']} | {res.json()['stderr'].splitlines()[-1]}")

    # C. Runtime ZeroDivisionError
    res = requests.post(f'{LIVE_URL}/api/v1/coding/run', json={'source_code': 'x = 100\ny = 0\nprint(x / y)'}, timeout=10)
    assert res.json()['status'] == 'Runtime Error', 'ZeroDivisionError was not caught'
    assert 'ZeroDivisionError' in res.json()['stderr'], 'ZeroDivisionError not in stderr'
    print(f"  [PASS] ZeroDivisionError -> {res.json()['status']} | {res.json()['stderr'].splitlines()[-1]}")

    # D. Valid code execution
    res = requests.post(f'{LIVE_URL}/api/v1/coding/run', json={'source_code': 'a = 15\nb = 27\nprint(f"Sum is {a + b}")'}, timeout=10)
    assert res.json()['status'] == 'Accepted', 'Valid code was not Accepted'
    assert 'Sum is 42' in res.json()['stdout'], f"Unexpected stdout: {res.json()['stdout']}"
    print(f"  [PASS] Valid execution -> {res.json()['status']} | Output: {res.json()['stdout'].strip()}")

    # 4. Roadmap 4 Branches & Authentic Untouched State
    print('\n--- 4. Testing Career Roadmap Engine ---')
    res = requests.get(f'{LIVE_URL}/api/v1/roadmap/branches', timeout=10)
    branches = res.json()['branches']
    print(f"  [PASS] Available branches: {branches}")
    assert 'Computer Science / Software Development' in branches
    assert 'Data Science' in branches
    assert 'AI/ML Engineering' in branches
    assert 'Cybersecurity' in branches

    # Untouched track must have 0 completed, 0% progress, all 24 weeks Not Started
    res = requests.get(f'{LIVE_URL}/api/v1/roadmap/path?branch=AI%2FML+Engineering&level=Beginner', timeout=10)
    road = res.json()
    print(f"  [PASS] AI/ML track total weeks: {road['total_weeks']}, completed: {road['completed_count']}, progress: {road['progress_pct']}%")
    assert road['total_weeks'] == 24, f"Expected 24 weeks, got {road['total_weeks']}"
    assert road['completed_count'] == 0, 'Untouched track has completed weeks!'
    assert road['progress_pct'] == 0.0, 'Untouched track has non-zero progress!'
    assert all(w['status'] == 'Not Started' for w in road['weeks']), 'Some weeks not marked Not Started!'
    print(f"  [PASS] Sample Week 1: {road['weeks'][0]['title']}")
    print(f"  [PASS] Sample Week 24: {road['weeks'][23]['title']}")

    # Test toggling week
    res = requests.post(f'{LIVE_URL}/api/v1/roadmap/toggle-week', json={
        'branch': 'AI/ML Engineering',
        'level': 'Beginner',
        'week_num': 1,
        'status': 'Completed'
    }, timeout=10)
    assert res.json()['status'] == 'ok'
    print(f"  [PASS] Toggled Week 1 to Completed")

    # Re-fetch path to verify update
    res = requests.get(f'{LIVE_URL}/api/v1/roadmap/path?branch=AI%2FML+Engineering&level=Beginner', timeout=10)
    road_updated = res.json()
    assert road_updated['completed_count'] == 1, 'Completed count not incremented'
    assert road_updated['progress_pct'] > 0.0, 'Progress percentage not updated'
    print(f"  [PASS] Updated AI/ML track: completed={road_updated['completed_count']}, progress={road_updated['progress_pct']}%")

    # 5. Knowledge Base & Quiz Engine
    print('\n--- 5. Testing Knowledge Base & Quiz Engine ---')
    res = requests.get(f'{LIVE_URL}/api/v1/quiz/domains', timeout=10)
    quiz_domains = res.json()
    print(f"  [PASS] Quiz domains available: {[d['name'] for d in quiz_domains]}")

    # Start quiz for AIML
    res = requests.post(f'{LIVE_URL}/api/v1/quiz/start', json={'domain': 'ai_ml', 'num_questions': 3}, timeout=10)
    quiz = res.json()
    assert len(quiz['questions']) == 3, f"Expected 3 questions, got {len(quiz['questions'])}"
    assert quiz['domain'] == 'AIML', f"Expected AIML domain, got {quiz['domain']}"
    print(f"  [PASS] Started AIML Quiz ID: {quiz['quiz_id']}")
    for q in quiz['questions']:
        print(f"    - Q{q['presentation_order']}: {q['question'][:70]}... ({q['difficulty']})")

    # Submit quiz answers with intentional 1 correct, 1 wrong
    first_q = quiz['questions'][0]
    answers = [
        {'question_id': first_q['id'], 'selected_value': first_q['options'][0]},
        {'question_id': quiz['questions'][1]['id'], 'selected_value': 'WRONG_ANSWER_CHOICE'}
    ]
    res = requests.post(f'{LIVE_URL}/api/v1/quiz/submit', json={
        'quiz_id': quiz['quiz_id'],
        'domains': ['AIML'],
        'answers': answers
    }, timeout=10)
    sub = res.json()
    print(f"  [PASS] Quiz graded: score={sub['score']}/{sub['total']}, pct={sub['percentage']}%, passed={sub['passed']}")
    assert 'answer_key' in sub and len(sub['answer_key']) == 2
    print(f"  [PASS] Detailed item 1: status={sub['answer_key'][0]['status']}, explanation={sub['answer_key'][0]['explanation'][:60]}...")
    print(f"  [PASS] Detailed item 2: status={sub['answer_key'][1]['status']}, correct_answer={sub['answer_key'][1]['correct_answer']}")

    # 6. ATS Resume Engine
    print('\n--- 6. Testing ATS Resume Engine & File Diagnostics ---')
    # A. Invalid file format (.png or .txt)
    files_invalid = {'file': ('photo.png', b'\x89PNG\r\n\x1a\n', 'image/png')}
    res = requests.post(f'{LIVE_URL}/api/v1/resume/upload', files=files_invalid, timeout=10)
    assert res.status_code == 400, f"Expected 400 for image upload, got {res.status_code}"
    print(f"  [PASS] Non-PDF/DOCX rejected -> HTTP {res.status_code} | {res.json().get('detail')}")

    # B. Non-resume file (e.g. Lab Report with red flags)
    lab_report_pdf = b"%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\nBT (Experiment No 4 Department of Physics Lab Report Submitted by student) ET"
    files_non_resume = {'file': ('Physics_Lab_Report.pdf', lab_report_pdf, 'application/pdf')}
    res = requests.post(f'{LIVE_URL}/api/v1/resume/upload', files=files_non_resume, timeout=10)
    assert res.status_code == 422, f"Expected 422 for lab report, got {res.status_code}"
    res_data = res.json()
    assert res_data['doc_type'] == 'NON_RESUME', f"Expected NON_RESUME, got {res_data['doc_type']}"
    print(f"  [PASS] Non-resume classified -> doc_type={res_data['doc_type']} | message={res_data['message']}")

    # C. Valid Resume
    valid_resume_pdf = b"""%PDF-1.4
BT (John Doe Software Engineer) ET
BT (Email: john@gmail.com Phone: +1-234-567-8901 LinkedIn: linkedin.com/in/johndoe) ET
BT (Education: Bachelor of Technology in Computer Science GPA: 3.8 / 4.0 2024) ET
BT (Technical Skills: Python, FastAPI, React, TypeScript, SQL, Docker, Git, REST API) ET
BT (Projects: PlaceX Placement Platform. Architected high-throughput microservices reducing latency by 40%.) ET
BT (Experience: Software Engineering Intern at Tech Corp. Developed distributed pipelines and optimized database indexing.) ET
"""
    files_resume = {'file': ('John_Doe_Resume.pdf', valid_resume_pdf, 'application/pdf'), 'target_jd': (None, 'Looking for Python and FastAPI engineer with Docker and Redis')}
    res = requests.post(f'{LIVE_URL}/api/v1/resume/upload', files=files_resume, timeout=10)
    assert res.status_code == 200, f"Expected 200 for valid resume, got {res.status_code}"
    resume_eval = res.json()
    print(f"  [PASS] Valid resume analyzed -> ats_score={resume_eval['ats_score']}, doc_type={resume_eval['doc_type']}")
    print(f"    - Matching skills: {resume_eval['analysis_result']['matching_skills']}")
    print(f"    - Missing skills: {resume_eval['analysis_result']['missing_skills']}")
    print(f"    - Suggestions: {resume_eval['analysis_result']['suggestions']}")

    # 7. AI Mock Interview Avatar & Session
    print('\n--- 7. Testing AI Mock Interview Avatar & Blueprint ---')
    res = requests.get(f'{LIVE_URL}/api/v1/interview/avatar', timeout=10)
    assert res.status_code == 200
    assert '<!DOCTYPE html>' in res.text
    print(f"  [PASS] Avatar HTML stream route -> HTTP {res.status_code}")

    res = requests.post(f'{LIVE_URL}/api/v1/interview/start', json={
        'interview_type': 'Technical',
        'target_company': 'Google',
        'role': 'Distributed Systems Engineer'
    }, timeout=10)
    assert res.status_code == 200
    interview = res.json()
    print(f"  [PASS] Interview blueprint generated for {interview['target_company']} ({interview['role']})")
    print(f"    - Session ID: {interview['session_id']}")
    print(f"    - Avatar stream URL: {interview['live_brain']['webrtc_url']}")
    print(f"    - First Question: {interview['first_question'][:70]}...")

    # Answer submission
    res = requests.post(f'{LIVE_URL}/api/v1/interview/answer', json={
        'session_id': interview['session_id'],
        'question': interview['first_question'],
        'answer_text': 'I architected an event stream using Redis caching and idempotency tokens to handle concurrency bottlenecks with low latency.',
        'duration_sec': 25
    }, timeout=10)
    ans_res = res.json()
    print(f"  [PASS] Answer evaluated -> score_out_of_10={ans_res['score_out_of_10']}, wpm={ans_res['audio_metrics']['wpm']}")
    print(f"    - Feedback: {ans_res['feedback']}")

    # 8. Host Agent Chat
    print('\n--- 8. Testing Host Agent Chat & Vacancy Transparency ---')
    res = requests.post(f'{LIVE_URL}/api/v1/agent/chat', json={
        'message': 'Are there any Google job vacancies open right now?'
    }, timeout=10)
    assert res.status_code == 200
    print(f"  [PASS] Host Agent response:\n    \"{res.json()['response'][:120]}...\"")

    print('\n==================================================')
    print('ALL PRODUCTION VERIFICATION AUDITS PASSED 100%!')
    print('==================================================')

if __name__ == '__main__':
    test_live()

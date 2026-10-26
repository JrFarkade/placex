import requests
import json
import sys

LIVE_URL = 'https://placex.jrfarkade.workers.dev'

def test_interview_parity():
    print('================================================================')
    print('PLACEX AI MOCK INTERVIEW PRODUCTION PARITY AUDIT')
    print('Target:', LIVE_URL)
    print('================================================================\n')

    # 1. Verify Avatar Connected Dashboard HTML Route
    print('--- 1. Testing /api/v1/interview/avatar ---')
    res = requests.get(f'{LIVE_URL}/api/v1/interview/avatar?company=Google&role=Staff+Software+Engineer', timeout=10)
    assert res.status_code == 200, f'Avatar route failed: HTTP {res.status_code}'
    html = res.text

    # Verify Key Dashboard Elements
    checks = [
        ('Bot Video Panel', 'id="simli-video"'),
        ('Bot Audio Visualizer', 'class="waveform-bars"'),
        ('Conversation Panel', 'class="panel-card conversation-panel"'),
        ('Events Panel (RTVI)', 'RTVI Stream'),
        ('Status Sidebar', 'class="status-sidebar"'),
        ('Agent Readiness', 'Agent Readiness'),
        ('Device Telemetry', 'Device Telemetry'),
        ('Single Audio Tag', 'id="bot-audio"'),
        ('Target Company Binding', 'Google'),
        ('Target Role Binding', 'Staff Software Engineer'),
        ('RTVI Ready Event', 'RTVI_READY')
    ]

    for name, pattern in checks:
        assert pattern in html, f'Missing required dashboard component: {name} (pattern: {pattern})'
        print(f'  [PASS] {name:25} found in production avatar page')

    # 2. Verify ElevenLabs TTS endpoint single stream
    print('\n--- 2. Testing /api/v1/interview/tts (Voice Output) ---')
    sample_text = "Welcome to PlaceX. Can you explain how you design distributed fault-tolerant systems?"
    tts_res = requests.post(f'{LIVE_URL}/api/v1/interview/tts', json={'text': sample_text}, timeout=15)
    assert tts_res.status_code == 200, f'TTS returned {tts_res.status_code}'
    content_type = tts_res.headers.get('content-type', '')
    assert 'audio' in content_type or len(tts_res.content) > 1000, f'Invalid audio response: {content_type}, {len(tts_res.content)} bytes'
    print(f'  [PASS] Audio stream received: {len(tts_res.content)} bytes ({content_type})')

    # 3. Verify Simli Session Route
    print('\n--- 3. Testing /api/v1/interview/simli-session ---')
    simli_res = requests.get(f'{LIVE_URL}/api/v1/interview/simli-session', timeout=10)
    assert simli_res.status_code == 200, f'Simli session returned {simli_res.status_code}'
    simli_data = simli_res.json()
    print(f'  [PASS] Simli session endpoint operational: available={simli_data.get("available")}')

    # 4. Verify Interview Start Blueprint
    print('\n--- 4. Testing /api/v1/interview/start ---')
    start_res = requests.post(f'{LIVE_URL}/api/v1/interview/start', json={
        'interview_type': 'Technical',
        'target_company': 'Google',
        'role': 'Staff Software Engineer',
        'difficulty': 'Staff / Principal',
        'domain_interests': ['Distributed Systems', 'System Architecture']
    }, timeout=10)
    assert start_res.status_code == 200, f'Interview start returned {start_res.status_code}'
    data = start_res.json()
    assert 'session_id' in data, 'Missing session_id'
    assert 'questions' in data and len(data['questions']) > 0, 'Missing questions blueprint'
    assert 'live_brain' in data and 'webrtc_url' in data['live_brain'], 'Missing live_brain webrtc_url'
    print(f'  [PASS] Session ID: {data["session_id"]}')
    print(f'  [PASS] Questions count: {len(data["questions"])}')
    print(f'  [PASS] Live brain WebRTC URL: {data["live_brain"]["webrtc_url"]}')
    print(f'  [PASS] First Question: "{data["questions"][0][:80]}..."')

    # 5. Verify Answer Evaluation Pipeline
    print('\n--- 5. Testing /api/v1/interview/answer ---')
    ans_res = requests.post(f'{LIVE_URL}/api/v1/interview/answer', json={
        'session_id': data['session_id'],
        'question': data['questions'][0],
        'answer_text': 'I designed a distributed consensus ring using Raft protocol with partition tolerance and zero-copy gossip protocols.',
        'duration_sec': 32.5
    }, timeout=12)
    assert ans_res.status_code == 200, f'Answer evaluation returned {ans_res.status_code}'
    eval_data = ans_res.json()
    assert 'score_out_of_10' in eval_data, 'Missing score_out_of_10'
    print(f'  [PASS] Answer scored: {eval_data["score_out_of_10"]}/10 | Feedback: {eval_data.get("feedback")[:90]}...')

    # 6. Verify Session Teardown
    print('\n--- 6. Testing /api/v1/interview/teardown ---')
    tear_res = requests.post(f'{LIVE_URL}/api/v1/interview/teardown', json={}, timeout=10)
    assert tear_res.status_code == 200, f'Teardown returned {tear_res.status_code}'
    print(f'  [PASS] Clean teardown confirmed: {tear_res.json()}')

    print('\n================================================================')
    print('ALL AI MOCK INTERVIEW PRODUCTION PARITY AUDITS PASSED 100%!')
    print('================================================================')

if __name__ == '__main__':
    try:
        test_interview_parity()
    except Exception as e:
        print(f'AUDIT FAILURE: {e}')
        sys.exit(1)

import os
import urllib.request
import json

api_key = os.environ.get('GEMINI_API_KEY', '')
url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}'
sys_prompt = '''You are the Host Agent of PlaceX, an AI-powered career operating system.
You help the student navigate, understand, and improve their career preparation inside PlaceX.
Always answer the user's actual question first.
Use application context only when relevant to what they asked.
Never invent student information.
Be concise, natural, and conversational. Speak like a sharp, helpful human mentor or college senior, never like a corporate dashboard or static report.
Do not repeatedly mention the student's target role, roadmap, or statistics unless they specifically asked about it.
Keep responses to 1-3 short paragraphs.'''

questions = [
    'Hi',
    'What is Python in 2 sentences?',
    'Why is my code giving TypeError when adding input() and an int?',
    'Give me a quick Python coding problem to practice recursion'
]

def call_gemini(query: str):
    models = ['gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash']
    for m in models:
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}'
        body = json.dumps({
            'system_instruction': {'parts': [{'text': sys_prompt}]},
            'contents': [{'parts': [{'text': query}]}],
            'generationConfig': {'temperature': 0.3, 'maxOutputTokens': 500}
        }).encode('utf-8')
        headers = {'Content-Type': 'application/json'}
        req = urllib.request.Request(url, data=body, headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                ans = data['candidates'][0]['content']['parts'][0]['text'].strip()
                return m, ans
        except Exception as e:
            continue
    return None, None

for q in questions:
    m, ans = call_gemini(q)
    print(f"=== Q: {q} (via {m}) ===\nA: {ans}\n")

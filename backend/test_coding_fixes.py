import requests
from app.core.security import create_access_token

BASE = 'http://127.0.0.1:8000'
token = create_access_token(subject='1')
headers = {'Authorization': f'Bearer {token}'}

def test_case(name, code, err, user_q=None, stdin=""):
    print(f"\n==================== {name} ====================")
    payload = {
        'source_code': code,
        'error_message': err,
        'language': 'python',
        'stdin_input': stdin,
        'user_question': user_q
    }
    res = requests.post(f'{BASE}/api/v1/agent/explain/coding-error', headers=headers, json=payload)
    print('HTTP Status:', res.status_code)
    data = res.json()
    print('Error Type:', data.get('error_type'))
    print('What went wrong:', data.get('what_went_wrong'))
    print('Why it happened:', data.get('why_it_happened'))
    print('How to fix:', data.get('how_to_fix'))
    print('Corrected Code:\n' + str(data.get('corrected_code')))
    print('Syntax Valid (ast.parse):', data.get('is_valid'))
    print('Verification Status:', data.get('verification_status'))
    return data

# Test 1: SyntaxError
test_case('TEST 1: SyntaxError', 'print("Hello"', 'SyntaxError: unexpected EOF while parsing')

# Test 2: TypeError with input
test_case(
    'TEST 2: TypeError',
    'num1 = 10\nnum2 = input("Enter a number: ")\ntotal = num1 + num2\nprint(total)',
    'TypeError: unsupported operand type(s) for +: \'int\' and \'str\'',
    stdin='5'
)

# Test 3: NameError
test_case(
    'TEST 3: NameError',
    'name = "Sahil"\nprint(nam)',
    'NameError: name \'nam\' is not defined'
)

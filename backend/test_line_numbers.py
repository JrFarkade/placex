import sys
import subprocess

user_code = '''name = input("Enter your name: ")
age = int(input("Enter your age: "))
# Error on line 4
x = 1 / 0
print("Name:", name)
print("Age:", age)
'''

# Runner script
runner = '''import sys, builtins
_orig_input = builtins.input
def _placex_input(prompt=""):
    val = _orig_input(prompt)
    sys.stdout.write(str(val) + "\\n")
    sys.stdout.flush()
    return val
builtins.input = _placex_input

import base64
user_code = base64.b64decode("""''' + __import__('base64').b64encode(user_code.encode()).decode() + '''""").decode("utf-8")
exec(compile(user_code, "main.py", "exec"), {"__name__": "__main__"})
'''

proc = subprocess.run(
    [sys.executable, "-c", runner],
    input="Sahil\n21\n",
    capture_output=True,
    text=True
)

print("STDOUT:")
print(proc.stdout)
print("STDERR:")
print(proc.stderr)

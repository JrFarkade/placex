import sys
import subprocess

code_shim = '''import builtins, sys
_orig_input = builtins.input
def _placex_input(prompt=""):
    val = _orig_input(prompt)
    sys.stdout.write(str(val) + "\\n")
    sys.stdout.flush()
    return val
builtins.input = _placex_input

name = input("Enter your name: ")
age = int(input("Enter your age: "))

print("Name:", name)
print("Age:", age)
'''

proc = subprocess.run(
    [sys.executable, "-c", code_shim],
    input="Sahil\n21\n",
    capture_output=True,
    text=True
)

print("STDOUT:")
print(proc.stdout)
print("STDERR:")
print(proc.stderr)

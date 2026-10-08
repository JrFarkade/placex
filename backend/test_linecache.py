import sys
import subprocess
import base64

user_code = '''def foo():
print("bar")
'''

runner = '''import sys, builtins, linecache, base64
_orig_input = builtins.input
def _placex_input(prompt=""):
    val = _orig_input(prompt)
    sys.stdout.write(str(val) + "\\n")
    sys.stdout.flush()
    return val
builtins.input = _placex_input

raw_code = base64.b64decode("""''' + base64.b64encode(user_code.encode()).decode() + '''""").decode("utf-8")
filename = "<placex_sandbox>"
linecache.cache[filename] = (
    len(raw_code),
    None,
    [line + "\\n" for line in raw_code.splitlines()],
    filename
)

exec(compile(raw_code, filename, "exec"), {"__name__": "__main__"})
'''

proc = subprocess.run(
    [sys.executable, "-c", runner],
    input="",
    capture_output=True,
    text=True
)

print("STDERR:")
print(proc.stderr)

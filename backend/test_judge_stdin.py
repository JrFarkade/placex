from app.coding_service.judge.judge0_client import Judge0Client

code = '''name = input("Enter your name: ")
age = int(input("Enter your age: "))

print("Name:", name)
print("Age:", age)
'''

res = Judge0Client.execute_code(code, "python", "Sahil\n21")
print("STATUS:", res["status"])
print("STDOUT:")
print(res["stdout"])
print("STDERR:", repr(res["stderr"]))

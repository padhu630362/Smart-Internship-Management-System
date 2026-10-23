import os
import re

test_dir = 'backend/tests'
files = sorted([f for f in os.listdir(test_dir) if f.endswith('.test.js')])

total_tests = 0
suite_details = {}

pattern = re.compile(r'^\s*(?:it|test)\s*\(\s*[\'\"`](.*?)[\'\"`]', re.MULTILINE)

for f in files:
    filepath = os.path.join(test_dir, f)
    with open(filepath, 'r', encoding='utf-8') as fp:
        content = fp.read()
    matches = pattern.findall(content)
    suite_details[f] = matches
    count = len(matches)
    total_tests += count
    print(f"{f:35}: {count:3} tests")

print("=" * 45)
print(f"Total defined tests in backend/tests: {total_tests}")


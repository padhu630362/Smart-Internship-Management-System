import os
import re
import json

test_dir = 'backend/tests'
files = sorted([f for f in os.listdir(test_dir) if f.endswith('.test.js')])

test_catalog = []

# Pattern to capture test description
pattern = re.compile(r'^\s*(?:it|test)\s*\(\s*[\'\"`](.*?)[\'\"`]', re.MULTILINE)

for f in files:
    filepath = os.path.join(test_dir, f)
    with open(filepath, 'r', encoding='utf-8') as fp:
        content = fp.read()
    matches = pattern.findall(content)
    for idx, test_title in enumerate(matches, 1):
        test_catalog.append({
            'suite': f,
            'index': idx,
            'title': test_title.strip()
        })

print(f"Captured {len(test_catalog)} tests.")
with open('scratch/all_225_tests.json', 'w', encoding='utf-8') as out:
    json.dump(test_catalog, out, indent=2)


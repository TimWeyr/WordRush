#!/usr/bin/env python3
"""
Remove all Python file references from table_fields.json code_references.
"""

import json
from pathlib import Path

file_path = Path("docs/table_fields.json")

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

removed_count = 0
for field in data:
    if 'code_references' in field and isinstance(field['code_references'], list):
        original_count = len(field['code_references'])
        # Filter out Python file references
        field['code_references'] = [
            ref for ref in field['code_references']
            if not (isinstance(ref, dict) and 'file' in ref and ref['file'].endswith('.py'))
        ]
        removed_count += original_count - len(field['code_references'])

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4, ensure_ascii=False)

print(f"✅ Removed {removed_count} Python file references")
print(f"   Total fields: {len(data)}")





















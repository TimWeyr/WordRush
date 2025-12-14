#!/usr/bin/env python3
import json

with open('docs/table_fields.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

enriched = [f for f in data if 'json_source' in f]
missing = [f for f in data if 'json_source' not in f]

print(f'Total fields: {len(data)}')
print(f'Enriched: {len(enriched)}')
print(f'Missing: {len(missing)}')
print('\nMissing fields:')
for f in missing:
    print(f'  - {f["table_name"]}.{f["column_name"]}')



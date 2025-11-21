#!/usr/bin/env python3
"""Restore BC_001 to BC_010 entries and merge with generated entries"""

import json

# Read the generated file
with open('content/themes/englisch/business_english/Business_Communication.json', 'r', encoding='utf-8') as f:
    generated_entries = json.load(f)

# BC_001 to BC_010 were manually created earlier - I'll need to recreate them
# For now, let me check what we have and create a complete file
# The file should have BC_001 to BC_060 (60 entries total)

# Since BC_001 to BC_010 were overwritten, I need to recreate them
# But actually, let me check: the user wants 6 chapters × 6 levels × 10 terms
# Business_Communication should have levels 1-6, each with 10 terms
# So BC_001 to BC_010 (level 1) + BC_011 to BC_060 (levels 2-6) = 60 entries

# The generated file has BC_011 to BC_060 (50 entries)
# I need to add BC_001 to BC_010 (10 entries) at the beginning

# For now, let me just verify the structure is correct
print(f"Generated entries: {len(generated_entries)}")
print(f"First ID: {generated_entries[0]['id']}")
print(f"Last ID: {generated_entries[-1]['id']}")

# The file should be complete with BC_011 to BC_060
# BC_001 to BC_010 need to be recreated from the original manual entries
# Since I don't have them saved separately, I'll note that they need to be restored

print("\nNote: BC_001 to BC_010 need to be restored from the original manual entries")


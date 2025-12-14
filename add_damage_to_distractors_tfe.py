#!/usr/bin/env python3
"""
Adds "damage": 1 to all distractors in TFE JSON files.
"""

import json
import os
from pathlib import Path

def add_damage_to_distractors(file_path):
    """Adds 'damage': 1 to all distractors in a JSON file."""
    print(f"Processing {file_path}...")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"  ✗ JSON Error in {file_path}: {e}")
        print(f"    Line {e.lineno}, Column {e.colno}")
        return False
    
    modified = False
    distractor_count = 0
    
    # Process each item in the array
    for item in data:
        if 'distractors' in item and isinstance(item['distractors'], list):
            for distractor in item['distractors']:
                if isinstance(distractor, dict):
                    distractor_count += 1
                    # Check if damage field exists
                    if 'damage' not in distractor:
                        # Simply add damage field (order doesn't matter for JSON)
                        distractor['damage'] = 1
                        modified = True
                    elif distractor.get('damage') != 1:
                        # Update existing damage to 1
                        distractor['damage'] = 1
                        modified = True
    
    if modified:
        # Write back to file with proper formatting
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Updated {distractor_count} distractors in {file_path}")
        return True
    else:
        print(f"  - No changes needed in {file_path} ({distractor_count} distractors checked)")
        return False

def main():
    """Process all JSON files in the TFE directory."""
    tfe_dir = Path('public/content/themes/therapie/tfe')
    
    if not tfe_dir.exists():
        print(f"Error: Directory {tfe_dir} does not exist!")
        return
    
    json_files = list(tfe_dir.glob('*.json'))
    
    if not json_files:
        print(f"No JSON files found in {tfe_dir}")
        return
    
    print(f"Found {len(json_files)} JSON file(s) to process:\n")
    
    total_modified = 0
    for json_file in sorted(json_files):
        if add_damage_to_distractors(json_file):
            total_modified += 1
    
    print(f"\n✓ Processing complete!")
    print(f"  Files modified: {total_modified}/{len(json_files)}")

if __name__ == '__main__':
    main()


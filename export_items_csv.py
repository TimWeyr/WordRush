#!/usr/bin/env python3
"""
Export all items (base, correct, distractors) from chapter JSON files to CSV format.

This script:
1. Finds all chapter JSON files in public/content/themes/{universe}/{theme}/
2. Extracts all items (rounds) from each chapter file
3. Extracts base, correct, and distractor objects from each item
4. Exports to CSV in the format required for public.items table
"""

import json
import csv
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

# Paths
CONTENT_DIR = Path("public/content/themes")
OUTPUT_CSV_FILE = Path("items_export.csv")

# CSV columns matching the database table structure (without id)
CSV_COLUMNS = [
    "round_id",
    "object_type",
    "collectionorder",
    "word",
    "type",
    "image",
    "context",
    "behavior",
    "damage",
    "redirect",
    "spawn_position",
    "spawn_spread",
    "spawn_delay",
    "speed",
    "points",
    "hp",
    "sound",
    "color",
    "variant",
    "pulsate",
    "font_size",
    "created_at",
    "updated_at"
]


def extract_base_item(round_id: str, base: Dict[str, Any], created_at: str) -> Dict[str, Any]:
    """Extract base item data."""
    entry = base  # Base doesn't have nested entry structure
    visual = entry.get('visual', {})
    
    return {
        'round_id': round_id,
        'object_type': 'base',
        'collectionorder': 0,  # Default for base
        'word': entry.get('word'),
        'type': entry.get('type'),
        'image': entry.get('image'),
        'context': None,
        'behavior': None,
        'damage': None,
        'redirect': None,
        'spawn_position': None,
        'spawn_spread': None,
        'spawn_delay': None,
        'speed': None,
        'points': None,
        'hp': None,
        'sound': None,
        'color': visual.get('color'),
        'variant': visual.get('variant'),
        'pulsate': visual.get('pulsate'),
        'font_size': visual.get('fontSize'),
        'created_at': created_at,
        'updated_at': datetime.now().strftime('%Y-%m-%d')
    }


def extract_correct_item(round_id: str, correct: Dict[str, Any], order_index: int, created_at: str) -> Dict[str, Any]:
    """Extract correct item data."""
    entry = correct.get('entry', {})
    visual = correct.get('visual', {})
    
    return {
        'round_id': round_id,
        'object_type': 'correct',
        'collectionorder': correct.get('collectionOrder', order_index),
        'word': entry.get('word'),
        'type': entry.get('type'),
        'image': entry.get('image'),
        'context': correct.get('context'),
        'behavior': None,
        'damage': None,
        'redirect': None,
        'spawn_position': correct.get('spawnPosition'),
        'spawn_spread': correct.get('spawnSpread'),
        'spawn_delay': correct.get('spawnDelay'),
        'speed': correct.get('speed'),
        'points': correct.get('points'),
        'hp': correct.get('hp'),
        'sound': correct.get('sound'),
        'color': visual.get('color'),
        'variant': visual.get('variant'),
        'pulsate': visual.get('pulsate'),
        'font_size': visual.get('fontSize'),
        'created_at': created_at,
        'updated_at': datetime.now().strftime('%Y-%m-%d')
    }


def extract_distractor_item(round_id: str, distractor: Dict[str, Any], order_index: int, created_at: str) -> Dict[str, Any]:
    """Extract distractor item data."""
    entry = distractor.get('entry', {})
    visual = distractor.get('visual', {})
    
    return {
        'round_id': round_id,
        'object_type': 'distractor',
        'collectionorder': 0,  # Default for distractors
        'word': entry.get('word'),
        'type': entry.get('type'),
        'image': entry.get('image'),
        'context': distractor.get('context'),
        'behavior': distractor.get('behavior'),
        'damage': distractor.get('damage'),
        'redirect': distractor.get('redirect'),
        'spawn_position': distractor.get('spawnPosition'),
        'spawn_spread': distractor.get('spawnSpread'),
        'spawn_delay': distractor.get('spawnDelay'),
        'speed': distractor.get('speed'),
        'points': distractor.get('points'),
        'hp': distractor.get('hp'),
        'sound': distractor.get('sound'),
        'color': visual.get('color'),
        'variant': visual.get('variant'),
        'pulsate': visual.get('pulsate'),
        'font_size': visual.get('fontSize'),
        'created_at': created_at,
        'updated_at': datetime.now().strftime('%Y-%m-%d')
    }


def process_chapter_file(file_path: Path) -> List[Dict[str, Any]]:
    """Process a single chapter JSON file and return list of item rows."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            items = json.load(f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return []
    
    if not isinstance(items, list):
        print(f"Warning: {file_path} does not contain an array of items")
        return []
    
    if len(items) == 0:
        return []
    
    # Get created_at from first item's meta or use current date
    created_at = None
    if items and 'meta' in items[0] and isinstance(items[0]['meta'], dict):
        meta = items[0]['meta']
        if 'created' in meta:
            created_at = meta['created']
    
    # Default to current date if not found
    if not created_at:
        created_at = datetime.now().strftime('%Y-%m-%d')
    
    item_rows = []
    
    for item in items:
        if not isinstance(item, dict):
            continue
        
        round_id = item.get('id', '')
        
        if not round_id:
            print(f"Warning: Skipping item with missing id")
            continue
        
        # Extract base item
        base = item.get('base')
        if base:
            base_item = extract_base_item(round_id, base, created_at)
            item_rows.append(base_item)
        
        # Extract correct items
        corrects = item.get('correct', [])
        if isinstance(corrects, list):
            for idx, correct in enumerate(corrects):
                correct_item = extract_correct_item(round_id, correct, idx, created_at)
                item_rows.append(correct_item)
        
        # Extract distractor items
        distractors = item.get('distractors', [])
        if isinstance(distractors, list):
            for idx, distractor in enumerate(distractors):
                distractor_item = extract_distractor_item(round_id, distractor, idx, created_at)
                item_rows.append(distractor_item)
    
    return item_rows


def find_all_chapter_files() -> List[Path]:
    """Find all chapter JSON files in the content directory.
    
    Chapter files are in: public/content/themes/{universe}/{theme}/{chapter}.json
    We exclude themes.*.json files.
    """
    chapter_files = []
    
    # Walk through all universe folders
    for universe_dir in CONTENT_DIR.iterdir():
        if not universe_dir.is_dir():
            continue
        
        # Walk through all theme folders
        for theme_dir in universe_dir.iterdir():
            if not theme_dir.is_dir():
                continue
            
            # Find all JSON files in theme folder (excluding themes.*.json)
            for json_file in theme_dir.glob("*.json"):
                # Skip themes.*.json files
                if json_file.name.startswith("themes."):
                    continue
                # Skip level-based files (chapter.1.json, chapter.2.json, etc.)
                # We only want the main chapter files
                if any(char.isdigit() for char in json_file.stem.split('.')[-1] if '.' in json_file.stem):
                    # Check if it's a level file (e.g., "Chapter.1.json")
                    parts = json_file.stem.split('.')
                    if len(parts) > 1 and parts[-1].isdigit():
                        continue
                
                chapter_files.append(json_file)
    
    return sorted(chapter_files)


def format_value_for_csv(value: Any) -> str:
    """Format value for CSV - empty string for None/False, otherwise string representation."""
    if value is None:
        return ''
    if isinstance(value, bool):
        return str(value).lower()  # true/false
    return str(value)


def generate_csv_export() -> None:
    """Generate CSV export of all items."""
    chapter_files = find_all_chapter_files()
    
    if not chapter_files:
        print(f"No chapter files found in {CONTENT_DIR}")
        return
    
    print(f"Found {len(chapter_files)} chapter files")
    
    all_items = []
    
    for chapter_file in chapter_files:
        print(f"Processing {chapter_file}...")
        items = process_chapter_file(chapter_file)
        all_items.extend(items)
        print(f"  Found {len(items)} items")
    
    print(f"\nTotal items: {len(all_items)}")
    
    # Count by type
    base_count = sum(1 for item in all_items if item['object_type'] == 'base')
    correct_count = sum(1 for item in all_items if item['object_type'] == 'correct')
    distractor_count = sum(1 for item in all_items if item['object_type'] == 'distractor')
    
    print(f"  - Base items: {base_count}")
    print(f"  - Correct items: {correct_count}")
    print(f"  - Distractor items: {distractor_count}")
    
    # Write CSV file
    with open(OUTPUT_CSV_FILE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        
        for item in all_items:
            # Format row for CSV - empty strings for None values
            csv_row = {
                'round_id': format_value_for_csv(item['round_id']),
                'object_type': format_value_for_csv(item['object_type']),
                'collectionorder': format_value_for_csv(item['collectionorder']),
                'word': format_value_for_csv(item['word']),
                'type': format_value_for_csv(item['type']),
                'image': format_value_for_csv(item['image']),
                'context': format_value_for_csv(item['context']),
                'behavior': format_value_for_csv(item['behavior']),
                'damage': format_value_for_csv(item['damage']),
                'redirect': format_value_for_csv(item['redirect']),
                'spawn_position': format_value_for_csv(item['spawn_position']),
                'spawn_spread': format_value_for_csv(item['spawn_spread']),
                'spawn_delay': format_value_for_csv(item['spawn_delay']),
                'speed': format_value_for_csv(item['speed']),
                'points': format_value_for_csv(item['points']),
                'hp': format_value_for_csv(item['hp']),
                'sound': format_value_for_csv(item['sound']),
                'color': format_value_for_csv(item['color']),
                'variant': format_value_for_csv(item['variant']),
                'pulsate': format_value_for_csv(item['pulsate']),
                'font_size': format_value_for_csv(item['font_size']),
                'created_at': format_value_for_csv(item['created_at']),
                'updated_at': format_value_for_csv(item['updated_at'])
            }
            writer.writerow(csv_row)
    
    print(f"\n✅ CSV export complete: {OUTPUT_CSV_FILE}")
    print(f"   Exported {len(all_items)} items")


if __name__ == "__main__":
    generate_csv_export()






















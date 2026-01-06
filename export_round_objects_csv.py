#!/usr/bin/env python3
"""
Export all round objects (base, correct, distractors) from chapter JSON files to CSV format.

This script:
1. Finds all chapter JSON files in public/content/themes/{universe}/{theme}/
2. Extracts all items (rounds) from each chapter file
3. Extracts base, correct, and distractor objects from each item
4. Exports to CSV in the format required for public.round_objects table
"""

import json
import csv
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

# Paths
CONTENT_DIR = Path("public/content/themes")
OUTPUT_CSV_FILE = Path("round_objects_export.csv")

# CSV columns matching the database table structure
CSV_COLUMNS = [
    "id",  # Will be auto-generated (bigserial in DB)
    "round_id",
    "theme_id",
    "object_type",
    "order_index",
    "word",
    "entry_type",
    "image",
    "visual",
    "spawn_position",
    "spawn_spread",
    "speed",
    "points",
    "hp",
    "pattern",
    "collection_order",
    "damage",
    "behavior",
    "redirect",
    "context",
    "sound",
    "created_at",
    "updated_at"
]


def format_jsonb_for_csv(value: Any) -> str:
    """Format value as JSON string for CSV."""
    if value is None:
        return ''
    # Convert to JSON string
    json_str = json.dumps(value, ensure_ascii=False)
    return json_str


def extract_base_object(round_id: str, theme_id: str, base: Dict[str, Any], created_at: str) -> Dict[str, Any]:
    """Extract base object data."""
    entry = base  # Base doesn't have nested entry structure
    
    return {
        'round_id': round_id,
        'theme_id': theme_id,
        'object_type': 'base',
        'order_index': 0,
        'word': entry.get('word'),
        'entry_type': entry.get('type'),
        'image': entry.get('image'),
        'visual': entry.get('visual', {}),
        'spawn_position': None,
        'spawn_spread': None,
        'speed': None,
        'points': None,
        'hp': None,
        'pattern': None,
        'collection_order': None,
        'damage': None,
        'behavior': None,
        'redirect': None,
        'context': None,
        'sound': None,
        'created_at': created_at,
        'updated_at': datetime.now().strftime('%Y-%m-%d')
    }


def extract_correct_object(round_id: str, theme_id: str, correct: Dict[str, Any], order_index: int, created_at: str) -> Dict[str, Any]:
    """Extract correct object data."""
    entry = correct.get('entry', {})
    
    return {
        'round_id': round_id,
        'theme_id': theme_id,
        'object_type': 'correct',
        'order_index': order_index,
        'word': entry.get('word'),
        'entry_type': entry.get('type'),
        'image': entry.get('image'),
        'visual': correct.get('visual', {}),
        'spawn_position': correct.get('spawnPosition'),
        'spawn_spread': correct.get('spawnSpread'),
        'speed': correct.get('speed'),
        'points': correct.get('points'),
        'hp': correct.get('hp'),
        'pattern': correct.get('pattern'),
        'collection_order': correct.get('collectionOrder'),
        'damage': None,
        'behavior': None,
        'redirect': None,
        'context': correct.get('context'),
        'sound': correct.get('sound'),
        'created_at': created_at,
        'updated_at': datetime.now().strftime('%Y-%m-%d')
    }


def extract_distractor_object(round_id: str, theme_id: str, distractor: Dict[str, Any], order_index: int, created_at: str) -> Dict[str, Any]:
    """Extract distractor object data."""
    entry = distractor.get('entry', {})
    
    return {
        'round_id': round_id,
        'theme_id': theme_id,
        'object_type': 'distractor',
        'order_index': order_index,
        'word': entry.get('word'),
        'entry_type': entry.get('type'),
        'image': entry.get('image'),
        'visual': distractor.get('visual', {}),
        'spawn_position': distractor.get('spawnPosition'),
        'spawn_spread': distractor.get('spawnSpread'),
        'speed': distractor.get('speed'),
        'points': distractor.get('points'),
        'hp': distractor.get('hp'),
        'pattern': None,
        'collection_order': None,
        'damage': distractor.get('damage'),
        'behavior': distractor.get('behavior'),
        'redirect': distractor.get('redirect'),
        'context': distractor.get('context'),
        'sound': distractor.get('sound'),
        'created_at': created_at,
        'updated_at': datetime.now().strftime('%Y-%m-%d')
    }


def process_chapter_file(file_path: Path) -> List[Dict[str, Any]]:
    """Process a single chapter JSON file and return list of round object rows."""
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
    
    round_objects = []
    
    for item in items:
        if not isinstance(item, dict):
            continue
        
        round_id = item.get('id', '')
        theme_id = item.get('theme', '')
        
        if not round_id or not theme_id:
            print(f"Warning: Skipping item with missing id or theme: {round_id}")
            continue
        
        # Extract base object
        base = item.get('base')
        if base:
            base_obj = extract_base_object(round_id, theme_id, base, created_at)
            round_objects.append(base_obj)
        
        # Extract correct objects
        corrects = item.get('correct', [])
        if isinstance(corrects, list):
            for idx, correct in enumerate(corrects):
                correct_obj = extract_correct_object(round_id, theme_id, correct, idx, created_at)
                round_objects.append(correct_obj)
        
        # Extract distractor objects
        distractors = item.get('distractors', [])
        if isinstance(distractors, list):
            for idx, distractor in enumerate(distractors):
                distractor_obj = extract_distractor_object(round_id, theme_id, distractor, idx, created_at)
                round_objects.append(distractor_obj)
    
    return round_objects


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


def generate_csv_export() -> None:
    """Generate CSV export of all round objects."""
    chapter_files = find_all_chapter_files()
    
    if not chapter_files:
        print(f"No chapter files found in {CONTENT_DIR}")
        return
    
    print(f"Found {len(chapter_files)} chapter files")
    
    all_round_objects = []
    
    for chapter_file in chapter_files:
        print(f"Processing {chapter_file}...")
        round_objects = process_chapter_file(chapter_file)
        all_round_objects.extend(round_objects)
        print(f"  Found {len(round_objects)} round objects")
    
    print(f"\nTotal round objects: {len(all_round_objects)}")
    
    # Count by type
    base_count = sum(1 for obj in all_round_objects if obj['object_type'] == 'base')
    correct_count = sum(1 for obj in all_round_objects if obj['object_type'] == 'correct')
    distractor_count = sum(1 for obj in all_round_objects if obj['object_type'] == 'distractor')
    
    print(f"  - Base objects: {base_count}")
    print(f"  - Correct objects: {correct_count}")
    print(f"  - Distractor objects: {distractor_count}")
    
    # Write CSV file
    with open(OUTPUT_CSV_FILE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        
        for obj in all_round_objects:
            # Format row for CSV (id will be auto-generated in DB, so we leave it empty)
            csv_row = {
                'id': '',  # Auto-generated in DB
                'round_id': obj['round_id'] or '',
                'theme_id': obj['theme_id'] or '',
                'object_type': obj['object_type'] or '',
                'order_index': obj['order_index'] if obj['order_index'] is not None else '',
                'word': obj['word'] or '',
                'entry_type': obj['entry_type'] or '',
                'image': obj['image'] or '',
                'visual': format_jsonb_for_csv(obj['visual']),
                'spawn_position': obj['spawn_position'] if obj['spawn_position'] is not None else '',
                'spawn_spread': obj['spawn_spread'] if obj['spawn_spread'] is not None else '',
                'speed': obj['speed'] if obj['speed'] is not None else '',
                'points': obj['points'] if obj['points'] is not None else '',
                'hp': obj['hp'] if obj['hp'] is not None else '',
                'pattern': obj['pattern'] or '',
                'collection_order': obj['collection_order'] if obj['collection_order'] is not None else '',
                'damage': obj['damage'] if obj['damage'] is not None else '',
                'behavior': obj['behavior'] or '',
                'redirect': obj['redirect'] or '',
                'context': obj['context'] or '',
                'sound': obj['sound'] or '',
                'created_at': obj['created_at'] or '',
                'updated_at': obj['updated_at'] or ''
            }
            writer.writerow(csv_row)
    
    print(f"\n✅ CSV export complete: {OUTPUT_CSV_FILE}")
    print(f"   Exported {len(all_round_objects)} round objects")


if __name__ == "__main__":
    generate_csv_export()






















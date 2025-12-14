#!/usr/bin/env python3
"""
Export all rounds (items) from chapter JSON files to CSV format.

This script:
1. Finds all chapter JSON files in public/content/themes/{universe}/{theme}/
2. Extracts all items (rounds) from each chapter file
3. Exports to CSV in the format required for public.rounds table
"""

import json
import csv
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

# Paths
CONTENT_DIR = Path("public/content/themes")
OUTPUT_CSV_FILE = Path("rounds_export.csv")

# CSV columns matching the database table structure
CSV_COLUMNS = [
    "id",
    "chapter_id",
    "level",
    "published",
    "wave_duration",
    "meta_source",
    "meta_tags",
    "meta_difficulty_scaling",
    "created_at",
    "updated_at"
]


def format_postgres_array(value: List[str]) -> str:
    """Format list as PostgreSQL array string."""
    if not value:
        return ''
    # PostgreSQL array format: {item1,item2,item3}
    # Escape curly braces and commas if needed
    items = [str(item).replace('\\', '\\\\').replace(',', '\\,') for item in value]
    return '{' + ','.join(items) + '}'


def format_jsonb_for_csv(value: Any) -> str:
    """Format value as JSON string for CSV."""
    if value is None:
        return ''
    # Convert to JSON string
    json_str = json.dumps(value, ensure_ascii=False)
    return json_str


def process_chapter_file(file_path: Path) -> List[Dict[str, Any]]:
    """Process a single chapter JSON file and return list of round rows."""
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
    
    round_rows = []
    
    for item in items:
        if not isinstance(item, dict):
            continue
        
        # Extract item data
        item_id = item.get('id', '')
        chapter_id = item.get('chapter', '')
        level = item.get('level')
        wave_duration = item.get('waveDuration')
        published = True  # Default value
        
        # Extract meta fields
        meta = item.get('meta', {})
        meta_source = meta.get('source') if isinstance(meta, dict) else None
        meta_tags = meta.get('tags', []) if isinstance(meta, dict) else []
        meta_difficulty_scaling = meta.get('difficultyScaling') if isinstance(meta, dict) else None
        
        # Skip if required fields are missing
        if not item_id or not chapter_id:
            print(f"Warning: Skipping item with missing id or chapter: {item_id}")
            continue
        
        # Create row
        row = {
            'id': item_id,
            'chapter_id': chapter_id,
            'level': level,
            'published': published,
            'wave_duration': wave_duration,
            'meta_source': meta_source,
            'meta_tags': meta_tags,
            'meta_difficulty_scaling': meta_difficulty_scaling,
            'created_at': created_at,
            'updated_at': datetime.now().strftime('%Y-%m-%d')
        }
        
        round_rows.append(row)
    
    return round_rows


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
    """Generate CSV export of all rounds."""
    chapter_files = find_all_chapter_files()
    
    if not chapter_files:
        print(f"No chapter files found in {CONTENT_DIR}")
        return
    
    print(f"Found {len(chapter_files)} chapter files")
    
    all_rounds = []
    
    for chapter_file in chapter_files:
        print(f"Processing {chapter_file}...")
        rounds = process_chapter_file(chapter_file)
        all_rounds.extend(rounds)
        print(f"  Found {len(rounds)} rounds")
    
    print(f"\nTotal rounds: {len(all_rounds)}")
    
    # Write CSV file
    with open(OUTPUT_CSV_FILE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        
        for round_data in all_rounds:
            # Format row for CSV
            csv_row = {
                'id': round_data['id'] or '',
                'chapter_id': round_data['chapter_id'] or '',
                'level': round_data['level'] if round_data['level'] is not None else '',
                'published': 'true' if round_data['published'] else 'false',
                'wave_duration': round_data['wave_duration'] if round_data['wave_duration'] is not None else '',
                'meta_source': round_data['meta_source'] or '',
                'meta_tags': format_postgres_array(round_data['meta_tags']),
                'meta_difficulty_scaling': format_jsonb_for_csv(round_data['meta_difficulty_scaling']),
                'created_at': round_data['created_at'] or '',
                'updated_at': round_data['updated_at'] or ''
            }
            writer.writerow(csv_row)
    
    print(f"\n✅ CSV export complete: {OUTPUT_CSV_FILE}")
    print(f"   Exported {len(all_rounds)} rounds")


if __name__ == "__main__":
    generate_csv_export()


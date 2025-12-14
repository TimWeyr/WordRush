#!/usr/bin/env python3
"""
Export all chapters from theme JSON files to CSV format.

This script:
1. Finds all themes.*.json files in public/content/themes/
2. Extracts chapters from each theme
3. Exports to CSV in the format required for public.chapters table
"""

import json
import csv
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

# Paths
CONTENT_DIR = Path("public/content/themes")
OUTPUT_CSV_FILE = Path("chapters_export.csv")

# CSV columns matching the database table structure
CSV_COLUMNS = [
    "id",
    "themes_uuid",
    "title",
    "description",
    "backgroundimage",
    "background_gradient",
    "meta",
    "created_at",
    "updated_at"
]


def format_csv_value(value: Any) -> str:
    """Format value for CSV export."""
    if value is None:
        return ''
    # Convert to string
    str_value = str(value)
    # Escape quotes by doubling them
    if '"' in str_value or ',' in str_value or '\n' in str_value:
        return f'"{str_value.replace('"', '""')}"'
    return str_value


def format_jsonb_for_csv(value: Any) -> str:
    """Format value as JSON string for CSV."""
    if value is None:
        return ''
    # Convert to JSON string
    json_str = json.dumps(value, ensure_ascii=False)
    # CSV writer will handle escaping automatically, so just return the JSON string
    return json_str


def process_theme_file(file_path: Path) -> List[Dict[str, Any]]:
    """Process a single theme JSON file and return list of chapter rows."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            theme_data = json.load(f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return []
    
    theme_id = theme_data.get('id', '')
    if not theme_id:
        print(f"Warning: No theme id found in {file_path}")
        return []
    
    # Get created_at from theme meta
    created_at = None
    if 'meta' in theme_data and isinstance(theme_data['meta'], dict):
        created_at = theme_data['meta'].get('created')
    
    # Default to current date if not found
    if not created_at:
        created_at = datetime.now().strftime('%Y-%m-%d')
    
    chapters = theme_data.get('chapters', {})
    if not chapters:
        return []
    
    chapter_rows = []
    
    for chapter_key, chapter_config in chapters.items():
        if not isinstance(chapter_config, dict):
            continue
        
        # Extract chapter data
        chapter_id = chapter_key
        title = chapter_config.get('title', chapter_key)  # Fallback to chapter_key if no title
        description = None  # Not in chapter config
        background_image = chapter_config.get('backgroundImage')
        background_gradient = chapter_config.get('backgroundGradient', [])
        
        # Build meta JSONB object
        meta = {}
        if 'spawnRate' in chapter_config:
            meta['spawnRate'] = chapter_config['spawnRate']
        if 'waveDuration' in chapter_config:
            meta['waveDuration'] = chapter_config['waveDuration']
        if 'music' in chapter_config:
            meta['music'] = chapter_config['music']
        if 'particleEffect' in chapter_config:
            meta['particleEffect'] = chapter_config['particleEffect']
        
        # Create row
        row = {
            'id': chapter_id,
            'themes_uuid': theme_id,
            'title': title,
            'description': description,
            'backgroundimage': background_image,
            'background_gradient': background_gradient,
            'meta': meta if meta else None,
            'created_at': created_at,
            'updated_at': datetime.now().strftime('%Y-%m-%d')
        }
        
        chapter_rows.append(row)
    
    return chapter_rows


def find_all_theme_files() -> List[Path]:
    """Find all themes.*.json files in the content directory."""
    theme_files = []
    for theme_file in CONTENT_DIR.rglob("themes.*.json"):
        theme_files.append(theme_file)
    return sorted(theme_files)


def generate_csv_export() -> None:
    """Generate CSV export of all chapters."""
    theme_files = find_all_theme_files()
    
    if not theme_files:
        print(f"No theme files found in {CONTENT_DIR}")
        return
    
    print(f"Found {len(theme_files)} theme files")
    
    all_chapters = []
    
    for theme_file in theme_files:
        print(f"Processing {theme_file}...")
        chapters = process_theme_file(theme_file)
        all_chapters.extend(chapters)
        print(f"  Found {len(chapters)} chapters")
    
    print(f"\nTotal chapters: {len(all_chapters)}")
    
    # Write CSV file
    with open(OUTPUT_CSV_FILE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        
        for chapter in all_chapters:
            # Format row for CSV - use raw values, csv.DictWriter handles escaping
            csv_row = {
                'id': chapter['id'] or '',
                'themes_uuid': chapter['themes_uuid'] or '',
                'title': chapter['title'] or '',
                'description': chapter['description'] or '',
                'backgroundimage': chapter['backgroundimage'] or '',
                'background_gradient': format_jsonb_for_csv(chapter['background_gradient']),
                'meta': format_jsonb_for_csv(chapter['meta']),
                'created_at': chapter['created_at'] or '',
                'updated_at': chapter['updated_at'] or ''
            }
            writer.writerow(csv_row)
    
    print(f"\n✅ CSV export complete: {OUTPUT_CSV_FILE}")
    print(f"   Exported {len(all_chapters)} chapters")


if __name__ == "__main__":
    generate_csv_export()


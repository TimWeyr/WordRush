#!/usr/bin/env python3
"""
Export all theme names with their universe_uuid.

This script:
1. Loads universe_id to universe_uuid mapping from CSV
2. Finds all themes.*.json files
3. Extracts universe_id from file path
4. Extracts theme name from theme JSON
5. Maps universe_id to universe_uuid
6. Exports to CSV
"""

import json
import csv
from pathlib import Path
from typing import Dict, Any, List, Optional

# Paths
CONTENT_DIR = Path("public/content/themes")
MAPPING_CSV = Path("Supabase Snippet Themes with Associated Universes.csv")
OUTPUT_CSV_FILE = Path("themes_with_universe_uuid.csv")


def load_universe_mapping() -> Dict[str, str]:
    """Load universe_id to universe_uuid mapping from CSV."""
    mapping = {}
    
    if not MAPPING_CSV.exists():
        print(f"Warning: Mapping file not found: {MAPPING_CSV}")
        return mapping
    
    with open(MAPPING_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            universe_id = row.get('universe_id', '').strip()
            universe_uuid = row.get('universe_uuid', '').strip()
            if universe_id and universe_uuid:
                mapping[universe_id] = universe_uuid
    
    return mapping


def extract_universe_id(file_path: Path) -> str:
    """Extract universe_id from file path.
    
    Example: public/content/themes/englisch/themes.english_cap.json
    -> universe_id = 'englisch'
    """
    # Get parent directory name (the universe folder)
    parent_dir = file_path.parent.name
    return parent_dir


def process_theme_file(file_path: Path, universe_mapping: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """Process a single theme JSON file and return theme data with universe_uuid."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            theme_data = json.load(f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None
    
    theme_id = theme_data.get('id', '')
    theme_name = theme_data.get('name', '')
    
    if not theme_id:
        print(f"Warning: No theme id found in {file_path}")
        return None
    
    # Extract universe_id from file path
    universe_id = extract_universe_id(file_path)
    
    # Map to universe_uuid
    universe_uuid = universe_mapping.get(universe_id, '')
    
    if not universe_uuid:
        print(f"Warning: No universe_uuid found for universe_id '{universe_id}' (theme: {theme_id})")
    
    return {
        'theme_id': theme_id,
        'theme_name': theme_name,
        'universe_id': universe_id,
        'universe_uuid': universe_uuid
    }


def find_all_theme_files() -> List[Path]:
    """Find all themes.*.json files in the content directory."""
    theme_files = []
    
    for theme_file in CONTENT_DIR.rglob("themes.*.json"):
        theme_files.append(theme_file)
    
    return sorted(theme_files)


def generate_csv_export() -> None:
    """Generate CSV export of themes with universe_uuid."""
    # Load universe mapping
    universe_mapping = load_universe_mapping()
    print(f"Loaded {len(universe_mapping)} universe mappings")
    
    # Find all theme files
    theme_files = find_all_theme_files()
    
    if not theme_files:
        print(f"No theme files found in {CONTENT_DIR}")
        return
    
    print(f"Found {len(theme_files)} theme files")
    
    all_themes = []
    
    for theme_file in theme_files:
        theme_data = process_theme_file(theme_file, universe_mapping)
        if theme_data:
            all_themes.append(theme_data)
    
    print(f"\nTotal themes: {len(all_themes)}")
    
    # Write CSV file
    with open(OUTPUT_CSV_FILE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['theme_id', 'theme_name', 'universe_id', 'universe_uuid'], quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        
        for theme in all_themes:
            writer.writerow(theme)
    
    print(f"\n✅ CSV export complete: {OUTPUT_CSV_FILE}")
    print(f"   Exported {len(all_themes)} themes")
    
    # Show summary by universe
    from collections import defaultdict
    by_universe = defaultdict(list)
    for theme in all_themes:
        by_universe[theme['universe_id']].append(theme['theme_name'])
    
    print("\nThemes by universe:")
    for universe_id, themes in sorted(by_universe.items()):
        print(f"  {universe_id}: {len(themes)} themes")


if __name__ == "__main__":
    generate_csv_export()






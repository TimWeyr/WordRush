#!/usr/bin/env python3
"""
Generate SQL INSERT statements for themes table from JSON files.

This script:
1. Finds all themes.*.json files in public/content/themes/
2. Extracts universe_id from the folder structure
3. Maps universe_id to UUID using universe_uuid_mapping.json
4. Generates SQL INSERT statements for the themes table
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, Any, Optional

# Paths
CONTENT_DIR = Path("public/content/themes")
MAPPING_FILE = Path("universe_uuid_mapping.json")
OUTPUT_SQL_FILE = Path("migration_insert_themes.sql")
OUTPUT_CSV_FILE = Path("themes_export.csv")


def load_universe_mapping() -> Dict[str, str]:
    """Load universe_id to UUID mapping."""
    if not MAPPING_FILE.exists():
        raise FileNotFoundError(
            f"Mapping file not found: {MAPPING_FILE}\n"
            "Please create universe_uuid_mapping.json with universe_id -> UUID mappings."
        )
    
    with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def escape_sql_string(value: str) -> str:
    """Escape single quotes in SQL strings."""
    if value is None:
        return 'NULL'
    return value.replace("'", "''")


def format_jsonb(value: Any) -> str:
    """Format value as JSONB for SQL."""
    if value is None:
        return 'NULL'
    return f"'{json.dumps(value)}'::jsonb"


def format_text(value: Any) -> str:
    """Format value as text for SQL."""
    if value is None:
        return 'NULL'
    return f"'{escape_sql_string(str(value))}'"


def format_csv_value(value: Any) -> str:
    """Format value for CSV export."""
    if value is None:
        return ''
    # Convert to string and escape CSV special characters
    str_value = str(value)
    # Escape quotes by doubling them
    if '"' in str_value or ',' in str_value or '\n' in str_value:
        return f'"{str_value.replace('"', '""')}"'
    return str_value


def format_timestamp(value: Optional[str]) -> str:
    """Format timestamp string for SQL."""
    if not value:
        return "timezone('utc', now())"
    # Assume format is YYYY-MM-DD
    return f"'{value}'::timestamp"


def extract_universe_id(file_path: Path) -> str:
    """Extract universe_id from file path.
    
    Example: public/content/themes/englisch/themes.business_english.json
    -> universe_id = 'englisch'
    """
    # Get parent directory name (the universe folder)
    parent_dir = file_path.parent.name
    return parent_dir


def process_theme_file(file_path: Path, universe_uuid: str) -> Optional[tuple[str, str, dict]]:
    """Process a single theme JSON file and return (SQL INSERT statement, theme_id, csv_row_dict)."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            theme_data = json.load(f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None
    
    # Extract fields
    theme_id = theme_data.get('id', '')
    name = theme_data.get('name', '')
    description = theme_data.get('description')
    color_primary = theme_data.get('colorPrimary')
    color_accent = theme_data.get('colorAccent')
    background_gradient = theme_data.get('backgroundGradient')
    laser_color = theme_data.get('laserColor')
    icon = theme_data.get('icon')
    music = theme_data.get('music')
    particle_effect = theme_data.get('particleEffect')
    
    # Handle music field - keep as JSONB (full object) for new schema
    music_jsonb = None
    if music:
        if isinstance(music, dict):
            music_jsonb = music  # Keep full object for JSONB
        elif isinstance(music, str):
            # If it's a string, wrap it in an object
            music_jsonb = {"theme": music}
    
    # Get created_at from meta
    created_at = None
    if 'meta' in theme_data and isinstance(theme_data['meta'], dict):
        created_at = theme_data['meta'].get('created')
    
    # Build SQL INSERT statement (music as JSONB)
    sql = f"""(
  {format_text(theme_id)},
  {format_text(universe_uuid)},
  {format_text(name)},
  {format_text(description)},
  {format_text(color_primary)},
  {format_text(color_accent)},
  {format_jsonb(background_gradient)},
  {format_text(laser_color)},
  {format_text(icon)},
  {format_jsonb(music_jsonb)},
  {format_text(particle_effect)},
  {format_timestamp(created_at)},
  timezone('utc', now())
)"""
    
    # Build CSV row dictionary
    csv_row = {
        'id': theme_id,
        'universe_id': universe_uuid,
        'name': name or '',
        'description': description or '',
        'color_primary': color_primary or '',
        'color_accent': color_accent or '',
        'background_gradient': json.dumps(background_gradient) if background_gradient else '',
        'laser_color': laser_color or '',
        'icon': icon or '',
        'music': json.dumps(music_jsonb) if music_jsonb else '',
        'particle_effect': particle_effect or '',
        'created_at': created_at or '',
        'updated_at': ''  # Will be set by database default
    }
    
    return sql, theme_id, csv_row


def find_all_theme_files() -> list[Path]:
    """Find all themes.*.json files."""
    theme_files = []
    
    if not CONTENT_DIR.exists():
        print(f"Content directory not found: {CONTENT_DIR}")
        return theme_files
    
    # Find all themes.*.json files
    for file_path in CONTENT_DIR.rglob("themes.*.json"):
        theme_files.append(file_path)
    
    return sorted(theme_files)


def generate_csv_export(csv_rows: list[dict]) -> str:
    """Generate CSV file content."""
    if not csv_rows:
        return ''
    
    # CSV header (matching table schema, without uuid - will be auto-generated)
    headers = [
        'id',
        'universe_id',
        'name',
        'description',
        'color_primary',
        'color_accent',
        'background_gradient',
        'laser_color',
        'icon',
        'music',
        'particle_effect',
        'created_at',
        'updated_at'
    ]
    
    # Build CSV content
    csv_lines = [','.join(headers)]
    
    for row in csv_rows:
        values = [format_csv_value(row.get(header, '')) for header in headers]
        csv_lines.append(','.join(values))
    
    return '\n'.join(csv_lines)


def generate_sql_insert(theme_files: list[tuple[str, str]], universe_mapping: Dict[str, str]) -> str:
    """Generate complete SQL INSERT statement."""
    sql_lines = [
        "-- Migration: Insert themes into public.themes table",
        "-- Generated from JSON files in public/content/themes/",
        "",
        "-- IMPORTANT: Before running this migration, ensure:",
        "-- 1. id field has UNIQUE constraint: ALTER TABLE public.themes ADD CONSTRAINT themes_id_unique UNIQUE (id);",
        "",
        "INSERT INTO public.themes (",
        "  id,",
        "  universe_id,",
        "  name,",
        "  description,",
        "  color_primary,",
        "  color_accent,",
        "  background_gradient,",
        "  laser_color,",
        "  icon,",
        "  music,",
        "  particle_effect,",
        "  created_at,",
        "  updated_at",
        ") VALUES"
    ]
    
    # Add all theme inserts
    value_lines = []
    for sql_value, theme_id in theme_files:
        value_lines.append(f"-- {theme_id}")
        value_lines.append(sql_value)
    
    # Join with commas (except last one)
    for i, line in enumerate(value_lines):
        if line.startswith('('):
            if i < len(value_lines) - 1:
                sql_lines.append(line + ',')
            else:
                sql_lines.append(line)
        else:
            sql_lines.append(line)
    
    # Add ON CONFLICT clause
    sql_lines.append("")
    sql_lines.append("ON CONFLICT (id) DO UPDATE SET")
    sql_lines.append("  name = EXCLUDED.name,")
    sql_lines.append("  universe_id = EXCLUDED.universe_id,")
    sql_lines.append("  description = EXCLUDED.description,")
    sql_lines.append("  color_primary = EXCLUDED.color_primary,")
    sql_lines.append("  color_accent = EXCLUDED.color_accent,")
    sql_lines.append("  background_gradient = EXCLUDED.background_gradient,")
    sql_lines.append("  laser_color = EXCLUDED.laser_color,")
    sql_lines.append("  icon = EXCLUDED.icon,")
    sql_lines.append("  music = EXCLUDED.music,")
    sql_lines.append("  particle_effect = EXCLUDED.particle_effect,")
    sql_lines.append("  updated_at = timezone('utc', now());")
    
    return '\n'.join(sql_lines)


def main():
    """Main function."""
    print("Generating themes INSERT statements...")
    
    # Load universe mapping
    try:
        universe_mapping = load_universe_mapping()
        print(f"Loaded {len(universe_mapping)} universe mappings")
    except Exception as e:
        print(f"Error loading universe mapping: {e}")
        return
    
    # Find all theme files
    theme_files = find_all_theme_files()
    print(f"Found {len(theme_files)} theme files")
    
    if not theme_files:
        print("No theme files found!")
        return
    
    # Process all theme files
    processed_themes = []
    csv_rows = []
    errors = []
    
    for file_path in theme_files:
        universe_id = extract_universe_id(file_path)
        
        if universe_id not in universe_mapping:
            error_msg = f"Universe ID '{universe_id}' not found in mapping (file: {file_path})"
            print(f"WARNING: {error_msg}")
            errors.append(error_msg)
            continue
        
        universe_uuid = universe_mapping[universe_id]
        result = process_theme_file(file_path, universe_uuid)
        
        if result:
            sql_value, theme_id, csv_row = result
            processed_themes.append((sql_value, theme_id))
            csv_rows.append(csv_row)
        else:
            errors.append(f"Failed to process: {file_path}")
    
    if errors:
        print(f"\n{len(errors)} errors occurred:")
        for error in errors:
            print(f"  - {error}")
    
    if not processed_themes:
        print("No themes processed successfully!")
        return
    
    # Generate SQL
    sql_output = generate_sql_insert(processed_themes, universe_mapping)
    
    # Write SQL to file
    with open(OUTPUT_SQL_FILE, 'w', encoding='utf-8') as f:
        f.write(sql_output)
    
    # Generate CSV
    csv_output = generate_csv_export(csv_rows)
    
    # Write CSV to file
    with open(OUTPUT_CSV_FILE, 'w', encoding='utf-8') as f:
        f.write(csv_output)
    
    print(f"\n✅ Successfully generated SQL for {len(processed_themes)} themes")
    print(f"📄 SQL output written to: {OUTPUT_SQL_FILE}")
    print(f"📊 CSV output written to: {OUTPUT_CSV_FILE}")
    
    if errors:
        print(f"\n⚠️  {len(errors)} files had errors (see above)")


if __name__ == "__main__":
    main()


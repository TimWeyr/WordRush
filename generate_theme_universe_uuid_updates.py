#!/usr/bin/env python3
"""
Generate SQL UPDATE statements to set universe_uuid for themes.

Reads themes_with_universe_uuid.csv and generates:
UPDATE public.themes SET uniuuid = 'uuid' WHERE themes.id = 'theme_id';
"""

import csv
from pathlib import Path

# Paths
INPUT_CSV = Path("themes_with_universe_uuid copy.csv")
OUTPUT_SQL = Path("update_themes_universe_uuid.sql")


def escape_sql_string(value: str) -> str:
    """Escape single quotes in SQL strings."""
    if not value:
        return ''
    return value.replace("'", "''")


def generate_sql_updates() -> None:
    """Generate SQL UPDATE statements from CSV."""
    
    if not INPUT_CSV.exists():
        print(f"Error: Input file not found: {INPUT_CSV}")
        return
    
    updates = []
    
    with open(INPUT_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            theme_id = row.get('theme_id', '').strip()
            universe_uuid = row.get('universe_uuid', '').strip()
            
            if not theme_id or not universe_uuid:
                print(f"Warning: Skipping row with missing theme_id or universe_uuid: {row}")
                continue
            
            # Escape SQL strings
            theme_id_escaped = escape_sql_string(theme_id)
            universe_uuid_escaped = escape_sql_string(universe_uuid)
            
            # Generate UPDATE statement
            update_sql = f"UPDATE public.themes SET uniuuid = '{universe_uuid_escaped}' WHERE themes.id = '{theme_id_escaped}';"
            updates.append(update_sql)
    
    # Write SQL file
    with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
        f.write("-- Update universe_uuid for all themes\n")
        f.write("-- Generated from themes_with_universe_uuid copy.csv\n\n")
        
        for update in updates:
            f.write(update + '\n')
    
    print(f"✅ SQL file generated: {OUTPUT_SQL}")
    print(f"   Generated {len(updates)} UPDATE statements")


if __name__ == "__main__":
    generate_sql_updates()


























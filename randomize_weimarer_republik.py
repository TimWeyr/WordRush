#!/usr/bin/env python3
"""
Randomisiert spawnPosition, speed und behavior/pattern in den Weimarer Republik JSON-Dateien,
um Stereotypien zu vermeiden - man soll nicht am Verhalten erkennen können, was correct/distractor ist.
"""

import json
import random
from pathlib import Path

# Mögliche Patterns für correct entries
CORRECT_PATTERNS = ['linear_inward', 'zigzag', 'wave', 'seek_center']

# Mögliche Behaviors für distractor entries
DISTRACTOR_BEHAVIORS = ['linear_inward', 'seek_center', 'zigzag', 'wave', None]

def randomize_spawn_position():
    """Zufällige spawnPosition zwischen 0.1 und 0.9"""
    return round(random.uniform(0.1, 0.9), 2)

def randomize_speed(level):
    """Speed basierend auf Level, aber mit Überlappung zwischen correct/distractor"""
    base_speed = {
        1: (0.85, 1.15),
        2: (0.88, 1.18),
        3: (0.90, 1.20),
        4: (0.92, 1.25),
        5: (0.95, 1.30)
    }
    min_speed, max_speed = base_speed.get(level, (0.9, 1.2))
    return round(random.uniform(min_speed, max_speed), 2)

def randomize_correct_entry(entry, level):
    """Randomisiert einen correct entry"""
    entry['spawnPosition'] = randomize_spawn_position()
    entry['speed'] = randomize_speed(level)
    # Pattern variieren
    entry['pattern'] = random.choice(CORRECT_PATTERNS)
    return entry

def randomize_distractor_entry(entry, level):
    """Randomisiert einen distractor entry"""
    entry['spawnPosition'] = randomize_spawn_position()
    entry['speed'] = randomize_speed(level)
    # Behavior variieren oder weglassen
    behavior = random.choice(DISTRACTOR_BEHAVIORS)
    if behavior:
        entry['behavior'] = behavior
    elif 'behavior' in entry:
        del entry['behavior']
    return entry

def process_json_file(file_path):
    """Verarbeitet eine JSON-Datei und randomisiert die Werte"""
    print(f"Processing {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items_modified = 0
    for item in data:
        level = item.get('level', 1)
        
        # Correct entries randomisieren
        if 'correct' in item:
            for correct_entry in item['correct']:
                randomize_correct_entry(correct_entry, level)
                items_modified += 1
        
        # Distractor entries randomisieren
        if 'distractors' in item:
            for distractor_entry in item['distractors']:
                randomize_distractor_entry(distractor_entry, level)
                items_modified += 1
    
    # Zurück schreiben
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"  Modified {items_modified} entries in {len(data)} items")
    return items_modified

def main():
    """Hauptfunktion"""
    base_path = Path('public/content/themes/geschichte/weimarer_republik')
    
    files_to_process = [
        base_path / 'Politische_Struktur.json',
        base_path / 'Krisen_Konflikte.json'
    ]
    
    total_modified = 0
    for file_path in files_to_process:
        if file_path.exists():
            modified = process_json_file(file_path)
            total_modified += modified
        else:
            print(f"Warning: {file_path} not found")
    
    print(f"\nTotal entries modified: {total_modified}")

if __name__ == '__main__':
    # Seed für Reproduzierbarkeit (optional - entfernen für echte Randomisierung)
    random.seed()
    main()


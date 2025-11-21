#!/usr/bin/env python3
"""Add BC_001 to BC_010 entries (Level 1) to Business_Communication.json"""

import json
import random

# Level 1 vocabulary for Business_Communication
level1_words = [
    ("email", "E-Mail", "Noun"),
    ("meeting", "Besprechung", "Noun"),
    ("deadline", "Frist", "Noun"),
    ("client", "Kunde", "Noun"),
    ("colleague", "Kollege", "Noun"),
    ("project", "Projekt", "Noun"),
    ("report", "Bericht", "Noun"),
    ("schedule", "Zeitplan", "Noun"),
    ("conference", "Konferenz", "Noun"),
    ("presentation", "Präsentation", "Noun")
]

humorous_distractors = [
    "Kaffeepause", "Mittagspause", "Feierabend", "Wochenende", "Urlaub",
    "Mittagsschlaf", "Kaffeemaschine", "Einkaufsliste", "Karaoke",
    "Schlafenszeit", "Kaffeeklatsch", "Pausenraum"
]

def create_distractors(word_en, word_de):
    """Create 3 regular + 1 humorous distractor"""
    distractors = []
    
    # Similar words for regular distractors
    similar = [
        ("Brief", "letter"),
        ("message", "Nachricht"),
        ("telephone", "Telefon"),
        ("Freund", "friend"),
        ("partner", "Partner"),
        ("boss", "Chef"),
        ("Aufgabe", "task"),
        ("plan", "Plan"),
        ("program", "Programm"),
        ("Artikel", "article"),
        ("document", "Dokument"),
        ("Kalender", "calendar"),
        ("timetable", "Fahrplan"),
        ("Besprechung", "meeting"),
        ("congress", "Kongress"),
        ("seminar", "Seminar"),
        ("Vortrag", "lecture"),
        ("speech", "Rede"),
        ("show", "Show")
    ]
    
    selected = random.sample([s for s in similar if s[0] != word_de and s[1] != word_en], 3)
    for i, (w_de, w_en) in enumerate(selected):
        use_german = random.random() > 0.5
        distractors.append({
            "entry": {
                "word": w_de if use_german else w_en,
                "type": "Wrong"
            },
            "spawnPosition": round(0.2 + i * 0.25, 2),
            "spawnSpread": 0.05,
            "speed": 1.2,
            "points": 100,
            "hp": 1,
            "damage": 1,
            "behavior": "seek_center",
            "context": f"{w_de if use_german else w_en} = {w_en if use_german else w_de}, nicht {word_de}",
            "visual": {
                "color": random.choice(["#FF5722", "#9B59B6", "#E91E63", "#FF9800"]),
                "variant": random.choice(["diamond", "bubble", "square"]),
                "pulsate": True,
                "shake": False,
                "fontSize": 1
            },
            "sound": "explosion_minor",
            "redirect": w_en if use_german else w_de
        })
    
    # Add humorous distractor
    humorous = random.choice(humorous_distractors)
    distractors.append({
        "entry": {
            "word": humorous,
            "type": "Wrong"
        },
        "spawnPosition": round(0.7 + random.random() * 0.2, 2),
        "spawnSpread": 0.05,
        "speed": 1.2,
        "points": 100,
        "hp": 1,
        "damage": 1,
        "behavior": "seek_center",
        "context": f"{humorous} = {humorous.lower()} (humorvoller Distraktor - nicht {word_de}!)",
        "visual": {
            "color": "#FFC107",
            "variant": random.choice(["hexagon", "bubble"]),
            "pulsate": True,
            "shake": True,
            "fontSize": 1
        },
        "sound": "explosion_minor",
        "redirect": humorous.lower()
    })
    
    return distractors

def create_entry(index, word_en, word_de, word_type):
    """Create a level 1 entry"""
    colors = ["#2196F3", "#4CAF50", "#F44336", "#9C27B0", "#00BCD4", 
              "#FF9800", "#607D8B", "#795548", "#3F51B5", "#E91E63"]
    color = colors[index % len(colors)]
    
    return {
        "id": f"BC_{index:03d}",
        "theme": "business_english",
        "chapter": "Business_Communication",
        "level": 1,
        "waveDuration": 3,
        "base": {
            "word": word_en,
            "type": word_type,
            "visual": {
                "tier": 2,
                "size": 1,
                "appearance": "bold",
                "color": color,
                "glow": True,
                "pulsate": True
            }
        },
        "correct": [
            {
                "entry": {
                    "word": word_de,
                    "type": "Translation"
                },
                "spawnPosition": round(random.random(), 2),
                "spawnSpread": 0.05,
                "speed": 0.9,
                "points": 200,
                "pattern": "linear_inward",
                "hp": 1,
                "collectionOrder": 1,
                "context": f"{word_en} = {word_de}",
                "visual": {
                    "color": color,
                    "variant": random.choice(["hexagon", "star", "bubble", "spike"]),
                    "pulsate": False,
                    "fontSize": 1.1
                },
                "sound": "bubble_hit_soft"
            }
        ],
        "distractors": create_distractors(word_en, word_de),
        "meta": {
            "source": "Business English",
            "tags": [
                "communication",
                "level1"
            ],
            "related": [
                f"BC_{index-1:03d}" if index > 1 else None,
                f"BC_{index+1:03d}"
            ],
            "difficultyScaling": {
                "speedMultiplierPerReplay": 1.05,
                "colorContrastFade": True,
                "angleVariance": 0.3
            }
        }
    }

# Read existing file
with open('content/themes/englisch/business_english/Business_Communication.json', 'r', encoding='utf-8') as f:
    existing_entries = json.load(f)

# Create level 1 entries
level1_entries = []
for i, (word_en, word_de, word_type) in enumerate(level1_words, 1):
    level1_entries.append(create_entry(i, word_en, word_de, word_type))

# Fix related entries in level1
for i, entry in enumerate(level1_entries):
    if i > 0:
        entry["meta"]["related"][0] = f"BC_{i:03d}"
    else:
        entry["meta"]["related"][0] = None
    if i < len(level1_entries) - 1:
        entry["meta"]["related"][1] = f"BC_{i+2:03d}"
    else:
        entry["meta"]["related"][1] = "BC_011"

# Fix related entries in existing (BC_010 should point to BC_011)
if existing_entries:
    existing_entries[0]["meta"]["related"][0] = "BC_010"

# Merge: level1 + existing
all_entries = level1_entries + existing_entries

# Write back
with open('content/themes/englisch/business_english/Business_Communication.json', 'w', encoding='utf-8') as f:
    json.dump(all_entries, f, indent=2, ensure_ascii=False)

print(f"Created {len(level1_entries)} level 1 entries")
print(f"Total entries: {len(all_entries)}")
print(f"First ID: {all_entries[0]['id']}")
print(f"Last ID: {all_entries[-1]['id']}")


#!/usr/bin/env python3
"""
Generate The Office Items for WordRush
Creates chapter JSON files with all items from the provided list.
"""

import json
import os
import random

# Theme and chapter configuration
THEME_ID = "michael_schur"
BASE_ID_PREFIX = "MS"

# Chapter mapping: Item number -> Chapter name
CHAPTER_MAPPING = {
    1: "The_Office",   # Jim's Teapot Note
    2: "The_Office",   # World's Best Boss Mug
    3: "The_Office",   # Dwight's Middle Name
    4: "The_Office",   # Pretzel Day
    5: "The_Office",   # Prison Mike
    6: "The_Office",   # The Fire Drill
    7: "The_Office",   # Jim and Pam's Wedding
    8: "The_Office",   # Dundie Awards Categories
    9: "The_Office",   # Toby's Job
    10: "The_Office",  # Kevin's Famous Chili
    11: "The_Office",  # Dwight's Desk Items
    12: "The_Office",  # The Finer Things Club
    13: "The_Office",  # Michael's Nephews
    14: "The_Office",  # Threat Level Midnight
    15: "The_Office",  # Jim's Brothers
    16: "The_Office",  # The CPR Dummy Scene
    17: "The_Office",  # Pam's Art Show
    18: "The_Office",  # Scott's Tots
    19: "The_Office",  # Creed's Real Job
    20: "The_Office",  # The Rabies Awareness Fun Run
    21: "The_Office",  # Dwight's Second Job
    22: "The_Office",  # Phyllis's Wedding
    23: "The_Office",  # The Injury
    24: "The_Office",  # Jim's Proposal
    25: "The_Office",  # The Merger
    26: "The_Office",  # Goodbye Toby Party
    27: "The_Office",  # Angela's Cats
    28: "The_Office",  # The Surplus
    29: "The_Office",  # Finale Dance
    30: "The_Office",  # That's what she said
}

# Item data structure with levels (korrigiert Zeile 54)
ITEMS = {
    1: {"level": 1, "base": "Jim's Teapot Note", "correct": [{"word": "Christmas Card + Teapot", "context": "Das Geschenk an Pam in Season 2 – mit dem geheimen Liebesbrief."}], "distractors": [{"word": "Yogurt Lid Medal", "redirect": "Dundie", "context": "Das war später."}]},
    2: {"level": 1, "base": "World's Best Boss Mug", "correct": [{"word": "Michael Scott", "context": "Selbst gekauft bei Spencer's Gifts."}], "distractors": [{"word": "Dwight owns it", "redirect": "Never", "context": "Dwight hätte es zerstört."}]},
    3: {"level": 1, "base": "Dwight's Middle Name", "correct": [{"word": "Kurt", "context": "Dwight Kurt Schrute – wie sein Opa."}], "distractors": [{"word": "Fart", "redirect": "Prank", "context": "Jim hat das mal auf Wikipedia geändert."}]},
    4: {"level": 2, "base": "Pretzel Day", "correct": [{"word": "Stanley's Favorite Day", "context": "Er isst so viele, dass er fast platzt."}], "distractors": [{"word": "Kevin's Chili Day", "redirect": "Different disaster", "context": "Das war ein sehr schlechter Tag."}]},
    5: {"level": 1, "base": "Prison Mike", "correct": [{"word": "Michael's Alter Ego", "context": "'The worst thing about prison was the Dementors.'"}], "distractors": [{"word": "Date Mike", "redirect": "Nice to meet me", "context": "Das war der Bar-Mike."}]},
    6: {"level": 2, "base": "The Fire Drill", "correct": [{"word": "Cold Open Chaos", "context": "Dwight schneidet das Gesicht der Übungspuppe ab."}], "distractors": [{"word": "Actual Fire", "redirect": "Ryan started the fire", "context": "Das war der Cheesepuff im Toaster."}]},
    7: {"level": 1, "base": "Jim and Pam's Wedding", "correct": [{"word": "Niagara Falls", "context": "Mit dem 'Forever'-Tanz aus Dirty Dancing."}], "distractors": [{"word": "Schrute Farms", "redirect": "Almost", "context": "Dwight wollte es unbedingt."}]},
    8: {"level": 3, "base": "Dundie Awards Categories", "correct": [{"word": "Don't Go in There After Me", "context": "Kevin gewinnt jedes Jahr."}, {"word": "Whitest Sneakers", "context": "Stanley's Stolz."}], "distractors": [{"word": "Best Dad", "redirect": "Michael only", "context": "Den gibt's nur für ihn selbst."}]},
    9: {"level": 1, "base": "Toby's Job", "correct": [{"word": "HR Representative", "context": "Michael hasst ihn mehr als alles."}], "distractors": [{"word": "Scranton Strangler", "redirect": "Theory", "context": "Viele Fans glauben es immer noch."}]},
    10: {"level": 2, "base": "Kevin's Famous Chili", "correct": [{"word": "Cold Open Spill", "context": "Einer der besten Cold Opens aller Zeiten."}], "distractors": [{"word": "He sells it", "redirect": "No", "context": "Er wollte nur Mittagessen."}]},
    11: {"level": 1, "base": "Dwight's Desk Items", "correct": [{"word": "Bobblehead of Himself", "context": "Steht immer auf seinem Schreibtisch."}], "distractors": [{"word": "Stapler in Jell-O", "redirect": "Jim's prank", "context": "Das war Jim gegen Dwight."}]},
    12: {"level": 3, "base": "The Finer Things Club", "correct": [{"word": "Pam, Oscar, Toby", "context": "Exklusiver Literaturkreis – Ryan wurde nie reingelassen."}], "distractors": [{"word": "Jim invited", "redirect": "Banned", "context": "Er war zu laut."}]},
    13: {"level": 1, "base": "Michael's Nephews", "correct": [{"word": "Total Monsters", "context": "Schlagen ihn mit seinen eigenen Golfschlägern."}], "distractors": [{"word": "Cute Kids", "redirect": "Lie", "context": "Michael wollte nur Liebe."}]},
    14: {"level": 2, "base": "Threat Level Midnight", "correct": [{"word": "Michael's Movie", "context": "12 Jahre Produktion – Goldenface vs. Scarn."}], "distractors": [{"word": "Real Hollywood Film", "redirect": "Office only", "context": "Toby spielt sich selbst als Mörder."}]},
    15: {"level": 1, "base": "Jim's Brothers", "correct": [{"word": "Tom and Pete", "context": "Pranken ihn bei seinem Fake-Interview."}], "distractors": [{"word": "Only child", "redirect": "No", "context": "Er hat zwei Brüder."}]},
    16: {"level": 3, "base": "The CPR Dummy Scene", "correct": [{"word": "Dwight cuts the face off", "context": "Und singt 'Stayin' Alive' falsch."}], "distractors": [{"word": "Michael saves it", "redirect": "No", "context": "Er macht alles schlimmer."}]},
    17: {"level": 1, "base": "Pam's Art Show", "correct": [{"word": "Almost nobody came", "context": "Nur Michael kauft ihr Bild."}], "distractors": [{"word": "Sold out", "redirect": "Dream", "context": "Sie war am Boden zerstört."}]},
    18: {"level": 2, "base": "Scott's Tots", "correct": [{"word": "Battery Promise", "context": "Michael versprach College, lieferte Laptop-Batterien."}], "distractors": [{"word": "He paid", "redirect": "Never", "context": "Einer der cringigsten Momente ever."}]},
    19: {"level": 1, "base": "Creed's Real Job", "correct": [{"word": "Quality Assurance", "context": "…und er dealt nebenbei."}], "distractors": [{"word": "Manager for a day", "redirect": "Only once", "context": "Als er dachte, es sei Halloween."}]},
    20: {"level": 3, "base": "The Rabies Awareness Fun Run", "correct": [{"word": "Michael hits Meredith", "context": "Mit dem Auto – deshalb der Run."}], "distractors": [{"word": "Meredith had rabies", "redirect": "Bat bite", "context": "Sie hatte keine Tollwut, nur eine Beckenschwelle."}]},
    21: {"level": 1, "base": "Dwight's Second Job", "correct": [{"word": "Beet Farmer", "context": "Schrute Farms – B&B inklusive."}], "distractors": [{"word": "Vampire Hunter", "redirect": "Joke", "context": "Er glaubt aber dran."}]},
    22: {"level": 2, "base": "Phyllis's Wedding", "correct": [{"word": "Bob Vance, Vance Refrigeration", "context": "Er stellt sich immer so vor."}], "distractors": [{"word": "Bob Phyllis", "redirect": "No", "context": "Niemand nennt ihn so."}]},
    23: {"level": 3, "base": "The Injury", "correct": [{"word": "Michael grills his foot", "context": "Schläft auf einem George Foreman Grill ein."}], "distractors": [{"word": "Dwight concussion", "redirect": "Same episode", "context": "Aber der Hauptunfall war Michael's Bacon-Fuß."}]},
    24: {"level": 1, "base": "Jim's Proposal", "correct": [{"word": "Gas station in the rain", "context": "Einer der romantischsten Momente der TV-Geschichte."}], "distractors": [{"word": "Office roof", "redirect": "Too public", "context": "Das war nur ein Fake-Out."}]},
    25: {"level": 2, "base": "The Merger", "correct": [{"word": "Stamford Branch closes", "context": "Karen, Andy und die anderen kommen nach Scranton."}], "distractors": [{"word": "Dunder Mifflin buys Staples", "redirect": "Never", "context": "Das wäre zu groß gewesen."}]},
    26: {"level": 3, "base": "Goodbye Toby Party", "correct": [{"word": "Michael sings 9,986,000 Minutes", "context": "Parodie auf Rent – cringigste Performance ever."}], "distractors": [{"word": "Toby comes back", "redirect": "Immediately", "context": "Er war nur zwei Wochen weg."}]},
    27: {"level": 1, "base": "Angela's Cats", "correct": [{"word": "Bandit, Garbage, Princess Lady", "context": "Und ca. 30 weitere."}], "distractors": [{"word": "Sprinkles", "redirect": "Dwight killed", "context": "Im Gefrierschrank."}]},
    28: {"level": 2, "base": "The Surplus", "correct": [{"word": "Oscar wants new chairs", "context": "Michael will stattdessen einen Kopierer kaufen."}], "distractors": [{"word": "Party budget", "redirect": "Later", "context": "Das war eine andere Folge."}]},
    29: {"level": 3, "base": "Finale Dance", "correct": [{"word": "Jim & Pam renew vows", "context": "Und alle tanzen zum Chris Brown Song."}], "distractors": [{"word": "Michael returns married", "redirect": "He does", "context": "Aber der Tanz war das eigentliche Highlight."}]},
    30: {"level": 1, "base": "That's what she said", "correct": [{"word": "Michael's Signature Line", "context": "Über 100 Mal gesagt."}], "distractors": [{"word": "Jim invented it", "redirect": "No", "context": "Er hat es nur perfektioniert."}]},
}

def generate_item_id(chapter_abbr, item_num):
    """Generate item ID like MS_TO_001"""
    chapter_abbreviations = {
        "The_Office": "TO"
    }
    abbr = chapter_abbreviations.get(chapter_abbr, "XX")
    return f"{BASE_ID_PREFIX}_{abbr}_{item_num:03d}"

def create_item(item_num, chapter_name, item_data):
    """Create a single item entry"""
    item_id = generate_item_id(chapter_name, item_num)
    
    # Base configuration
    base = {
        "word": item_data["base"],
        "type": "TVShowTerm",
        "visual": {
            "tier": 2,
            "size": 1,
            "appearance": "bold",
            "color": "#9b59b6",
            "glow": True,
            "pulsate": True
        }
    }
    
    # Correct entries - breitere spawnPosition (0.1-0.9)
    correct = []
    available_positions = [round(x * 0.1, 2) for x in range(1, 10)]
    random.shuffle(available_positions)
    
    variants = ["star", "hexagon", "bubble", "spike"]
    uniform_speed = 1.0
    uniform_pattern = "linear_inward"
    
    for idx, corr in enumerate(item_data["correct"]):
        correct.append({
            "entry": {
                "word": corr["word"],
                "type": "CorrectMatch"
            },
            "spawnPosition": available_positions[idx % len(available_positions)],
            "spawnSpread": 0.05,
            "speed": uniform_speed,
            "points": 200,
            "pattern": uniform_pattern,
            "hp": 1,
            "collectionOrder": idx + 1 if len(item_data["correct"]) > 1 else None,
            "context": corr["context"],
            "visual": {
                "color": "#4CAF50",
                "variant": variants[idx % len(variants)],
                "pulsate": False,
                "fontSize": 1.1
            },
            "sound": "bubble_hit_soft"
        })
    
    # Distractor entries - gleiche speed und behavior wie correct
    distractors = []
    distractor_variants = ["square", "diamond", "spike", "bubble"]
    distractor_colors = ["#E91E63", "#9B59B6", "#FF5722", "#FFC107"]
    
    distractor_positions = available_positions[len(item_data["correct"]):]
    if len(distractor_positions) < len(item_data["distractors"]):
        additional = [round(x * 0.1, 2) for x in range(1, 10)]
        distractor_positions.extend([p for p in additional if p not in distractor_positions])
    
    for idx, dist in enumerate(item_data["distractors"]):
        distractors.append({
            "entry": {
                "word": dist["word"],
                "type": "WrongMatch"
            },
            "spawnPosition": distractor_positions[idx % len(distractor_positions)],
            "spawnSpread": 0.05,
            "speed": uniform_speed,
            "points": 100,
            "hp": 1,
            "damage": 1,
            "behavior": uniform_pattern,
            "context": dist["context"],
            "visual": {
                "color": distractor_colors[idx % len(distractor_colors)],
                "variant": distractor_variants[idx % len(distractor_variants)],
                "pulsate": True,
                "shake": False,
                "fontSize": 1.0
            },
            "sound": "explosion_minor",
            "redirect": dist["redirect"]
        })
    
    # Meta information
    meta = {
        "source": "The Office - Michael Schur",
        "tags": ["michael-schur", "the-office", "tv-show", chapter_name.lower()],
        "related": [],
        "difficultyScaling": {
            "speedMultiplierPerReplay": 1.05,
            "colorContrastFade": True,
            "angleVariance": 0.3
        }
    }
    
    return {
        "id": item_id,
        "theme": THEME_ID,
        "chapter": chapter_name,
        "level": item_data["level"],
        "waveDuration": 3,
        "base": base,
        "correct": correct,
        "distractors": distractors,
        "meta": meta
    }

def generate_chapters():
    """Generate all chapter JSON files"""
    output_dir = "public/content/themes/filme/michael_schur"
    os.makedirs(output_dir, exist_ok=True)
    
    chapters = {}
    for item_num, chapter_name in CHAPTER_MAPPING.items():
        if chapter_name not in chapters:
            chapters[chapter_name] = []
        chapters[chapter_name].append(item_num)
    
    for chapter_name, item_nums in chapters.items():
        items = []
        chapter_item_counter = 1
        
        for item_num in sorted(item_nums):
            item_data = ITEMS[item_num]
            item = create_item(chapter_item_counter, chapter_name, item_data)
            items.append(item)
            chapter_item_counter += 1
        
        filename = f"{chapter_name}.json"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(items, f, indent=2, ensure_ascii=False)
        
        print(f"Generated {filename} with {len(items)} items")

if __name__ == "__main__":
    random.seed(42)
    generate_chapters()
    print("All chapter files generated successfully!")


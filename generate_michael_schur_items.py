#!/usr/bin/env python3
"""
Generate Michael Schur - The Good Place Items for WordRush
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
    1: "The_Good_Place",   # Eleanor's Real Home
    2: "The_Good_Place",   # First Frozen Yogurt Shop
    3: "The_Good_Place",   # Jason's Real Identity
    4: "The_Good_Place",   # The Judge
    5: "The_Good_Place",   # Chidi's Problem
    6: "The_Good_Place",   # The Trolley Problem Episode
    7: "The_Good_Place",   # Tahani's Real Name
    8: "The_Good_Place",   # Actual Good Place Committee
    9: "The_Good_Place",   # Janet's Void Button
    10: "The_Good_Place",  # Michael's Real Job
    11: "The_Good_Place",  # Soul Squad Final Members
    12: "The_Good_Place",  # Jeremy Bearimy
    13: "The_Good_Place",  # Jason's Favorite Team
    14: "The_Good_Place",  # Eleanor's Mom
    15: "The_Good_Place",  # The Door
    16: "The_Good_Place",  # Janet's Boyfriend
    17: "The_Good_Place",  # Points System Broken
    18: "The_Good_Place",  # Book Chidi Wrote
    19: "The_Good_Place",  # Bad Janet's Fart Sound
    20: "The_Good_Place",  # Michael's Human Name
    21: "The_Good_Place",  # Last Line of the Show
    22: "The_Good_Place",  # Peeps Chili
    23: "The_Good_Place",  # Mindy's Real Place
    24: "The_Good_Place",  # Number of Reboots
    25: "The_Good_Place",  # Chidi's Soulmate
    26: "The_Good_Place",  # Good Janet's Marble
    27: "The_Good_Place",  # Doug Forcett
    28: "The_Good_Place",  # Eleanor's Last Words to Chidi
    29: "The_Good_Place",  # Jason's Perfect Day
    30: "The_Good_Place",  # The Wave Returns
    31: "The_Good_Place",  # Shawn's Favorite Torture
    32: "The_Good_Place",  # The Four Main Humans
    33: "The_Good_Place",  # Real Good Place Residents
    34: "The_Good_Place",  # Janet Can't
    35: "The_Good_Place",  # Chidi Sees the Time Knife
    36: "The_Good_Place",  # Final Point Total Needed
    37: "The_Good_Place",  # Pillboi's Real Name
    38: "The_Good_Place",  # Eleanor Becomes
    39: "The_Good_Place",  # The Last Human Through the Door
    40: "The_Good_Place",  # What We Owe to Each Other
}

# Item data structure with levels
ITEMS = {
    1: {"level": 1, "base": "Eleanor's Real Home", "correct": [{"word": "Arizona", "context": "Scottsdale – wo sie als furchtbare Verkäuferin lebte."}], "distractors": [{"word": "Florida", "redirect": "Jason's Home", "context": "Jacksonville, nicht Eleanor."}, {"word": "The Bad Place", "redirect": "After Death", "context": "Das kommt erst danach."}]},
    2: {"level": 1, "base": "First Frozen Yogurt Shop", "correct": [{"word": "Sprinkles Are for Winners", "context": "Eleanor's Lieblingsladen im Good Place."}], "distractors": [{"word": "Clam Chowder Only", "redirect": "Bad Place", "context": "Das gab's nur in der Hölle."}]},
    3: {"level": 1, "base": "Jason's Real Identity", "correct": [{"word": "Jianyu", "context": "Der stille Mönch, den eigentlich niemand versteht."}], "distractors": [{"word": "DJ Amateur", "redirect": "Jacksonville", "context": "Das kommt erst später raus."}]},
    4: {"level": 2, "base": "The Judge", "correct": [{"word": "Gen", "context": "Hydrogen-Atom, das alles entscheidet."}, {"word": "Maya Rudolph", "context": "Die echte Schauspielerin hinter Gen."}], "distractors": [{"word": "Shawn", "redirect": "Bad Place Boss", "context": "Der hasst sie nur."}]},
    5: {"level": 1, "base": "Chidi's Problem", "correct": [{"word": "Decision Paralysis", "context": "Kann sich nie entscheiden – sogar bei Milch oder Mandel."}], "distractors": [{"word": "Allergies", "redirect": "Peanuts Kill Him", "context": "Das war nur ein Running Gag."}]},
    6: {"level": 2, "base": "The Trolley Problem Episode", "correct": [{"word": "Season 2 Episode 6", "context": "Chidi quält sich 400-mal."}], "distractors": [{"word": "Season 1", "redirect": "Too Early", "context": "Da war er noch mit Magenta-Mango-Smoothies beschäftigt."}]},
    7: {"level": 1, "base": "Tahani's Real Name", "correct": [{"word": "Tahani Al-Jamil", "context": "Heißt eigentlich 'Glückwunsch' und 'Schönheit'."}], "distractors": [{"word": "Kamilah", "redirect": "Sister", "context": "Die talentiertere Schwester."}]},
    8: {"level": 3, "base": "Actual Good Place Committee", "correct": [{"word": "Never Helped", "context": "Seit 521 Jahren hat niemand mehr jemanden reingelassen."}], "distractors": [{"word": "Very Active", "redirect": "Lazy AF", "context": "Die machen nur Urlaub."}]},
    9: {"level": 2, "base": "Janet's Void Button", "correct": [{"word": "Sends to Nowhere", "context": "Eleanor klickt 800+ Mal."}], "distractors": [{"word": "Deletes Janet", "redirect": "Reboot", "context": "Das war der andere Knopf."}]},
    10: {"level": 1, "base": "Michael's Real Job", "correct": [{"word": "Bad Place Architect", "context": "Er hat die ganze Nachbarschaft gebaut."}], "distractors": [{"word": "Good Place Architect", "redirect": "Lie", "context": "Das war sein Fake-Cover."}]},
    11: {"level": 2, "base": "Soul Squad Final Members", "correct": [{"word": "Eleanor, Chidi, Tahani, Jason, Janet, Michael", "context": "Die sechs, die alles retten."}], "distractors": [{"word": "Plus Doug Forcett", "redirect": "Earth Only", "context": "Der war nur auf Erde."}]},
    12: {"level": 3, "base": "Jeremy Bearimy", "correct": [{"word": "Time is Wavy", "context": "Die Zeitlinie im Jenseits ist ein gekringeltes Wort."}], "distractors": [{"word": "Straight Line", "redirect": "Earth Time", "context": "Nur auf der Erde linear."}]},
    13: {"level": 1, "base": "Jason's Favorite Team", "correct": [{"word": "Jacksonville Jaguars", "context": "Blake Bortles ist sein Gott."}], "distractors": [{"word": "Bortles Is Overrated", "redirect": "Jason's Religion", "context": "Für ihn nicht."}]},
    14: {"level": 2, "base": "Eleanor's Mom", "correct": [{"word": "Donna Shellstrop", "context": "Fake-tot, lebt jetzt mit neuem Namen."}], "distractors": [{"word": "Really Dead", "redirect": "Lie", "context": "Sie taucht in Season 3 wieder auf."}]},
    15: {"level": 3, "base": "The Door", "correct": [{"word": "Exit from Afterlife", "context": "Letzte Erfindung, um für immer Frieden zu finden."}], "distractors": [{"word": "Entrance Only", "redirect": "Finale", "context": "Man kann nur raus, nicht rein."}]},
    16: {"level": 1, "base": "Janet's Boyfriend", "correct": [{"word": "Jason", "context": "Sie heiraten 1000+ Mal."}], "distractors": [{"word": "Derek", "redirect": "Gong Version", "context": "Das war ihr selbstgemachter Rebound."}]},
    17: {"level": 2, "base": "Points System Broken", "correct": [{"word": "Unintended Consequences", "context": "Seit 500 Jahren niemand mehr im Good Place."}], "distractors": [{"word": "Too Many Points", "redirect": "Too Complicated", "context": "Eigentlich das Gegenteil."}]},
    18: {"level": 3, "base": "Book Chidi Wrote", "correct": [{"word": "Who Died and Made Me the Boss?", "context": "Sein 3000-Seiten-Werk über Ethik."}], "distractors": [{"word": "What We Owe to Each Other", "redirect": "Real Book", "context": "Das ist von Scanlon, nicht von Chidi."}]},
    19: {"level": 1, "base": "Bad Janet's Fart Sound", "correct": [{"word": "Classic Fart", "context": "Jedes Mal wenn sie lügt."}], "distractors": [{"word": "Burp", "redirect": "Wrong Janet", "context": "Good Janet macht das nicht."}]},
    20: {"level": 2, "base": "Michael's Human Name", "correct": [{"word": "Michael Real Estate", "context": "Sein Cover auf der Erde."}], "distractors": [{"word": "Fire Squid", "redirect": "Real Form", "context": "So sieht er eigentlich aus."}]},
    21: {"level": 3, "base": "Last Line of the Show", "correct": [{"word": "Take it sleazy", "context": "Eleanor an der Janet am Empfang."}], "distractors": [{"word": "Picture a wave", "redirect": "Earlier", "context": "Das war ein paar Minuten vorher."}]},
    22: {"level": 1, "base": "Peeps Chili", "correct": [{"word": "Eleanor's Signature", "context": "Marshmallow Chicks + Chili = Chaos."}], "distractors": [{"word": "Clam Chowder", "redirect": "Bad Place", "context": "Das gab's nur in der Hölle."}]},
    23: {"level": 2, "base": "Mindy's Real Place", "correct": [{"word": "The Medium Place", "context": "Cocaine + mittelgutes Bier für immer."}], "distractors": [{"word": "Bad Place", "redirect": "Coke Lie", "context": "Sie hat nur gelogen, war Medium."}]},
    24: {"level": 3, "base": "Number of Reboots", "correct": [{"word": "802", "context": "Michael startet die Nachbarschaft so oft neu."}], "distractors": [{"word": "119", "redirect": "Team Cockroach", "context": "Das war nur eine frühe Zahl."}]},
    25: {"level": 1, "base": "Chidi's Soulmate", "correct": [{"word": "Eleanor", "context": "In jeder Version außer einer."}], "distractors": [{"word": "Angelique", "redirect": "One Timeline", "context": "Die eine Ausnahme."}]},
    26: {"level": 2, "base": "Good Janet's Marble", "correct": [{"word": "Makes Anything", "context": "Sie kann alles erschaffen – außer Menschen."}], "distractors": [{"word": "Deletes Things", "redirect": "Bad Janet", "context": "Das macht die böse Version."}]},
    27: {"level": 3, "base": "Doug Forcett", "correct": [{"word": "Lives Like a Monk", "context": "Versucht auf Erde 100 % gut zu sein – und ist unglücklich."}], "distractors": [{"word": "In Good Place", "redirect": "Still on Earth", "context": "Er lebt noch, als Michael ihn besucht."}]},
    28: {"level": 1, "base": "Eleanor's Last Words to Chidi", "correct": [{"word": "I was never good at this stuff", "context": "Bevor sie durch die Tür geht."}], "distractors": [{"word": "See you later", "redirect": "Too casual", "context": "Zu banal für diesen Moment."}]},
    29: {"level": 2, "base": "Jason's Perfect Day", "correct": [{"word": "Perfect 60-Person Wedding", "context": "Mit Jaguars-Spielern als Gäste."}], "distractors": [{"word": "Molotov Cocktails", "redirect": "Old Jason", "context": "Das war vorher."}]},
    30: {"level": 3, "base": "The Wave Returns", "correct": [{"word": "Everything is Fine", "context": "Letzte Szene – die Welle wird wieder zu Janet."}], "distractors": [{"word": "Everything is Bonkers", "redirect": "Bad Place", "context": "Das war die alte Version."}]},
    31: {"level": 1, "base": "Shawn's Favorite Torture", "correct": [{"word": "Cactus in Butts", "context": "Sein Vorschlag für die Menschen."}], "distractors": [{"word": "Bees with Teeth", "redirect": "Vicky", "context": "Das war Vickys Stil."}]},
    32: {"level": 2, "base": "The Four Main Humans", "correct": [{"word": "Eleanor, Chidi, Tahani, Jason", "context": "Das Original-Team Cockroach."}], "distractors": [{"word": "Plus Brent", "redirect": "Later", "context": "Der kam erst in Season 4."}]},
    33: {"level": 3, "base": "Real Good Place Residents", "correct": [{"word": "Hypatia, Plato", "context": "Die einzigen, die wir kurz sehen."}], "distractors": [{"word": "Lisa Loopner", "redirect": "Fake", "context": "Michael's erfundener Name."}]},
    34: {"level": 1, "base": "Janet Can't", "correct": [{"word": "Lie", "context": "Good Janet kann nicht lügen – Bad Janet schon."}], "distractors": [{"word": "Kill", "redirect": "She Can", "context": "Sie hat schon mal Derek gekillt."}]},
    35: {"level": 2, "base": "Chidi Sees the Time Knife", "correct": [{"word": "We've All Seen It", "context": "Die ultimative nihilistische Erkenntnis."}], "distractors": [{"word": "Only Michael", "redirect": "Everyone", "context": "Alle haben die Zeitklinge gesehen."}]},
    36: {"level": 3, "base": "Final Point Total Needed", "correct": [{"word": "There Is No Fixed Number", "context": "Das System war sowieso kaputt."}], "distractors": [{"word": "1 Million Points", "redirect": "Old System", "context": "Das war das alte, kaputte System."}]},
    37: {"level": 1, "base": "Pillboi's Real Name", "correct": [{"word": "Pillboi", "context": "Er hat keinen anderen Namen – er ist einfach Pillboi."}], "distractors": [{"word": "Donkey Doug Jr.", "redirect": "Jason's Dad", "context": "Das ist Jason's Vater."}]},
    38: {"level": 2, "base": "Eleanor Becomes", "correct": [{"word": "Architect", "context": "Sie übernimmt Michael's Job in Season 4."}], "distractors": [{"word": "Judge", "redirect": "Gen", "context": "Das bleibt Maya Rudolph."}]},
    39: {"level": 3, "base": "The Last Human Through the Door", "correct": [{"word": "Eleanor", "context": "Sie ist die Allerletzte, die geht."}], "distractors": [{"word": "Chidi", "redirect": "Earlier", "context": "Er geht als Erster der Vier."}]},
    40: {"level": 1, "base": "What We Owe to Each Other", "correct": [{"word": "Chidi's Favorite Book", "context": "Scanlon's Ethik-Buch – sein Lebensmotto."}], "distractors": [{"word": "Nietzsche", "redirect": "Too Dark", "context": "Zu nihilistisch für Chidi."}]},
}

def generate_item_id(chapter_abbr, item_num):
    """Generate item ID like MS_TGP_001"""
    chapter_abbreviations = {
        "The_Good_Place": "TGP"
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
        "source": "The Good Place - Michael Schur",
        "tags": ["michael-schur", "the-good-place", "tv-show", chapter_name.lower()],
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


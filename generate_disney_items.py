#!/usr/bin/env python3
"""
Generate Disney Items for WordRush
Creates chapter JSON files with all items from the provided list.
"""

import json
import os
import random

# Theme and chapter configuration
THEME_ID = "disney"
BASE_ID_PREFIX = "DS"

# Chapter mapping: Item number -> Chapter name (Frozen 1+2 zusammengefasst)
CHAPTER_MAPPING = {
    1: "Frozen",          # Frozen Fever
    2: "Frozen",          # Anna's Pferdeschwanz
    11: "Frozen",         # Elsa's Castle
    29: "Frozen",         # Olaf's Dream
    3: "Moana",           # Moana / Vaiana
    4: "Rapunzel",        # Rapunzel's Haar
    5: "Encanto",         # Encanto Miracle
    16: "Encanto",        # Mirabel's Door
    6: "Merida",          # Merida's Weapon
    7: "Raya",            # Raya's Trust Game
    8: "Tiana",           # Tiana's Dream
    9: "Mulan",           # Mulan's Secret
    10: "Inside_Out",     # Inside Out 2 Feelings
    12: "Turning_Red",    # Turning Red Mei
    13: "Wish",           # Wish 2023
    14: "Cinderella",     # Cinderella's Deadline
    15: "Luca",           # Luca & Alberto
    17: "Ariel",          # Ariel's Collection
    18: "Soul",           # Soul 2020
    19: "Aladdin",        # Jasmine's Pet
    20: "Beauty_Beast",   # Belle's Lieblingsfarbe
    21: "Zootopia",       # Zootopia Partners
    22: "Coco",           # Coco's Rule
    23: "Pocahontas",     # Pocahontas Canoe Song
    24: "Elemental",      # Elemental 2023
    25: "Snow_White",     # Snow White's Gift
    26: "Big_Hero_6",     # Big Hero 6 Team
    27: "Strange_World",  # Strange World 2022
    28: "Winnie_Pooh",    # Winnie the Pooh's Lieblingsessen
    30: "Descendants",    # Descendants Cast
}

# Item data structure with levels
ITEMS = {
    1: {"level": 1, "base": "Frozen Fever", "correct": [{"word": "Let It Go", "context": "Elsa's anthem that every 12-Jährige 2014–2025 mitsingen kann."}, {"word": "Idina Menzel Voice", "context": "Die echte Stimme hinter Elsa – nicht Demi Lovato."}], "distractors": [{"word": "Shut the Door", "redirect": "Let It Go", "context": "Das sagt Mama, wenn's zieht."}, {"word": "Demi Lovato Only", "redirect": "Idina Broadway", "context": "Demi singt nur die Radio-Version."}]},
    2: {"level": 1, "base": "Anna's Pferdeschwanz", "correct": [{"word": "Two Braids", "context": "Signature Look aus Frozen 1 + 2."}], "distractors": [{"word": "One Braid", "redirect": "Merida Style", "context": "Das ist die wilde Schotten-Prinzessin."}, {"word": "Bun Crown", "redirect": "Elsa Coronation", "context": "Anna trägt nie den strengen Dutt."}]},
    3: {"level": 2, "base": "Moana / Vaiana", "correct": [{"word": "How Far I'll Go", "context": "Auliʻi Cravalho's Oscar-nominierter Hit."}, {"word": "The Ocean Chose Me", "context": "Vaianas zentrale Message an 12-Jährige."}], "distractors": [{"word": "Shiny", "redirect": "Tamatoa Crab", "context": "Das glitzert, ist aber nicht ihr Song."}, {"word": "You're Welcome", "redirect": "Maui Flex", "context": "Dwayne Johnson stiehlt die Show, nicht Vaiana."}]},
    4: {"level": 1, "base": "Rapunzel's Haar", "correct": [{"word": "70 Feet Long", "context": "Ca. 21 Meter – offiziell von Disney gemessen."}, {"word": "Healing Glow", "context": "Golden magic nur beim Singen."}], "distractors": [{"word": "70 Inches", "redirect": "70 Feet", "context": "Das wär nur bis zur Hüfte – langweilig."}, {"word": "Always Glowing", "redirect": "Only When Singing", "context": "Sonst wäre sie ein wandelnder Leuchtturm."}]},
    5: {"level": 2, "base": "Encanto Miracle", "correct": [{"word": "Casita", "context": "Das lebendige Haus der Madrigals."}, {"word": "We Don't Talk About Bruno", "context": "Nr.1 auf Spotify Global 2022 – Disney-Rekord."}], "distractors": [{"word": "Mirabel's Gift", "redirect": "No Gift", "context": "Sie ist die einzige ohne Superkraft."}, {"word": "Surface Pressure", "redirect": "Luisa Song", "context": "Stark, aber nicht das geheime Lied."}]},
    6: {"level": 1, "base": "Merida's Weapon", "correct": [{"word": "Bow and Arrow", "context": "Erste Disney-Prinzessin mit echter Waffe."}], "distractors": [{"word": "Sword", "redirect": "Mulan", "context": "Die kämpft mit Schwert, nicht Merida."}, {"word": "Magic Wand", "redirect": "Fairy Godmother", "context": "Merida löst alles selbst, kein Zauberstab nein danke."}]},
    7: {"level": 3, "base": "Raya's Trust Game", "correct": [{"word": "Sisu Dragon", "context": "Awkwafina als chaotisch-weiser Wasserdrache."}, {"word": "Last Dragon Gem", "context": "Raya muss alle Teile wieder zusammenfügen."}], "distractors": [{"word": "Mushu", "redirect": "Mulan Dragon", "context": "Kleiner roter Chaos-Drache aus 1998."}, {"word": "Trust Nobody", "redirect": "Trust Again", "context": "Genau das Gegenteil ist die Message."}]},
    8: {"level": 2, "base": "Tiana's Dream", "correct": [{"word": "Own Restaurant", "context": "Tiana's Palace – erste schwarze Disney-Prinzessin mit Businessplan."}], "distractors": [{"word": "Marry Prince", "redirect": "Work Hard", "context": "Sie will kein Schloss, sondern eine Küche."}]},
    9: {"level": 1, "base": "Mulan's Secret", "correct": [{"word": "Ping", "context": "Ihr männlicher Tarnname in der Armee."}], "distractors": [{"word": "Ling", "redirect": "Soldier Buddy", "context": "Das ist ihr Kumpel, nicht sie."}, {"word": "Fa Mulan", "redirect": "Ping", "context": "Nur die Familie nennt sie so im Krieg."}]},
    10: {"level": 2, "base": "Inside Out 2 Feelings", "correct": [{"word": "Anxiety", "context": "Neues Hauptgefühl bei Riley im Teenager-Alter."}, {"word": "Ennui", "context": "Französisches Langeweile-Gefühl auf der Couch."}], "distractors": [{"word": "Love", "redirect": "Coming Soon", "context": "Wird erst in Inside Out 3 erwartet."}, {"word": "Hunger", "redirect": "Not an Emotion", "context": "Das ist nur Mittagspause."}]},
    11: {"level": 1, "base": "Elsa's Castle", "correct": [{"word": "Ice Palace", "context": "Elsa baut es in einer Nacht auf dem North Mountain."}], "distractors": [{"word": "Arendelle Castle", "redirect": "Family Home", "context": "Da wohnt sie vorher mit Anna."}]},
    12: {"level": 3, "base": "Turning Red Mei", "correct": [{"word": "Red Panda", "context": "Mei verwandelt sich bei Aufregung in riesigen roten Panda."}, {"word": "4*Town", "context": "Boyband, für die sie alles tun würde."}], "distractors": [{"word": "Red Fox", "redirect": "Panda Power", "context": "Zu klein und nicht flauschig genug."}, {"word": "One Direction", "redirect": "Wrong Era", "context": "Die waren 2013, nicht 2002."}]},
    13: {"level": 2, "base": "Wish 2023", "correct": [{"word": "Star Boy", "context": "Der Stern wird zum Menschen – Disney's 100th Jubiläum."}, {"word": "Asha", "context": "Erste afrikanisch-portugiesische Prinzessin."}], "distractors": [{"word": "King Magnifico", "redirect": "Villain", "context": "Der Böse, nicht der Wunsch-Erfüller."}]},
    14: {"level": 1, "base": "Cinderella's Deadline", "correct": [{"word": "Midnight", "context": "Kutsche wird wieder Kürbis, Schuhe bleiben."}], "distractors": [{"word": "Noon", "redirect": "Wrong Fairy Tale", "context": "Das ist eher Aschenputtel-Morgenmuffel."}]},
    15: {"level": 3, "base": "Luca & Alberto", "correct": [{"word": "Sea Monsters", "context": "Jungen werden an Land zu Menschen – Portorosso Sommer."}, {"word": "Silenzio Bruno", "context": "Loser-Spruch, wenn die Angst kommt."}], "distractors": [{"word": "Mermaids", "redirect": "Sea Monsters", "context": "Die haben Flossen, nicht Beine."}, {"word": "Vespa Dream", "redirect": "Human Goal", "context": "Die wollen das Ding, aber sind trotzdem Monster."}]},
    16: {"level": 2, "base": "Mirabel's Door", "correct": [{"word": "No Glow", "context": "Sie ist die einzige Madrigal ohne magische Tür."}], "distractors": [{"word": "Butterfly Door", "redirect": "Future Hint", "context": "Kommt erst am Ende – Spoiler."}]},
    17: {"level": 1, "base": "Ariel's Collection", "correct": [{"word": "Thingamabobs", "context": "Sie hat 20 – sie hat 20!"}, {"word": "Dinglehopper", "context": "Gabel = Haar-Kamm für Meerjungfrauen."}], "distractors": [{"word": "Snarfblat", "redirect": "Made Up", "context": "Datum erfunden, um Sebastian zu trollen."}]},
    18: {"level": 3, "base": "Soul 2020", "correct": [{"word": "22", "context": "Die Seele, die nicht leben will – bis Joe kommt."}, {"word": "Great Before", "context": "Ort, wo Seelen ihre Persönlichkeit finden."}], "distractors": [{"word": "Great After", "redirect": "Wrong Side", "context": "Das ist der Todesteil."}]},
    19: {"level": 2, "base": "Jasmine's Pet", "correct": [{"word": "Rajah Tiger", "context": "Treuester Bodyguard im Palast."}], "distractors": [{"word": "Abu", "redirect": "Aladdin's Monkey", "context": "Falscher Prinzessinnen-Begleiter."}, {"word": "Iago", "redirect": "Jafar's Parrot", "context": "Der plappert nur Böses."}]},
    20: {"level": 1, "base": "Belle's Lieblingsfarbe", "correct": [{"word": "Blue Dress", "context": "Ihr ikonischer Dorf-Look – nicht das gelbe Ballkleid."}], "distractors": [{"word": "Yellow Only", "redirect": "Ball Gown", "context": "Das trägt sie nur einmal."}]},
    21: {"level": 3, "base": "Zootopia Partners", "correct": [{"word": "Judy & Nick", "context": "Hase + Fuchs = beste Disney-Cop-Duo ever."}, {"word": "Sloth Flash", "context": "DMV-Legende, die 2025 immer noch zitiert wird."}], "distractors": [{"word": "Judy & Gideon", "redirect": "Bully Fox", "context": "Kindheits-Schläger, kein Partner."}]},
    22: {"level": 2, "base": "Coco's Rule", "correct": [{"word": "No Music Ban", "context": "Familie hasst Musik – bis Miguel kommt."}], "distractors": [{"word": "No Shoes", "redirect": "Rivera Family", "context": "Die machen Schuhe, nicht hassen sie."}]},
    23: {"level": 1, "base": "Pocahontas Canoe Song", "correct": [{"word": "Colors of the Wind", "context": "Oscar-Gewinner 1995 – immer noch in jeder Playlist."}], "distractors": [{"word": "Just Around Riverbend", "redirect": "Adventure Song", "context": "Cool, aber nicht die Hymne."}]},
    24: {"level": 3, "base": "Elemental 2023", "correct": [{"word": "Ember & Wade", "context": "Feuer + Wasser = impossible Disney-Couple."}, {"word": "Firetown", "context": "Viertel nur für Feuer-Elemente."}], "distractors": [{"word": "Ice & Fire", "redirect": "Frozen", "context": "Falsches Elementar-Paar."}]},
    25: {"level": 1, "base": "Snow White's Gift", "correct": [{"word": "Poison Apple", "context": "Klassiker – eine Hexe, ein Biss, Koma."}], "distractors": [{"word": "Golden Apple", "redirect": "Greek Myth", "context": "Das war Paris & Helena."}]},
    26: {"level": 2, "base": "Big Hero 6 Team", "correct": [{"word": "Baymax", "context": "Aufblasbarer Healthcare-Roboter."}, {"word": "Hiro Hamada", "context": "14-jähriger Genius – jüngster Disney-Protitelheld."}], "distractors": [{"word": "Fredzilla", "redirect": "Comic Nerd", "context": "Der im Monster-Kostüm – kein echter Riese."}]},
    27: {"level": 3, "base": "Strange World 2022", "correct": [{"word": "Splat", "context": "Der grüne Wackelpudding-Begleiter."}], "distractors": [{"word": "Blob", "redirect": "Pixar", "context": "Das war in Luca."}]},
    28: {"level": 1, "base": "Winnie the Pooh's Lieblingsessen", "correct": [{"word": "Honey", "context": "Honigtopf immer leer – Klassiker seit 1926."}], "distractors": [{"word": "Carrots", "redirect": "Rabbit", "context": "Das ist Rabbit's Essen, nicht Pooh's."}]},
    29: {"level": 2, "base": "Olaf's Dream", "correct": [{"word": "Summer", "context": "Schneemann will Sonne – tragisch komisch."}], "distractors": [{"word": "Winter Forever", "redirect": "Elsa Vibes", "context": "Das wäre zu einfach für Olaf."}]},
    30: {"level": 3, "base": "Descendants Cast 2015–2019", "correct": [{"word": "Mal", "context": "Tochter von Maleficent – purple hair queen."}, {"word": "Rotten to the Core", "context": "Ihr erster Banger."}], "distractors": [{"word": "Uma", "redirect": "Descendants 2", "context": "Ursula-Tochter kommt erst später."}, {"word": "Good to Be Bad", "redirect": "Later Song", "context": "Das ist erst Teil 3."}]},
}

def generate_item_id(chapter_abbr, item_num):
    """Generate item ID like DS_FR_001"""
    chapter_abbreviations = {
        "Frozen": "FR",
        "Moana": "MO",
        "Rapunzel": "RP",
        "Encanto": "EN",
        "Merida": "ME",
        "Raya": "RA",
        "Tiana": "TI",
        "Mulan": "MU",
        "Inside_Out": "IO",
        "Turning_Red": "TR",
        "Wish": "WI",
        "Cinderella": "CI",
        "Luca": "LU",
        "Ariel": "AR",
        "Soul": "SO",
        "Aladdin": "AL",
        "Beauty_Beast": "BB",
        "Zootopia": "ZO",
        "Coco": "CO",
        "Pocahontas": "PO",
        "Elemental": "EL",
        "Snow_White": "SW",
        "Big_Hero_6": "BH",
        "Strange_World": "ST",
        "Winnie_Pooh": "WP",
        "Descendants": "DE"
    }
    abbr = chapter_abbreviations.get(chapter_abbr, "XX")
    return f"{BASE_ID_PREFIX}_{abbr}_{item_num:03d}"

def create_item(item_num, chapter_name, item_data):
    """Create a single item entry"""
    item_id = generate_item_id(chapter_name, item_num)
    
    # Base configuration
    base = {
        "word": item_data["base"],
        "type": "DisneyTerm",
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
        "source": "Disney Filme & Serien",
        "tags": ["disney", "filme", "animiert", chapter_name.lower()],
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
    output_dir = "public/content/themes/filme/disney"
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


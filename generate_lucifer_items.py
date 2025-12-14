#!/usr/bin/env python3
"""
Generate Lucifer Items for WordRush
Creates chapter JSON files with all items from the provided list.
"""

import json
import os
import random

# Theme and chapter configuration
THEME_ID = "neil_gaiman"
BASE_ID_PREFIX = "NG"

# Chapter mapping: Item number -> Chapter name
CHAPTER_MAPPING = {
    1: "Lucifer",   # Lucifer's Nachname
    2: "Lucifer",   # Lucifers Club in L.A.
    3: "Lucifer",   # Lucifers Flügel
    4: "Lucifer",   # Lucifers Therapeutin
    5: "Lucifer",   # Chloes Nachname
    6: "Lucifer",   # Lucifers größter Wunsch (Staffel 1)
    7: "Lucifer",   # Maze's richtiger Name
    8: "Lucifer",   # Lucifers Auto-Kennzeichen
    9: "Lucifer",   # Amenadiel's Zeit-Stopp-Fähigkeit
    10: "Lucifer",  # Chloes Wunder
    11: "Lucifer",  # Dan's Spitzname
    12: "Lucifer",  # Lucifers Klavier-Song
    13: "Lucifer",  # Trixie's Nachname
    14: "Lucifer",  # Lucifers Teufel-Gesicht
    15: "Lucifer",  # Wer tötet Malcolm
    16: "Lucifer",  # Lucifers Strafe für Sünder
    17: "Lucifer",  # Uriel's Klinge
    18: "Lucifer",  # Wer ist die Sinnliche Göttin
    19: "Lucifer",  # Lucifers Narbe am Rücken
    20: "Lucifer",  # Eve's Rückkehr (Staffel 4)
    21: "Lucifer",  # Wer wird Höllenkönigin
    22: "Lucifer",  # Lucifers größtes Trauma
    23: "Lucifer",  # Die Prophezeiung
    24: "Lucifer",  # Letzte Szene der Serie
    25: "Lucifer",  # Lucifers Anzug-Farbe
    26: "Lucifer",  # Ella's Geheimnis
    27: "Lucifer",  # Cain =
    28: "Lucifer",  # Rory's richtige Identität
    29: "Lucifer",  # Lucifers echter Name auf Erden
    30: "Lucifer",  # Wer sagt 'Detective!'
    31: "Lucifer",  # Lucifers Unverwundbarkeit
    32: "Lucifer",  # Die Silberstadt
    33: "Lucifer",  # Maze's Seelen-Status
    34: "Lucifer",  # Wer spielt Gott
    35: "Lucifer",  # Lucifers Lieblingswort
    36: "Lucifer",  # Die Flügel, die zurückkommen
    37: "Lucifer",  # Chloes Abschied
    38: "Lucifer",  # Wer ist Father Kinley
    39: "Lucifer",  # Rory's Flügel
    40: "Lucifer",  # Lucifers letzter Satz
    41: "Lucifer",  # Wer tötet Cain
    42: "Lucifer",  # Die echte Hölle
    43: "Lucifer",  # Lucifers Cocktail
    44: "Lucifer",  # Wer ist Michael
    45: "Lucifer",  # Das Musical-Folge
    46: "Lucifer",  # Lucifers Lieblingsfluch
    47: "Lucifer",  # Wer ist Le Mec
    48: "Lucifer",  # Chloes Spitzname für Lucifer
    49: "Lucifer",  # Die letzte Einstellung
    50: "Lucifer",  # Serien-Ende 2021
}

# Item data structure with levels
ITEMS = {
    1: {"level": 1, "base": "Lucifer's Nachname", "correct": [{"word": "Morningstar", "context": "Der gefallene Engel heißt Lucifer Morningstar."}], "distractors": [{"word": "Lux", "redirect": "Nur sein Club", "context": "Das ist nur der Club-Name."}, {"word": "Devilface", "redirect": "Spitzname", "context": "Nur ein Spitzname, nicht der echte Name."}]},
    2: {"level": 1, "base": "Lucifers Club in L.A.", "correct": [{"word": "Lux", "context": "Der ehemalige Himmel wird zur Nobel-Disco."}], "distractors": [{"word": "Hell", "redirect": "Unten", "context": "Die Hölle ist woanders."}, {"word": "Pentecostal Coin Laundry", "redirect": "Maze's Waschsalon", "context": "Das ist Maze's Waschsalon, nicht Lucifers Club."}]},
    3: {"level": 1, "base": "Lucifers Flügel", "correct": [{"word": "Weiß, später abgeschnitten", "context": "Er hat sie selbst abgeschnitten – Maze bewahrt sie auf."}], "distractors": [{"word": "Schwarz", "redirect": "Film-Klischee", "context": "Das ist nur ein Film-Klischee."}, {"word": "Fledermaus", "redirect": "Nur im Teufel-Gesicht", "context": "Nur wenn er sein Teufel-Gesicht zeigt."}]},
    4: {"level": 2, "base": "Lucifers Therapeutin", "correct": [{"word": "Dr. Linda Martin", "context": "Die Einzige, die die Wahrheit kennt – und trotzdem weitermacht."}], "distractors": [{"word": "Dr. Canaan", "redirect": "Bösewicht", "context": "Der war ein Bösewicht, kein Therapeut."}, {"word": "Eve", "redirect": "Später Patientin", "context": "Eve wird später Patientin, ist aber nicht die Therapeutin."}]},
    5: {"level": 1, "base": "Chloes Nachname", "correct": [{"word": "Decker", "context": "→ Deckerstar ist geboren."}], "distractors": [{"word": "Danvers", "redirect": "Supergirl", "context": "Das ist Supergirl, nicht Chloe."}, {"word": "Pierce", "redirect": "Cain", "context": "Das ist Cain, nicht Chloe."}]},
    6: {"level": 1, "base": "Lucifers größter Wunsch (Staffel 1)", "correct": [{"word": "Was mich antörnt", "context": "Die berühmte Frage an jede Person."}], "distractors": [{"word": "Zurück in die Hölle", "redirect": "Später", "context": "Das will er erst später."}, {"word": "Papa töten", "redirect": "Nur Gott", "context": "Das will nur Gott, nicht Lucifer."}]},
    7: {"level": 2, "base": "Maze's richtiger Name", "correct": [{"word": "Mazikeen", "context": "Tochter von Lilith, Dämonin der Hölle."}], "distractors": [{"word": "Mazda", "redirect": "Auto", "context": "Das ist ein Auto, kein Name."}, {"word": "Mazikeen Smith", "redirect": "Fake-Ausweis", "context": "Das ist nur ihr Fake-Ausweis-Name."}]},
    8: {"level": 1, "base": "Lucifers Auto-Kennzeichen", "correct": [{"word": "FALL1N1", "context": "Fallen One – ganz subtil."}], "distractors": [{"word": "666", "redirect": "Zu offensichtlich", "context": "Das wäre zu offensichtlich für Lucifer."}, {"word": "GOD 01", "redirect": "Sein Dad", "context": "Das wäre eher für Gott."}]},
    9: {"level": 2, "base": "Amenadiel's Zeit-Stopp-Fähigkeit", "correct": [{"word": "Verliert sie auf Erde", "context": "Weil er Zweifel hat."}], "distractors": [{"word": "Hat sie immer", "redirect": "Falsch", "context": "Er verliert sie, wenn er Zweifel hat."}, {"word": "Nur in der Hölle", "redirect": "Nein", "context": "Er verliert sie auf der Erde."}]},
    10: {"level": 3, "base": "Chloes Wunder", "correct": [{"word": "Sie ist ein Wunder Gottes", "context": "Absichtlich zur Erde geschickt, um Lucifer zu beeinflussen."}], "distractors": [{"word": "Halb-Engel", "redirect": "Nein", "context": "Sie ist ein Wunder, kein Halb-Engel."}, {"word": "Nur Zufall", "redirect": "Gott sagt nein", "context": "Gott sagt, es war kein Zufall."}]},
    11: {"level": 1, "base": "Dan's Spitzname", "correct": [{"word": "Detective Douche", "context": "Lucifer's Lieblingsbezeichnung."}], "distractors": [{"word": "Detective Dad", "redirect": "Später", "context": "Das wird er erst später genannt."}, {"word": "Espinoza", "redirect": "Zu normal", "context": "Das ist sein echter Name, kein Spitzname."}]},
    12: {"level": 2, "base": "Lucifers Klavier-Song", "correct": [{"word": "Creep (Radiohead)", "context": "In der Pilotfolge – Gänsehaut."}], "distractors": [{"word": "Wonderwall", "redirect": "Klischee", "context": "Das wäre zu klischeehaft."}, {"word": "Hallelujah", "redirect": "Später", "context": "Das kommt erst später."}]},
    13: {"level": 1, "base": "Trixie's Nachname", "correct": [{"word": "Espinoza", "context": "Tochter von Chloe und Dan."}], "distractors": [{"word": "Decker", "redirect": "Mutter", "context": "Das ist der Nachname ihrer Mutter."}, {"word": "Morningstar", "redirect": "Wunschdenken", "context": "Das wäre Wunschdenken."}]},
    14: {"level": 3, "base": "Lucifers Teufel-Gesicht", "correct": [{"word": "Rot, verbrannt, ohne Haare", "context": "Ersche Menschen sehen es nur, wenn er will."}], "distractors": [{"word": "Hörner + Ziegenfüße", "redirect": "Mittelalter-Klischee", "context": "Das ist nur ein Mittelalter-Klischee."}, {"word": "Schön", "redirect": "Nur Chloe", "context": "Nur Chloe sieht es als schön."}]},
    15: {"level": 2, "base": "Wer tötet Malcolm", "correct": [{"word": "Amenadiel", "context": "Mit Maze's Dämonenmesser."}], "distractors": [{"word": "Lucifer", "redirect": "Nein", "context": "Lucifer tötet ihn nicht."}, {"word": "Chloe", "redirect": "Fast", "context": "Chloe hätte es fast getan, aber nicht."}]},
    16: {"level": 1, "base": "Lucifers Strafe für Sünder", "correct": [{"word": "Schuldgefühle", "context": "Er zwingt sie, ihre tiefsten Geheimnisse zu gestehen."}], "distractors": [{"word": "Feuer + Folter", "redirect": "Alte Schule", "context": "Das war die alte Methode, nicht mehr."}]},
    17: {"level": 2, "base": "Uriel's Klinge", "correct": [{"word": "Azrael's Klinge", "context": "Kann alles auslöschen – sogar Engel."}], "distractors": [{"word": "Flaming Sword", "redirect": "Lucifer's", "context": "Das ist Lucifers Schwert, nicht Uriels Klinge."}]},
    18: {"level": 3, "base": "Wer ist die Sinnliche Göttin", "correct": [{"word": "Mum = Charlotte Richards", "context": "Göttin kommt in Menschenkörper."}], "distractors": [{"word": "Eve", "redirect": "Später", "context": "Eve kommt erst später."}, {"word": "Lilith", "redirect": "Maze's Mom", "context": "Lilith ist Maze's Mom, nicht die Sinnliche Göttin."}]},
    19: {"level": 1, "base": "Lucifers Narbe am Rücken", "correct": [{"word": "Flügel abgeschnitten", "context": "Selbst mit Maze's Messer gemacht."}], "distractors": [{"word": "Gott tat es", "redirect": "Nein", "context": "Lucifer hat es selbst gemacht."}]},
    20: {"level": 2, "base": "Eve's Rückkehr (Staffel 4)", "correct": [{"word": "Sie will Lucifer zurück", "context": "Und bringt Chaos ins Lux."}], "distractors": [{"word": "Sie ist böse", "redirect": "Nein, nur verloren", "context": "Sie ist nicht böse, nur verloren."}]},
    21: {"level": 3, "base": "Wer wird Höllenkönigin", "correct": [{"word": "Maze", "context": "Am Ende Staffel 6 – mit Adam's Seele."}], "distractors": [{"word": "Chloe", "redirect": "Wird Polizistin in Hölle", "context": "Chloe wird Polizistin in der Hölle, nicht Königin."}, {"word": "Eve", "redirect": "Bleibt auf Erde", "context": "Eve bleibt auf der Erde."}]},
    22: {"level": 1, "base": "Lucifers größtes Trauma", "correct": [{"word": "Höllenschleife mit Uriel", "context": "Er tötet seinen Bruder – ewig Schuld."}], "distractors": [{"word": "Fall aus Himmel", "redirect": "Sekundär", "context": "Das ist sekundär, nicht das größte Trauma."}]},
    23: {"level": 2, "base": "Die Prophezeiung", "correct": [{"word": "Lucifer wird Chloe töten", "context": "…aber er opfert sich stattdessen."}], "distractors": [{"word": "Chloe tötet Lucifer", "redirect": "Falsch", "context": "Das ist falsch, es ist umgekehrt."}]},
    24: {"level": 3, "base": "Letzte Szene der Serie", "correct": [{"word": "Lucifer & Chloe in der Hölle therapieren", "context": "Für immer – in einer Schleife der Liebe."}], "distractors": [{"word": "Beide im Himmel", "redirect": "Fast", "context": "Fast, aber sie bleiben in der Hölle."}]},
    25: {"level": 1, "base": "Lucifers Anzug-Farbe", "correct": [{"word": "Immer schwarz oder dunkel", "context": "Außer bei der Hochzeit – dann weiß."}], "distractors": [{"word": "Rot", "redirect": "Klischee", "context": "Das wäre zu klischeehaft."}]},
    26: {"level": 2, "base": "Ella's Geheimnis", "correct": [{"word": "Sie sieht Geister", "context": "Seit Kindheit – Azrael ist ihre Freundin."}], "distractors": [{"word": "Sie ist Engel", "redirect": "Nein", "context": "Sie ist kein Engel, nur eine normale Person."}]},
    27: {"level": 1, "base": "Cain = ", "correct": [{"word": "Lieutenant Marcus Pierce", "context": "Der erste Mörder der Menschheit."}], "distractors": [{"word": "Father Kinley", "redirect": "Priester", "context": "Father Kinley ist ein Priester, nicht Cain."}]},
    28: {"level": 3, "base": "Rory's richtige Identität", "correct": [{"word": "Tochter von Chloe & Lucifer", "context": "Zeitreise-Engel aus der Zukunft."}], "distractors": [{"word": "Amenadiel's Kind", "redirect": "Charlie", "context": "Charlie ist Amenadiels Kind, nicht Rory."}]},
    29: {"level": 2, "base": "Lucifers echter Name auf Erden", "correct": [{"word": "Samael", "context": "Den er hasst – nur Gott nennt ihn so."}], "distractors": [{"word": "Lucifer", "redirect": "Selbstgewählt", "context": "Lucifer ist selbstgewählt, nicht sein echter Name."}]},
    30: {"level": 1, "base": "Wer sagt 'Detective!'", "correct": [{"word": "Lucifer immer zu Chloe", "context": "Mit diesem ganz bestimmten Tonfall."}], "distractors": [{"word": "Dan", "redirect": "Nie", "context": "Dan sagt das nie."}]},
    31: {"level": 2, "base": "Lucifers Unverwundbarkeit", "correct": [{"word": "Nur Chloe macht ihn verwundbar", "context": "Weil Liebe."}], "distractors": [{"word": "Niemand", "redirect": "Falsch", "context": "Chloe macht ihn verwundbar."}]},
    32: {"level": 3, "base": "Die Silberstadt", "correct": [{"word": "Heimat der Engel", "context": "Wo Gott wohnt – wir sehen sie nur einmal."}], "distractors": [{"word": "Lux", "redirect": "Erd-Kopie", "context": "Lux ist nur eine Erd-Kopie, nicht die Silberstadt."}]},
    33: {"level": 1, "base": "Maze's Seelen-Status", "correct": [{"word": "Sie bekommt eine Seele", "context": "In Staffel 6 durch Liebe zu Eve."}], "distractors": [{"word": "Bleibt Dämon", "redirect": "Fast", "context": "Sie bekommt eine Seele, bleibt nicht Dämon."}]},
    34: {"level": 2, "base": "Wer spielt Gott", "correct": [{"word": "Dennis Haysbert", "context": "Ab Staffel 5 – mit der beste Dad ever."}], "distractors": [{"word": "Tom Ellis", "redirect": "Nur Lucifer", "context": "Tom Ellis spielt nur Lucifer, nicht Gott."}]},
    35: {"level": 1, "base": "Lucifers Lieblingswort", "correct": [{"word": "Desire", "context": "Oder 'What do you desire?'"}], "distractors": [{"word": "Punishment", "redirect": "Alte Zeit", "context": "Das war in der alten Zeit, nicht mehr."}]},
    36: {"level": 3, "base": "Die Flügel, die zurückkommen", "correct": [{"word": "Weiß, aber er schneidet sie wieder ab", "context": "Weil er sich nicht verändern will."}], "distractors": [{"word": "Bleiben weiß", "redirect": "Nur kurz", "context": "Er schneidet sie wieder ab, sie bleiben nicht."}]},
    37: {"level": 2, "base": "Chloes Abschied", "correct": [{"word": "Stirbt alt, geht in Hölle", "context": "Um mit Lucifer Seelen zu therapieren."}], "distractors": [{"word": "Bleibt auf Erde", "redirect": "Nein", "context": "Sie geht in die Hölle, bleibt nicht auf der Erde."}]},
    38: {"level": 1, "base": "Wer ist Father Kinley", "correct": [{"word": "Will Lucifer zurück in die Hölle", "context": "Mit einer Prophezeiung."}], "distractors": [{"word": "Guter Priester", "redirect": "Böse", "context": "Er ist böse, kein guter Priester."}]},
    39: {"level": 2, "base": "Rory's Flügel", "correct": [{"word": "Rot-schwarz", "context": "Weil sie halb Dämon, halb Engel ist."}], "distractors": [{"word": "Weiß", "redirect": "Zu brav", "context": "Ihre Flügel sind rot-schwarz, nicht weiß."}]},
    40: {"level": 1, "base": "Lucifers letzter Satz", "correct": [{"word": "Tell me, what do you desire?", "context": "An die erste Seele in der Höllentherapie."}], "distractors": [{"word": "I love you", "redirect": "Zu Chloe früher", "context": "Das sagt er zu Chloe früher, nicht am Ende."}]},
    41: {"level": 2, "base": "Wer tötet Cain", "correct": [{"word": "Chloe", "context": "Mit Maze's Dämonenmesser."}], "distractors": [{"word": "Lucifer", "redirect": "Fast", "context": "Lucifer hätte es fast getan, aber nicht."}]},
    42: {"level": 3, "base": "Die echte Hölle", "correct": [{"word": "Schuldschleifen", "context": "Jede Seele erlebt ihre eigene Schuld für immer."}], "distractors": [{"word": "Feuer + Teufel", "redirect": "Lucifer's alte Methode", "context": "Das war Lucifers alte Methode, nicht die echte Hölle."}]},
    43: {"level": 1, "base": "Lucifers Cocktail", "correct": [{"word": "Old Fashioned", "context": "Oder einfach alles Starke."}], "distractors": [{"word": "Apfel-Martini", "redirect": "Eve", "context": "Das ist Eves Cocktail, nicht Lucifers."}]},
    44: {"level": 2, "base": "Wer ist Michael", "correct": [{"word": "Lucifers Zwillingsbruder", "context": "Der Angstengel – gespielt von Tom Ellis mit Akzent."}], "distractors": [{"word": "Amenadiel", "redirect": "Älterer Bruder", "context": "Amenadiel ist der ältere Bruder, nicht Michael."}]},
    45: {"level": 3, "base": "Das Musical-Folge", "correct": [{"word": "Season 6 Episode 9", "context": "'Bloody Celestial Karaoke Jam'"}], "distractors": [{"word": "Season 4", "redirect": "Nein", "context": "Die Musical-Folge ist in Season 6, nicht 4."}]},
    46: {"level": 1, "base": "Lucifers Lieblingsfluch", "correct": [{"word": "Dad!", "context": "Immer genervt zu Gott."}], "distractors": [{"word": "Bloody Hell", "redirect": "Maze", "context": "Das sagt Maze, nicht Lucifer."}]},
    47: {"level": 2, "base": "Wer ist Le Mec", "correct": [{"word": "Französischer Auftragskiller", "context": "Entführt Rory in Staffel 6."}], "distractors": [{"word": "Belgier", "redirect": "Nein", "context": "Er ist Franzose, nicht Belgier."}]},
    48: {"level": 1, "base": "Chloes Spitzname für Lucifer", "correct": [{"word": "Teufel", "context": "Am Anfang nur spöttisch."}], "distractors": [{"word": "Schatz", "redirect": "Später", "context": "Das sagt sie erst später, nicht am Anfang."}]},
    49: {"level": 3, "base": "Die letzte Einstellung", "correct": [{"word": "Lucifer & Chloe Hand in Hand", "context": "In der Höllentherapie – für immer."}], "distractors": [{"word": "Tür schließt sich", "redirect": "Fast", "context": "Fast, aber die letzte Einstellung zeigt sie Hand in Hand."}]},
    50: {"level": 1, "base": "Serien-Ende 2021", "correct": [{"word": "3. September 2021", "context": "Staffel 6 bei Netflix – nach 6 Jahren endlich fertig."}], "distractors": [{"word": "2020", "redirect": "Covid-Verzögerung", "context": "Es war 2021, nicht 2020."}]},
}

def generate_item_id(chapter_abbr, item_num):
    """Generate item ID like NG_LU_001"""
    chapter_abbreviations = {
        "Lucifer": "LU"
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
        "source": "Lucifer - Neil Gaiman",
        "tags": ["neil-gaiman", "lucifer", "tv-show", chapter_name.lower()],
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
    output_dir = "public/content/themes/filme/neil_gaiman"
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


#!/usr/bin/env python3
"""
Script to generate Business English theme entries
Generates 6 chapters × 6 levels × 10 terms = 360 entries
"""

import json
import random

# Business English vocabulary by chapter and level
vocabulary = {
    "Business_Communication": {
        2: [
            ("brief", "kurz/Kurzbrief", "Noun"),
            ("feedback", "Rückmeldung", "Noun"),
            ("proposal", "Vorschlag", "Noun"),
            ("contract", "Vertrag", "Noun"),
            ("negotiation", "Verhandlung", "Noun"),
            ("invoice", "Rechnung", "Noun"),
            ("budget", "Budget", "Noun"),
            ("strategy", "Strategie", "Noun"),
            ("target", "Ziel", "Noun"),
            ("objective", "Zielsetzung", "Noun")
        ],
        3: [
            ("stakeholder", "Interessengruppe", "Noun"),
            ("quarterly", "vierteljährlich", "Adjective"),
            ("milestone", "Meilenstein", "Noun"),
            ("deliverable", "Liefergegenstand", "Noun"),
            ("benchmark", "Vergleichsmaßstab", "Noun"),
            ("compliance", "Einhaltung", "Noun"),
            ("discrepancy", "Abweichung", "Noun"),
            ("synergy", "Synergie", "Noun"),
            ("leverage", "Hebelwirkung", "Noun"),
            ("alignment", "Ausrichtung", "Noun")
        ],
        4: [
            ("facilitate", "erleichtern", "Verb"),
            ("streamline", "optimieren", "Verb"),
            ("implement", "umsetzen", "Verb"),
            ("allocate", "zuteilen", "Verb"),
            ("delegate", "delegieren", "Verb"),
            ("prioritize", "priorisieren", "Verb"),
            ("consolidate", "konsolidieren", "Verb"),
            ("optimize", "optimieren", "Verb"),
            ("coordinate", "koordinieren", "Verb"),
            ("evaluate", "bewerten", "Verb")
        ],
        5: [
            ("feasibility", "Machbarkeit", "Noun"),
            ("viability", "Tragfähigkeit", "Noun"),
            ("scalability", "Skalierbarkeit", "Noun"),
            ("sustainability", "Nachhaltigkeit", "Noun"),
            ("accountability", "Verantwortlichkeit", "Noun"),
            ("transparency", "Transparenz", "Noun"),
            ("efficiency", "Effizienz", "Noun"),
            ("productivity", "Produktivität", "Noun"),
            ("profitability", "Rentabilität", "Noun"),
            ("reliability", "Zuverlässigkeit", "Noun")
        ],
        6: [
            ("paradigm", "Paradigma", "Noun"),
            ("methodology", "Methodik", "Noun"),
            ("framework", "Rahmenwerk", "Noun"),
            ("infrastructure", "Infrastruktur", "Noun"),
            ("governance", "Governance", "Noun"),
            ("stakeholder", "Stakeholder", "Noun"),
            ("benchmarking", "Benchmarking", "Noun"),
            ("outsourcing", "Outsourcing", "Noun"),
            ("offshoring", "Offshoring", "Noun"),
            ("insourcing", "Insourcing", "Noun")
        ]
    },
    "Meetings_Presentations": {
        1: [
            ("meeting", "Besprechung", "Noun"),
            ("presentation", "Präsentation", "Noun"),
            ("agenda", "Tagesordnung", "Noun"),
            ("minutes", "Protokoll", "Noun"),
            ("attendee", "Teilnehmer", "Noun"),
            ("chairperson", "Vorsitzender", "Noun"),
            ("slide", "Folie", "Noun"),
            ("handout", "Handout", "Noun"),
            ("discussion", "Diskussion", "Noun"),
            ("decision", "Entscheidung", "Noun")
        ],
        2: [
            ("brainstorm", "Brainstorming", "Verb"),
            ("summarize", "zusammenfassen", "Verb"),
            ("clarify", "klären", "Verb"),
            ("conclude", "abschließen", "Verb"),
            ("postpone", "verschieben", "Verb"),
            ("adjourn", "vertagen", "Verb"),
            ("reschedule", "neu terminieren", "Verb"),
            ("recap", "zusammenfassen", "Verb"),
            ("highlight", "hervorheben", "Verb"),
            ("emphasize", "betonen", "Verb")
        ],
        3: [
            ("consensus", "Konsens", "Noun"),
            ("quorum", "Beschlussfähigkeit", "Noun"),
            ("motion", "Antrag", "Noun"),
            ("amendment", "Änderung", "Noun"),
            ("resolution", "Beschluss", "Noun"),
            ("action item", "Aufgabe", "Noun"),
            ("follow-up", "Nachfassung", "Noun"),
            ("deadline", "Frist", "Noun"),
            ("timeline", "Zeitplan", "Noun"),
            ("milestone", "Meilenstein", "Noun")
        ],
        4: [
            ("keynote", "Hauptvortrag", "Noun"),
            ("workshop", "Workshop", "Noun"),
            ("seminar", "Seminar", "Noun"),
            ("webinar", "Webinar", "Noun"),
            ("conference call", "Telefonkonferenz", "Noun"),
            ("video call", "Videokonferenz", "Noun"),
            ("breakout session", "Arbeitsgruppe", "Noun"),
            ("panel discussion", "Podiumsdiskussion", "Noun"),
            ("Q&A", "Fragen und Antworten", "Noun"),
            ("networking", "Networking", "Noun")
        ],
        5: [
            ("visual aid", "Visualisierung", "Noun"),
            ("chart", "Diagramm", "Noun"),
            ("graph", "Graph", "Noun"),
            ("infographic", "Infografik", "Noun"),
            ("dashboard", "Dashboard", "Noun"),
            ("template", "Vorlage", "Noun"),
            ("format", "Format", "Noun"),
            ("layout", "Layout", "Noun"),
            ("design", "Design", "Noun"),
            ("branding", "Branding", "Noun")
        ],
        6: [
            ("rhetoric", "Rhetorik", "Noun"),
            ("persuasion", "Überzeugung", "Noun"),
            ("eloquence", "Eloquenz", "Noun"),
            ("articulation", "Artikulation", "Noun"),
            ("oratory", "Redekunst", "Noun"),
            ("delivery", "Vortragsweise", "Noun"),
            ("engagement", "Engagement", "Noun"),
            ("interaction", "Interaktion", "Noun"),
            ("participation", "Teilnahme", "Noun"),
            ("collaboration", "Zusammenarbeit", "Noun")
        ]
    },
    "Finance_Accounting": {
        1: [
            ("budget", "Budget", "Noun"),
            ("revenue", "Umsatz", "Noun"),
            ("expense", "Ausgabe", "Noun"),
            ("profit", "Gewinn", "Noun"),
            ("loss", "Verlust", "Noun"),
            ("invoice", "Rechnung", "Noun"),
            ("payment", "Zahlung", "Noun"),
            ("account", "Konto", "Noun"),
            ("balance", "Saldo", "Noun"),
            ("transaction", "Transaktion", "Noun")
        ],
        2: [
            ("asset", "Vermögenswert", "Noun"),
            ("liability", "Verbindlichkeit", "Noun"),
            ("equity", "Eigenkapital", "Noun"),
            ("depreciation", "Abschreibung", "Noun"),
            ("amortization", "Amortisierung", "Noun"),
            ("dividend", "Dividende", "Noun"),
            ("interest", "Zinsen", "Noun"),
            ("principal", "Kapital", "Noun"),
            ("loan", "Darlehen", "Noun"),
            ("credit", "Kredit", "Noun")
        ],
        3: [
            ("cash flow", "Cashflow", "Noun"),
            ("working capital", "Betriebskapital", "Noun"),
            ("return on investment", "Kapitalrendite", "Noun"),
            ("break-even", "Gewinnschwelle", "Noun"),
            ("margin", "Marge", "Noun"),
            ("overhead", "Gemeinkosten", "Noun"),
            ("forecast", "Prognose", "Noun"),
            ("projection", "Projektion", "Noun"),
            ("audit", "Prüfung", "Noun"),
            ("reconciliation", "Abstimmung", "Noun")
        ],
        4: [
            ("fiscal year", "Geschäftsjahr", "Noun"),
            ("quarter", "Quartal", "Noun"),
            ("filing", "Einreichung", "Noun"),
            ("tax return", "Steuererklärung", "Noun"),
            ("deduction", "Abzug", "Noun"),
            ("exemption", "Befreiung", "Noun"),
            ("withholding", "Einbehaltung", "Noun"),
            ("compliance", "Einhaltung", "Noun"),
            ("regulation", "Vorschrift", "Noun"),
            ("standard", "Standard", "Noun")
        ],
        5: [
            ("valuation", "Bewertung", "Noun"),
            ("appraisal", "Schätzung", "Noun"),
            ("assessment", "Beurteilung", "Noun"),
            ("leverage", "Hebelwirkung", "Noun"),
            ("liquidity", "Liquidität", "Noun"),
            ("solvency", "Zahlungsfähigkeit", "Noun"),
            ("bankruptcy", "Insolvenz", "Noun"),
            ("merger", "Fusion", "Noun"),
            ("acquisition", "Übernahme", "Noun"),
            ("consolidation", "Konsolidierung", "Noun")
        ],
        6: [
            ("derivative", "Derivat", "Noun"),
            ("hedge", "Absicherung", "Noun"),
            ("portfolio", "Portfolio", "Noun"),
            ("diversification", "Diversifizierung", "Noun"),
            ("risk management", "Risikomanagement", "Noun"),
            ("hedge fund", "Hedgefonds", "Noun"),
            ("mutual fund", "Investmentfonds", "Noun"),
            ("securities", "Wertpapiere", "Noun"),
            ("bond", "Anleihe", "Noun"),
            ("stock", "Aktie", "Noun")
        ]
    },
    "Management_Leadership": {
        1: [
            ("manager", "Manager", "Noun"),
            ("leader", "Führungskraft", "Noun"),
            ("team", "Team", "Noun"),
            ("department", "Abteilung", "Noun"),
            ("supervisor", "Vorgesetzter", "Noun"),
            ("subordinate", "Untergebener", "Noun"),
            ("authority", "Autorität", "Noun"),
            ("responsibility", "Verantwortung", "Noun"),
            ("delegation", "Delegation", "Noun"),
            ("hierarchy", "Hierarchie", "Noun")
        ],
        2: [
            ("motivate", "motivieren", "Verb"),
            ("inspire", "inspirieren", "Verb"),
            ("mentor", "mentorieren", "Verb"),
            ("coach", "coachen", "Verb"),
            ("guide", "führen", "Verb"),
            ("direct", "leiten", "Verb"),
            ("supervise", "beaufsichtigen", "Verb"),
            ("oversee", "überwachen", "Verb"),
            ("coordinate", "koordinieren", "Verb"),
            ("facilitate", "erleichtern", "Verb")
        ],
        3: [
            ("vision", "Vision", "Noun"),
            ("mission", "Mission", "Noun"),
            ("strategy", "Strategie", "Noun"),
            ("objective", "Ziel", "Noun"),
            ("goal", "Ziel", "Noun"),
            ("target", "Ziel", "Noun"),
            ("milestone", "Meilenstein", "Noun"),
            ("KPI", "Leistungskennzahl", "Noun"),
            ("metric", "Metrik", "Noun"),
            ("benchmark", "Vergleichsmaßstab", "Noun")
        ],
        4: [
            ("empowerment", "Ermächtigung", "Noun"),
            ("accountability", "Verantwortlichkeit", "Noun"),
            ("autonomy", "Autonomie", "Noun"),
            ("initiative", "Initiative", "Noun"),
            ("innovation", "Innovation", "Noun"),
            ("creativity", "Kreativität", "Noun"),
            ("collaboration", "Zusammenarbeit", "Noun"),
            ("synergy", "Synergie", "Noun"),
            ("teamwork", "Teamarbeit", "Noun"),
            ("cooperation", "Kooperation", "Noun")
        ],
        5: [
            ("change management", "Change Management", "Noun"),
            ("transformation", "Transformation", "Noun"),
            ("restructuring", "Umstrukturierung", "Noun"),
            ("reorganization", "Reorganisation", "Noun"),
            ("merger", "Fusion", "Noun"),
            ("acquisition", "Übernahme", "Noun"),
            ("integration", "Integration", "Noun"),
            ("transition", "Übergang", "Noun"),
            ("adaptation", "Anpassung", "Noun"),
            ("evolution", "Evolution", "Noun")
        ],
        6: [
            ("stakeholder management", "Stakeholder-Management", "Noun"),
            ("conflict resolution", "Konfliktlösung", "Noun"),
            ("negotiation", "Verhandlung", "Noun"),
            ("mediation", "Mediation", "Noun"),
            ("arbitration", "Schlichtung", "Noun"),
            ("consensus", "Konsens", "Noun"),
            ("compromise", "Kompromiss", "Noun"),
            ("alignment", "Ausrichtung", "Noun"),
            ("consensus building", "Konsensbildung", "Noun"),
            ("stakeholder engagement", "Stakeholder-Engagement", "Noun")
        ]
    },
    "Marketing_Sales": {
        1: [
            ("marketing", "Marketing", "Noun"),
            ("sales", "Verkauf", "Noun"),
            ("customer", "Kunde", "Noun"),
            ("client", "Kunde", "Noun"),
            ("product", "Produkt", "Noun"),
            ("service", "Dienstleistung", "Noun"),
            ("brand", "Marke", "Noun"),
            ("advertising", "Werbung", "Noun"),
            ("promotion", "Werbeaktion", "Noun"),
            ("campaign", "Kampagne", "Noun")
        ],
        2: [
            ("target market", "Zielmarkt", "Noun"),
            ("market share", "Marktanteil", "Noun"),
            ("competitor", "Konkurrent", "Noun"),
            ("competitive advantage", "Wettbewerbsvorteil", "Noun"),
            ("unique selling proposition", "Alleinstellungsmerkmal", "Noun"),
            ("value proposition", "Wertversprechen", "Noun"),
            ("pricing", "Preisgestaltung", "Noun"),
            ("discount", "Rabatt", "Noun"),
            ("rebate", "Rückvergütung", "Noun"),
            ("incentive", "Anreiz", "Noun")
        ],
        3: [
            ("lead generation", "Lead-Generierung", "Noun"),
            ("prospect", "Interessent", "Noun"),
            ("lead", "Lead", "Noun"),
            ("qualification", "Qualifizierung", "Noun"),
            ("pipeline", "Pipeline", "Noun"),
            ("funnel", "Trichter", "Noun"),
            ("conversion", "Konversion", "Noun"),
            ("retention", "Bindung", "Noun"),
            ("loyalty", "Loyalität", "Noun"),
            ("churn", "Kundenabwanderung", "Noun")
        ],
        4: [
            ("brand awareness", "Markenbekanntheit", "Noun"),
            ("brand recognition", "Markenerkennung", "Noun"),
            ("brand loyalty", "Markenloyalität", "Noun"),
            ("brand equity", "Markenwert", "Noun"),
            ("positioning", "Positionierung", "Noun"),
            ("segmentation", "Segmentierung", "Noun"),
            ("targeting", "Zielgruppenansprache", "Noun"),
            ("differentiation", "Differenzierung", "Noun"),
            ("niche", "Nische", "Noun"),
            ("mass market", "Massenmarkt", "Noun")
        ],
        5: [
            ("digital marketing", "Digitales Marketing", "Noun"),
            ("social media", "Soziale Medien", "Noun"),
            ("SEO", "Suchmaschinenoptimierung", "Noun"),
            ("SEM", "Suchmaschinenmarketing", "Noun"),
            ("content marketing", "Content-Marketing", "Noun"),
            ("email marketing", "E-Mail-Marketing", "Noun"),
            ("affiliate marketing", "Affiliate-Marketing", "Noun"),
            ("influencer marketing", "Influencer-Marketing", "Noun"),
            ("viral marketing", "Virales Marketing", "Noun"),
            ("guerrilla marketing", "Guerrilla-Marketing", "Noun")
        ],
        6: [
            ("ROI", "Kapitalrendite", "Noun"),
            ("customer lifetime value", "Kundenwert", "Noun"),
            ("acquisition cost", "Akquisitionskosten", "Noun"),
            ("retention rate", "Bindungsrate", "Noun"),
            ("churn rate", "Abwanderungsrate", "Noun"),
            ("conversion rate", "Konversionsrate", "Noun"),
            ("click-through rate", "Klickrate", "Noun"),
            ("engagement rate", "Engagement-Rate", "Noun"),
            ("reach", "Reichweite", "Noun"),
            ("impression", "Impression", "Noun")
        ]
    },
    "Negotiations_Contracts": {
        1: [
            ("negotiation", "Verhandlung", "Noun"),
            ("contract", "Vertrag", "Noun"),
            ("agreement", "Vereinbarung", "Noun"),
            ("deal", "Geschäft", "Noun"),
            ("terms", "Bedingungen", "Noun"),
            ("conditions", "Konditionen", "Noun"),
            ("clause", "Klausel", "Noun"),
            ("provision", "Bestimmung", "Noun"),
            ("party", "Partei", "Noun"),
            ("signature", "Unterschrift", "Noun")
        ],
        2: [
            ("offer", "Angebot", "Noun"),
            ("counteroffer", "Gegenangebot", "Noun"),
            ("proposal", "Vorschlag", "Noun"),
            ("bid", "Angebot", "Noun"),
            ("tender", "Angebot", "Noun"),
            ("quotation", "Angebot", "Noun"),
            ("estimate", "Schätzung", "Noun"),
            ("quote", "Angebot", "Noun"),
            ("pricing", "Preisgestaltung", "Noun"),
            ("discount", "Rabatt", "Noun")
        ],
        3: [
            ("bargain", "verhandeln", "Verb"),
            ("haggle", "feilschen", "Verb"),
            ("compromise", "Kompromiss eingehen", "Verb"),
            ("concede", "nachgeben", "Verb"),
            ("yield", "nachgeben", "Verb"),
            ("insist", "bestehen", "Verb"),
            ("demand", "fordern", "Verb"),
            ("request", "anfragen", "Verb"),
            ("propose", "vorschlagen", "Verb"),
            ("suggest", "vorschlagen", "Verb")
        ],
        4: [
            ("deadline", "Frist", "Noun"),
            ("extension", "Verlängerung", "Noun"),
            ("penalty", "Strafe", "Noun"),
            ("penalty clause", "Strafklausel", "Noun"),
            ("breach", "Verletzung", "Noun"),
            ("violation", "Verstoß", "Noun"),
            ("default", "Verzug", "Noun"),
            ("liability", "Haftung", "Noun"),
            ("warranty", "Garantie", "Noun"),
            ("guarantee", "Garantie", "Noun")
        ],
        5: [
            ("confidentiality", "Vertraulichkeit", "Noun"),
            ("non-disclosure", "Verschwiegenheit", "Noun"),
            ("non-compete", "Wettbewerbsverbot", "Noun"),
            ("exclusivity", "Exklusivität", "Noun"),
            ("intellectual property", "Geistiges Eigentum", "Noun"),
            ("copyright", "Urheberrecht", "Noun"),
            ("patent", "Patent", "Noun"),
            ("trademark", "Markenzeichen", "Noun"),
            ("license", "Lizenz", "Noun"),
            ("royalty", "Lizenzgebühr", "Noun")
        ],
        6: [
            ("arbitration", "Schlichtung", "Noun"),
            ("mediation", "Mediation", "Noun"),
            ("litigation", "Rechtsstreit", "Noun"),
            ("dispute resolution", "Streitbeilegung", "Noun"),
            ("settlement", "Vergleich", "Noun"),
            ("compensation", "Entschädigung", "Noun"),
            ("damages", "Schadenersatz", "Noun"),
            ("indemnification", "Freistellung", "Noun"),
            ("force majeure", "Höhere Gewalt", "Noun"),
            ("termination", "Kündigung", "Noun")
        ]
    }
}

# Humorous distractors by category
humorous_distractors = [
    "Kaffeepause", "Mittagspause", "Feierabend", "Wochenende", "Urlaub",
    "Mittagsschlaf", "Kaffeemaschine", "Einkaufsliste", "Karaoke",
    "Schlafenszeit", "Kaffeeklatsch", "Pausenraum", "Kantine",
    "Büroklammer", "Bürostuhl", "Kopierer", "Druckerpapier"
]

def generate_distractors(word_en, word_de, chapter, level):
    """Generate 3 regular distractors + 1 humorous distractor"""
    distractors = []
    
    # Get similar words from vocabulary
    similar_words = []
    for ch, levels in vocabulary.items():
        for lvl, words in levels.items():
            for w_en, w_de, w_type in words:
                if w_en != word_en and w_de != word_de:
                    similar_words.append((w_en, w_de))
    
    # Select 3 regular distractors
    selected = random.sample(similar_words[:20], min(3, len(similar_words)))
    for i, (w_en, w_de) in enumerate(selected):
        distractors.append({
            "entry": {
                "word": w_de if random.random() > 0.5 else w_en,
                "type": "Wrong"
            },
            "spawnPosition": round(0.2 + i * 0.25, 2),
            "spawnSpread": 0.05,
            "speed": 1.1 if level <= 3 else 1.2,
            "points": 100,
            "hp": 1,
            "damage": 1,
            "behavior": "linear_inward" if level <= 3 else "seek_center",
            "context": f"{w_de if w_de != word_de else w_en} = {w_en if w_de != word_de else w_de}, nicht {word_de}",
            "visual": {
                "color": random.choice(["#FF5722", "#9B59B6", "#E91E63", "#FF9800", "#00E676"]),
                "variant": random.choice(["spike", "square", "hexagon"]),
                "pulsate": random.choice([True, False]),
                "shake": random.choice([True, False]),
                "fontSize": 1
            },
            "sound": "explosion_minor",
            "redirect": w_en if w_de != word_de else w_de
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
        "speed": 1.1 if level <= 3 else 1.2,
        "points": 100,
        "hp": 1,
        "damage": 1,
        "behavior": "linear_inward" if level <= 3 else "seek_center",
        "context": f"{humorous} = {humorous.lower()} (humorvoller Distraktor - nicht {word_de}!)",
        "visual": {
            "color": "#FFC107",
            "variant": random.choice(["bubble", "hexagon"]),
            "pulsate": True,
            "shake": True,
            "fontSize": 1
        },
        "sound": "explosion_minor",
        "redirect": humorous.lower()
    })
    
    return distractors

def generate_entry(chapter, level, index, word_en, word_de, word_type):
    """Generate a single entry"""
    entry_id = f"{chapter[:2].upper()}_{index:03d}"
    tier = 2 if level == 1 else 1
    
    colors = ["#2196F3", "#4CAF50", "#F44336", "#9C27B0", "#00BCD4", 
              "#FF9800", "#607D8B", "#795548", "#3F51B5", "#E91E63"]
    color = colors[index % len(colors)]
    
    return {
        "id": entry_id,
        "theme": "business_english",
        "chapter": chapter,
        "level": level,
        "waveDuration": 3,
        "base": {
            "word": word_en,
            "type": word_type,
            "visual": {
                "tier": tier,
                "size": 1,
                "appearance": "bold" if level == 1 else "normal",
                "color": color,
                "glow": level == 1,
                "pulsate": level == 1
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
                "points": 200 if level == 1 else 150,
                "pattern": "linear_inward",
                "hp": 1,
                "collectionOrder": 1 if level == 1 else None,
                "context": f"{word_en} = {word_de}",
                "visual": {
                    "color": color,
                    "variant": random.choice(["hexagon", "star", "bubble", "spike"]),
                    "pulsate": level == 1,
                    "fontSize": 1.1 if level == 1 else 1
                },
                "sound": "bubble_hit_soft"
            }
        ],
        "distractors": generate_distractors(word_en, word_de, chapter, level),
        "meta": {
            "source": "Business English",
            "tags": [
                chapter.lower().replace("_", ""),
                f"level{level}"
            ],
            "related": [
                None,
                None
            ],
            "difficultyScaling": {
                "speedMultiplierPerReplay": 1.05,
                "colorContrastFade": True,
                "angleVariance": 0.3
            }
        }
    }

def generate_chapter(chapter_name):
    """Generate all entries for a chapter"""
    entries = []
    
    # Handle Business_Communication separately (starts at level 2, index 11)
    if chapter_name == "Business_Communication":
        index = 11
        for level in range(2, 7):
            for word_en, word_de, word_type in vocabulary[chapter_name][level]:
                entries.append(generate_entry(chapter_name, level, index, word_en, word_de, word_type))
                index += 1
    else:
        index = 1
        for level in range(1, 7):
            for word_en, word_de, word_type in vocabulary[chapter_name][level]:
                entries.append(generate_entry(chapter_name, level, index, word_en, word_de, word_type))
                index += 1
    
    return entries

# Generate all chapters
chapters = {
    "Business_Communication": "BC",
    "Meetings_Presentations": "MP",
    "Finance_Accounting": "FA",
    "Management_Leadership": "ML",
    "Marketing_Sales": "MS",
    "Negotiations_Contracts": "NC"
}

for chapter_name, prefix in chapters.items():
    entries = generate_chapter(chapter_name)
    
    # Fix entry IDs and related entries
    start_index = 11 if chapter_name == "Business_Communication" else 1
    for i, entry in enumerate(entries):
        current_index = start_index + i
        entry["id"] = f"{prefix}_{current_index:03d}"
        # Fix related entries
        if current_index > start_index:
            entry["meta"]["related"][0] = f"{prefix}_{current_index-1:03d}"
        else:
            entry["meta"]["related"][0] = None
        if i < len(entries) - 1:
            entry["meta"]["related"][1] = f"{prefix}_{current_index+1:03d}"
        else:
            entry["meta"]["related"][1] = None
    
    # Write to file
    filename = f"content/themes/englisch/business_english/{chapter_name}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)
    
    print(f"Generated {len(entries)} entries for {chapter_name}")

print("\nAll chapters generated!")


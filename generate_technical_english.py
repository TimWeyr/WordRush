#!/usr/bin/env python3
"""
Script to generate Technical/MINT English theme entries
Generates 6 chapters × 6 levels × 10 terms = 360 entries
Uses emojis in terms where appropriate
"""

import json
import random

# Technical English vocabulary by chapter and level (with emojis where appropriate)
vocabulary = {
    "Computer_Basics": {
        1: [
            ("computer 💻", "Computer", "Noun"),
            ("keyboard ⌨️", "Tastatur", "Noun"),
            ("mouse 🖱️", "Maus", "Noun"),
            ("screen 📺", "Bildschirm", "Noun"),
            ("monitor 🖥️", "Monitor", "Noun"),
            ("software 💾", "Software", "Noun"),
            ("file 📄", "Datei", "Noun"),
            ("folder 📁", "Ordner", "Noun"),
            ("application 📱", "Anwendung", "Noun"),
            ("program 💿", "Programm", "Noun")
        ],
        2: [
            ("operating system 🖥️", "Betriebssystem", "Noun"),
            ("desktop 🖥️", "Desktop", "Noun"),
            ("window 🪟", "Fenster", "Noun"),
            ("icon 🎯", "Symbol", "Noun"),
            ("menu 📋", "Menü", "Noun"),
            ("button 🔘", "Schaltfläche", "Noun"),
            ("cursor 👆", "Cursor", "Noun"),
            ("click 👆", "klicken", "Verb"),
            ("double-click 👆👆", "doppelklicken", "Verb"),
            ("scroll 📜", "scrollen", "Verb")
        ],
        3: [
            ("save 💾", "speichern", "Verb"),
            ("open 📂", "öffnen", "Verb"),
            ("close ❌", "schließen", "Verb"),
            ("delete 🗑️", "löschen", "Verb"),
            ("copy 📋", "kopieren", "Verb"),
            ("paste 📋", "einfügen", "Verb"),
            ("cut ✂️", "ausschneiden", "Verb"),
            ("undo ↩️", "rückgängig", "Verb"),
            ("redo ↪️", "wiederholen", "Verb"),
            ("search 🔍", "suchen", "Verb")
        ],
        4: [
            ("format 📐", "Formatieren", "Verb"),
            ("edit ✏️", "bearbeiten", "Verb"),
            ("create ➕", "erstellen", "Verb"),
            ("rename 🔄", "umbenennen", "Verb"),
            ("move ➡️", "verschieben", "Verb"),
            ("backup 💾", "Sicherung", "Noun"),
            ("restore 🔄", "wiederherstellen", "Verb"),
            ("compress 📦", "komprimieren", "Verb"),
            ("extract 📦", "entpacken", "Verb"),
            ("install ⬇️", "installieren", "Verb")
        ],
        5: [
            ("uninstall 🗑️", "deinstallieren", "Verb"),
            ("update 🔄", "aktualisieren", "Verb"),
            ("upgrade ⬆️", "aktualisieren", "Verb"),
            ("downgrade ⬇️", "downgraden", "Verb"),
            ("configure ⚙️", "konfigurieren", "Verb"),
            ("settings ⚙️", "Einstellungen", "Noun"),
            ("preferences ⚙️", "Voreinstellungen", "Noun"),
            ("permissions 🔐", "Berechtigungen", "Noun"),
            ("access 🔓", "Zugriff", "Noun"),
            ("privilege 🔑", "Berechtigung", "Noun")
        ],
        6: [
            ("interface 🖼️", "Schnittstelle", "Noun"),
            ("GUI 🖼️", "Grafische Benutzeroberfläche", "Noun"),
            ("CLI 💻", "Kommandozeile", "Noun"),
            ("API 🔌", "Programmierschnittstelle", "Noun"),
            ("SDK 🛠️", "Software Development Kit", "Noun"),
            ("framework 🏗️", "Rahmenwerk", "Noun"),
            ("library 📚", "Bibliothek", "Noun"),
            ("module 📦", "Modul", "Noun"),
            ("package 📦", "Paket", "Noun"),
            ("dependency 🔗", "Abhängigkeit", "Noun")
        ]
    },
    "Programming_Software": {
        1: [
            ("code 💻", "Code", "Noun"),
            ("programming 💻", "Programmierung", "Noun"),
            ("language 💬", "Programmiersprache", "Noun"),
            ("syntax 📝", "Syntax", "Noun"),
            ("variable 📊", "Variable", "Noun"),
            ("function ⚙️", "Funktion", "Noun"),
            ("loop 🔄", "Schleife", "Noun"),
            ("condition 🔀", "Bedingung", "Noun"),
            ("algorithm 🧮", "Algorithmus", "Noun"),
            ("debug 🐛", "debuggen", "Verb")
        ],
        2: [
            ("compile 🔨", "kompilieren", "Verb"),
            ("execute ▶️", "ausführen", "Verb"),
            ("run ▶️", "ausführen", "Verb"),
            ("test 🧪", "testen", "Verb"),
            ("error ❌", "Fehler", "Noun"),
            ("bug 🐛", "Fehler", "Noun"),
            ("exception ⚠️", "Ausnahme", "Noun"),
            ("stack trace 📚", "Stack-Trace", "Noun"),
            ("log 📋", "Protokoll", "Noun"),
            ("console 💻", "Konsole", "Noun")
        ],
        3: [
            ("class 🏛️", "Klasse", "Noun"),
            ("object 🎯", "Objekt", "Noun"),
            ("method ⚙️", "Methode", "Noun"),
            ("property 📋", "Eigenschaft", "Noun"),
            ("inheritance 🧬", "Vererbung", "Noun"),
            ("polymorphism 🔄", "Polymorphismus", "Noun"),
            ("encapsulation 📦", "Kapselung", "Noun"),
            ("abstraction 🎭", "Abstraktion", "Noun"),
            ("interface 🔌", "Schnittstelle", "Noun"),
            ("implementation 💻", "Implementierung", "Noun")
        ],
        4: [
            ("array 📊", "Array", "Noun"),
            ("list 📋", "Liste", "Noun"),
            ("dictionary 📖", "Wörterbuch", "Noun"),
            ("set 🎯", "Menge", "Noun"),
            ("tuple 📦", "Tupel", "Noun"),
            ("string 📝", "Zeichenkette", "Noun"),
            ("integer 🔢", "Ganzzahl", "Noun"),
            ("float 🔢", "Gleitkommazahl", "Noun"),
            ("boolean ✅", "Boolescher Wert", "Noun"),
            ("null ⭕", "Null", "Noun")
        ],
        5: [
            ("recursion 🔄", "Rekursion", "Noun"),
            ("iteration 🔁", "Iteration", "Noun"),
            ("sorting 🔄", "Sortierung", "Noun"),
            ("searching 🔍", "Suche", "Noun"),
            ("hash 🔐", "Hash", "Noun"),
            ("tree 🌳", "Baum", "Noun"),
            ("graph 📊", "Graph", "Noun"),
            ("queue 📥", "Warteschlange", "Noun"),
            ("stack 📚", "Stapel", "Noun"),
            ("heap 📚", "Heap", "Noun")
        ],
        6: [
            ("design pattern 🎨", "Entwurfsmuster", "Noun"),
            ("refactoring 🔄", "Refactoring", "Noun"),
            ("optimization ⚡", "Optimierung", "Noun"),
            ("performance ⚡", "Leistung", "Noun"),
            ("scalability 📈", "Skalierbarkeit", "Noun"),
            ("maintainability 🔧", "Wartbarkeit", "Noun"),
            ("readability 📖", "Lesbarkeit", "Noun"),
            ("documentation 📚", "Dokumentation", "Noun"),
            ("version control 📝", "Versionskontrolle", "Noun"),
            ("repository 📦", "Repository", "Noun")
        ]
    },
    "Hardware_Devices": {
        1: [
            ("CPU 🖥️", "Prozessor", "Noun"),
            ("RAM 💾", "Arbeitsspeicher", "Noun"),
            ("hard drive 💿", "Festplatte", "Noun"),
            ("SSD ⚡", "Solid State Drive", "Noun"),
            ("motherboard 🔌", "Hauptplatine", "Noun"),
            ("graphics card 🎮", "Grafikkarte", "Noun"),
            ("power supply ⚡", "Netzteil", "Noun"),
            ("cooling fan 🌪️", "Lüfter", "Noun"),
            ("USB port 🔌", "USB-Anschluss", "Noun"),
            ("cable 🔌", "Kabel", "Noun")
        ],
        2: [
            ("printer 🖨️", "Drucker", "Noun"),
            ("scanner 📷", "Scanner", "Noun"),
            ("webcam 📹", "Webcam", "Noun"),
            ("microphone 🎤", "Mikrofon", "Noun"),
            ("speaker 🔊", "Lautsprecher", "Noun"),
            ("headphones 🎧", "Kopfhörer", "Noun"),
            ("router 📡", "Router", "Noun"),
            ("modem 📡", "Modem", "Noun"),
            ("switch 🔀", "Switch", "Noun"),
            ("hub 🔌", "Hub", "Noun")
        ],
        3: [
            ("server 🖥️", "Server", "Noun"),
            ("workstation 💻", "Workstation", "Noun"),
            ("laptop 💻", "Laptop", "Noun"),
            ("tablet 📱", "Tablet", "Noun"),
            ("smartphone 📱", "Smartphone", "Noun"),
            ("smartwatch ⌚", "Smartwatch", "Noun"),
            ("wearable ⌚", "Wearable", "Noun"),
            ("IoT device 🔌", "IoT-Gerät", "Noun"),
            ("sensor 📡", "Sensor", "Noun"),
            ("actuator ⚙️", "Aktor", "Noun")
        ],
        4: [
            ("processor core 🖥️", "Prozessorkern", "Noun"),
            ("cache 💾", "Cache", "Noun"),
            ("bus 🔌", "Bus", "Noun"),
            ("clock speed ⏱️", "Taktrate", "Noun"),
            ("overclocking ⚡", "Übertakten", "Noun"),
            ("thermal paste 🧪", "Wärmeleitpaste", "Noun"),
            ("heat sink 🧊", "Kühlkörper", "Noun"),
            ("liquid cooling 💧", "Wasserkühlung", "Noun"),
            ("form factor 📐", "Formfaktor", "Noun"),
            ("expansion slot 🔌", "Erweiterungssteckplatz", "Noun")
        ],
        5: [
            ("BIOS 🔧", "BIOS", "Noun"),
            ("UEFI 🔧", "UEFI", "Noun"),
            ("firmware 💾", "Firmware", "Noun"),
            ("driver 💿", "Treiber", "Noun"),
            ("peripheral 🔌", "Peripheriegerät", "Noun"),
            ("input device ⌨️", "Eingabegerät", "Noun"),
            ("output device 🖨️", "Ausgabegerät", "Noun"),
            ("storage device 💾", "Speichergerät", "Noun"),
            ("backup device 💾", "Backup-Gerät", "Noun"),
            ("RAID array 💾", "RAID-Array", "Noun")
        ],
        6: [
            ("GPU 🎮", "Grafikprozessor", "Noun"),
            ("TPU 🧠", "Tensor Processing Unit", "Noun"),
            ("FPGA 🔧", "Field Programmable Gate Array", "Noun"),
            ("ASIC 🔧", "Application Specific Integrated Circuit", "Noun"),
            ("quantum computer ⚛️", "Quantencomputer", "Noun"),
            ("quantum bit ⚛️", "Quantenbit", "Noun"),
            ("qubit ⚛️", "Qubit", "Noun"),
            ("supercomputer 🖥️", "Supercomputer", "Noun"),
            ("cluster 🖥️", "Cluster", "Noun"),
            ("grid computing 🌐", "Grid Computing", "Noun")
        ]
    },
    "Networks_Internet": {
        1: [
            ("network 🌐", "Netzwerk", "Noun"),
            ("internet 🌐", "Internet", "Noun"),
            ("Wi-Fi 📡", "WLAN", "Noun"),
            ("Ethernet 🔌", "Ethernet", "Noun"),
            ("LAN 🏠", "Lokales Netzwerk", "Noun"),
            ("WAN 🌍", "Weitverkehrsnetz", "Noun"),
            ("IP address 🔢", "IP-Adresse", "Noun"),
            ("DNS 🌐", "Domain Name System", "Noun"),
            ("URL 🔗", "Uniform Resource Locator", "Noun"),
            ("website 🌐", "Website", "Noun")
        ],
        2: [
            ("browser 🌐", "Browser", "Noun"),
            ("server 🖥️", "Server", "Noun"),
            ("client 💻", "Client", "Noun"),
            ("request 📤", "Anfrage", "Noun"),
            ("response 📥", "Antwort", "Noun"),
            ("protocol 📋", "Protokoll", "Noun"),
            ("HTTP 🌐", "Hypertext Transfer Protocol", "Noun"),
            ("HTTPS 🔒", "Hypertext Transfer Protocol Secure", "Noun"),
            ("TCP 📡", "Transmission Control Protocol", "Noun"),
            ("UDP 📡", "User Datagram Protocol", "Noun")
        ],
        3: [
            ("packet 📦", "Paket", "Noun"),
            ("router 📡", "Router", "Noun"),
            ("switch 🔀", "Switch", "Noun"),
            ("firewall 🔥", "Firewall", "Noun"),
            ("gateway 🚪", "Gateway", "Noun"),
            ("proxy 🔄", "Proxy", "Noun"),
            ("VPN 🔒", "Virtual Private Network", "Noun"),
            ("bandwidth 📊", "Bandbreite", "Noun"),
            ("latency ⏱️", "Latenz", "Noun"),
            ("throughput 📊", "Durchsatz", "Noun")
        ],
        4: [
            ("cloud ☁️", "Cloud", "Noun"),
            ("cloud computing ☁️", "Cloud Computing", "Noun"),
            ("SaaS 💻", "Software as a Service", "Noun"),
            ("PaaS 🏗️", "Platform as a Service", "Noun"),
            ("IaaS 🖥️", "Infrastructure as a Service", "Noun"),
            ("API 🔌", "Application Programming Interface", "Noun"),
            ("REST 🔌", "Representational State Transfer", "Noun"),
            ("JSON 📋", "JavaScript Object Notation", "Noun"),
            ("XML 📋", "Extensible Markup Language", "Noun"),
            ("WebSocket 🔌", "WebSocket", "Noun")
        ],
        5: [
            ("load balancer ⚖️", "Lastausgleich", "Noun"),
            ("CDN 🌐", "Content Delivery Network", "Noun"),
            ("caching 💾", "Caching", "Noun"),
            ("cache 💾", "Cache", "Noun"),
            ("session 🎫", "Sitzung", "Noun"),
            ("cookie 🍪", "Cookie", "Noun"),
            ("token 🎫", "Token", "Noun"),
            ("authentication 🔐", "Authentifizierung", "Noun"),
            ("authorization 🔑", "Autorisierung", "Noun"),
            ("encryption 🔒", "Verschlüsselung", "Noun")
        ],
        6: [
            ("distributed system 🌐", "Verteiltes System", "Noun"),
            ("microservices 🧩", "Microservices", "Noun"),
            ("container 📦", "Container", "Noun"),
            ("Docker 🐳", "Docker", "Noun"),
            ("Kubernetes ☸️", "Kubernetes", "Noun"),
            ("orchestration 🎼", "Orchestrierung", "Noun"),
            ("scaling 📈", "Skalierung", "Noun"),
            ("horizontal scaling ↔️", "Horizontale Skalierung", "Noun"),
            ("vertical scaling ↕️", "Vertikale Skalierung", "Noun"),
            ("auto-scaling 🤖", "Automatische Skalierung", "Noun")
        ]
    },
    "Data_Science_AI": {
        1: [
            ("data 📊", "Daten", "Noun"),
            ("dataset 📊", "Datensatz", "Noun"),
            ("database 💾", "Datenbank", "Noun"),
            ("table 📋", "Tabelle", "Noun"),
            ("row 📊", "Zeile", "Noun"),
            ("column 📊", "Spalte", "Noun"),
            ("query 🔍", "Abfrage", "Noun"),
            ("SQL 💾", "Structured Query Language", "Noun"),
            ("algorithm 🧮", "Algorithmus", "Noun"),
            ("model 🤖", "Modell", "Noun")
        ],
        2: [
            ("machine learning 🤖", "Maschinelles Lernen", "Noun"),
            ("AI 🤖", "Künstliche Intelligenz", "Noun"),
            ("neural network 🧠", "Neuronales Netzwerk", "Noun"),
            ("training 🏋️", "Training", "Noun"),
            ("learning 🎓", "Lernen", "Noun"),
            ("prediction 🔮", "Vorhersage", "Noun"),
            ("classification 📊", "Klassifizierung", "Noun"),
            ("regression 📈", "Regression", "Noun"),
            ("supervised learning 👨‍🏫", "Überwachtes Lernen", "Noun"),
            ("unsupervised learning 🔍", "Unüberwachtes Lernen", "Noun")
        ],
        3: [
            ("deep learning 🧠", "Tiefes Lernen", "Noun"),
            ("CNN 🖼️", "Convolutional Neural Network", "Noun"),
            ("RNN 🔄", "Recurrent Neural Network", "Noun"),
            ("LSTM 🔄", "Long Short-Term Memory", "Noun"),
            ("transformer 🔄", "Transformer", "Noun"),
            ("attention 👁️", "Aufmerksamkeit", "Noun"),
            ("embedding 📊", "Einbettung", "Noun"),
            ("feature 🎯", "Merkmal", "Noun"),
            ("label 🏷️", "Label", "Noun"),
            ("epoch 🔄", "Epoche", "Noun")
        ],
        4: [
            ("data mining ⛏️", "Data Mining", "Noun"),
            ("analytics 📊", "Analytik", "Noun"),
            ("visualization 📊", "Visualisierung", "Noun"),
            ("plot 📈", "Diagramm", "Noun"),
            ("chart 📊", "Diagramm", "Noun"),
            ("graph 📊", "Graph", "Noun"),
            ("statistics 📊", "Statistik", "Noun"),
            ("mean 📊", "Mittelwert", "Noun"),
            ("median 📊", "Median", "Noun"),
            ("standard deviation 📊", "Standardabweichung", "Noun")
        ],
        5: [
            ("big data 📊", "Big Data", "Noun"),
            ("data warehouse 🏢", "Data Warehouse", "Noun"),
            ("data lake 🏞️", "Data Lake", "Noun"),
            ("ETL 🔄", "Extract Transform Load", "Noun"),
            ("pipeline 🔄", "Pipeline", "Noun"),
            ("batch processing 📦", "Stapelverarbeitung", "Noun"),
            ("stream processing 🌊", "Stream-Verarbeitung", "Noun"),
            ("real-time ⏱️", "Echtzeit", "Noun"),
            ("scalability 📈", "Skalierbarkeit", "Noun"),
            ("distributed computing 🌐", "Verteiltes Rechnen", "Noun")
        ],
        6: [
            ("NLP 💬", "Natural Language Processing", "Noun"),
            ("computer vision 👁️", "Maschinelles Sehen", "Noun"),
            ("robotics 🤖", "Robotik", "Noun"),
            ("autonomous 🤖", "Autonom", "Adjective"),
            ("reinforcement learning 🎮", "Bestärkendes Lernen", "Noun"),
            ("transfer learning 🔄", "Transfer Learning", "Noun"),
            ("fine-tuning 🎯", "Feinabstimmung", "Noun"),
            ("hyperparameter 🎛️", "Hyperparameter", "Noun"),
            ("optimization ⚡", "Optimierung", "Noun"),
            ("gradient descent 📉", "Gradientenabstieg", "Noun")
        ]
    },
    "Cybersecurity": {
        1: [
            ("security 🔒", "Sicherheit", "Noun"),
            ("password 🔑", "Passwort", "Noun"),
            ("encryption 🔒", "Verschlüsselung", "Noun"),
            ("decryption 🔓", "Entschlüsselung", "Noun"),
            ("firewall 🔥", "Firewall", "Noun"),
            ("antivirus 🛡️", "Antivirus", "Noun"),
            ("malware 🦠", "Schadsoftware", "Noun"),
            ("virus 🦠", "Virus", "Noun"),
            ("trojan 🐴", "Trojaner", "Noun"),
            ("spyware 👁️", "Spyware", "Noun")
        ],
        2: [
            ("hacker 👨‍💻", "Hacker", "Noun"),
            ("attack ⚔️", "Angriff", "Noun"),
            ("vulnerability 🕳️", "Schwachstelle", "Noun"),
            ("exploit 💣", "Exploit", "Noun"),
            ("breach 🚨", "Datenpanne", "Noun"),
            ("leak 💧", "Leck", "Noun"),
            ("phishing 🎣", "Phishing", "Noun"),
            ("spam 📧", "Spam", "Noun"),
            ("scam 💰", "Betrug", "Noun"),
            ("fraud 💰", "Betrug", "Noun")
        ],
        3: [
            ("authentication 🔐", "Authentifizierung", "Noun"),
            ("authorization 🔑", "Autorisierung", "Noun"),
            ("2FA 🔐", "Zwei-Faktor-Authentifizierung", "Noun"),
            ("MFA 🔐", "Multi-Faktor-Authentifizierung", "Noun"),
            ("biometric 🔬", "Biometrisch", "Adjective"),
            ("fingerprint 👆", "Fingerabdruck", "Noun"),
            ("face recognition 👤", "Gesichtserkennung", "Noun"),
            ("token 🎫", "Token", "Noun"),
            ("certificate 📜", "Zertifikat", "Noun"),
            ("SSL 🔒", "Secure Sockets Layer", "Noun")
        ],
        4: [
            ("TLS 🔒", "Transport Layer Security", "Noun"),
            ("VPN 🔒", "Virtual Private Network", "Noun"),
            ("proxy 🔄", "Proxy", "Noun"),
            ("anonymization 👤", "Anonymisierung", "Noun"),
            ("privacy 🔒", "Datenschutz", "Noun"),
            ("GDPR 📋", "Datenschutz-Grundverordnung", "Noun"),
            ("compliance ✅", "Compliance", "Noun"),
            ("audit 🔍", "Audit", "Noun"),
            ("penetration testing 🔍", "Penetrationstest", "Noun"),
            ("red team 🔴", "Red Team", "Noun")
        ],
        5: [
            ("blue team 🔵", "Blue Team", "Noun"),
            ("SOC 🛡️", "Security Operations Center", "Noun"),
            ("SIEM 📊", "Security Information and Event Management", "Noun"),
            ("IDS 🚨", "Intrusion Detection System", "Noun"),
            ("IPS 🛡️", "Intrusion Prevention System", "Noun"),
            ("DDoS ⚔️", "Distributed Denial of Service", "Noun"),
            ("DoS ⚔️", "Denial of Service", "Noun"),
            ("botnet 🤖", "Botnetz", "Noun"),
            ("ransomware 💰", "Ransomware", "Noun"),
            ("backup 💾", "Backup", "Noun")
        ],
        6: [
            ("zero-day 🕳️", "Zero-Day", "Noun"),
            ("patch 🔧", "Patch", "Noun"),
            ("update 🔄", "Update", "Noun"),
            ("patch management 🔧", "Patch-Management", "Noun"),
            ("incident response 🚨", "Incident Response", "Noun"),
            ("forensics 🔍", "Forensik", "Noun"),
            ("digital forensics 🔍", "Digitale Forensik", "Noun"),
            ("threat intelligence 🧠", "Threat Intelligence", "Noun"),
            ("threat hunting 🎯", "Threat Hunting", "Noun"),
            ("security awareness 🧠", "Sicherheitsbewusstsein", "Noun")
        ]
    }
}

# Humorous distractors for technical theme
humorous_distractors = [
    "Kaffeepause ☕", "Mittagspause 🍽️", "Feierabend 🎉", "Wochenende 🏖️",
    "Urlaub 🏝️", "Mittagsschlaf 😴", "Kaffeemaschine ☕", "Einkaufsliste 🛒",
    "Karaoke 🎤", "Schlafenszeit 😴", "Kaffeeklatsch ☕", "Pausenraum 🪑",
    "Büroklammer 📎", "Bürostuhl 🪑", "Druckerpapier 📄", "Mauspad 🖱️",
    "USB-Stick 🍦", "Kabelchaos 🔌", "Bildschirmschoner 💤", "Desktop-Hintergrund 🖼️"
]

def generate_distractors(word_en, word_de, chapter, level):
    """Generate 3 regular distractors + 1 humorous distractor"""
    distractors = []
    
    # Get similar words from vocabulary
    similar_words = []
    for ch, levels in vocabulary.items():
        for lvl, words in levels.items():
            for w_en, w_de, w_type in words:
                # Remove emojis for comparison
                w_en_clean = w_en.split()[0] if " " in w_en else w_en
                word_en_clean = word_en.split()[0] if " " in word_en else word_en
                if w_en_clean != word_en_clean and w_de != word_de:
                    similar_words.append((w_en, w_de))
    
    # Select 3 regular distractors
    selected = random.sample(similar_words[:30], min(3, len(similar_words)))
    for i, (w_en, w_de) in enumerate(selected):
        use_german = random.random() > 0.5
        distractors.append({
            "entry": {
                "word": w_de if use_german else w_en,
                "type": "Wrong"
            },
            "spawnPosition": round(0.2 + i * 0.25, 2),
            "spawnSpread": 0.05,
            "speed": 1.1 if level <= 3 else 1.2,
            "points": 100,
            "hp": 1,
            "damage": 1,
            "behavior": "linear_inward" if level <= 3 else "seek_center",
            "context": f"{w_de if use_german else w_en} = {w_en if use_german else w_de}, nicht {word_de}",
            "visual": {
                "color": random.choice(["#FF5722", "#9B59B6", "#E91E63", "#FF9800", "#00E676"]),
                "variant": random.choice(["spike", "square", "hexagon"]),
                "pulsate": random.choice([True, False]),
                "shake": random.choice([True, False]),
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
        "speed": 1.1 if level <= 3 else 1.2,
        "points": 100,
        "hp": 1,
        "damage": 1,
        "behavior": "linear_inward" if level <= 3 else "seek_center",
        "context": f"{humorous} (humorvoller Distraktor - nicht {word_de}!)",
        "visual": {
            "color": "#FFC107",
            "variant": random.choice(["bubble", "hexagon"]),
            "pulsate": True,
            "shake": True,
            "fontSize": 1
        },
        "sound": "explosion_minor",
        "redirect": humorous.split()[0] if " " in humorous else humorous
    })
    
    return distractors

def generate_entry(chapter, level, index, word_en, word_de, word_type):
    """Generate a single entry"""
    entry_id = f"{chapter[:2].upper()}_{index:03d}"
    tier = 2 if level == 1 else 1
    
    colors = ["#00d4ff", "#00a8cc", "#2196F3", "#4CAF50", "#F44336", 
              "#9C27B0", "#00BCD4", "#FF9800", "#607D8B", "#795548"]
    color = colors[index % len(colors)]
    
    return {
        "id": entry_id,
        "theme": "technical_english",
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
            "source": "Technical English",
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
    index = 1
    
    for level in range(1, 7):
        for word_en, word_de, word_type in vocabulary[chapter_name][level]:
            entries.append(generate_entry(chapter_name, level, index, word_en, word_de, word_type))
            index += 1
    
    return entries

# Generate all chapters
chapters = {
    "Computer_Basics": "CB",
    "Programming_Software": "PS",
    "Hardware_Devices": "HD",
    "Networks_Internet": "NI",
    "Data_Science_AI": "DA",
    "Cybersecurity": "CS"
}

for chapter_name, prefix in chapters.items():
    entries = generate_chapter(chapter_name)
    
    # Fix entry IDs and related entries
    for i, entry in enumerate(entries):
        current_index = i + 1
        entry["id"] = f"{prefix}_{current_index:03d}"
        # Fix related entries
        if i > 0:
            entry["meta"]["related"][0] = f"{prefix}_{current_index-1:03d}"
        else:
            entry["meta"]["related"][0] = None
        if i < len(entries) - 1:
            entry["meta"]["related"][1] = f"{prefix}_{current_index+1:03d}"
        else:
            entry["meta"]["related"][1] = None
    
    # Write to file
    filename = f"content/themes/englisch/technical_english/{chapter_name}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)
    
    print(f"Generated {len(entries)} entries for {chapter_name}")

print("\nAll chapters generated!")


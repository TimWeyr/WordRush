import json
import os
from pathlib import Path

def add_missing_titles_to_themes():
    """
    Fügt allen Chapters in Theme-Dateien, die noch keinen 'title' haben,
    einen title hinzu. Der title basiert auf der Chapter-ID, 
    wobei Unterstriche durch Leerzeichen ersetzt werden.
    """
    themes_dir = Path("public/content/themes")
    
    # Finde alle themes.*.json Dateien
    theme_files = list(themes_dir.rglob("themes.*.json"))
    
    print(f"Gefundene Theme-Dateien: {len(theme_files)}")
    
    modified_files = []
    
    for theme_file in theme_files:
        try:
            with open(theme_file, 'r', encoding='utf-8') as f:
                theme_data = json.load(f)
            
            # Prüfe ob 'chapters' existiert
            if 'chapters' not in theme_data:
                continue
            
            modified = False
            
            # Gehe durch alle Chapters
            for chapter_id, chapter_config in theme_data['chapters'].items():
                # Prüfe ob title fehlt
                if 'title' not in chapter_config or not chapter_config.get('title'):
                    # Erstelle title aus Chapter-ID: Unterstriche durch Leerzeichen ersetzen
                    title = chapter_id.replace('_', ' ')
                    chapter_config['title'] = title
                    modified = True
                    print(f"  ✓ {theme_file.name} - Chapter '{chapter_id}' → title: '{title}'")
            
            # Speichere nur wenn Änderungen vorgenommen wurden
            if modified:
                with open(theme_file, 'w', encoding='utf-8') as f:
                    json.dump(theme_data, f, ensure_ascii=False, indent=2)
                modified_files.append(theme_file)
                print(f"  → {theme_file.name} gespeichert\n")
        
        except Exception as e:
            print(f"  ✗ Fehler bei {theme_file}: {e}\n")
    
    print(f"\n=== Zusammenfassung ===")
    print(f"Verarbeitete Dateien: {len(theme_files)}")
    print(f"Geänderte Dateien: {len(modified_files)}")
    
    if modified_files:
        print(f"\nGeänderte Dateien:")
        for f in modified_files:
            print(f"  - {f}")

if __name__ == "__main__":
    add_missing_titles_to_themes()


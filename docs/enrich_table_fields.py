#!/usr/bin/env python3
"""
Script to enrich table_fields.json with code references and metadata.
This script adds json_source, code_references, migration_status, and notes to all fields.
"""

import json
from pathlib import Path

# Mapping of common fields to their JSON sources and code references
FIELD_METADATA = {
    # Chapters
    "chapters.id": {
        "json_source": "Chapter key in Theme.chapters",
        "code_references": [
            {"file": "src/infra/utils/JSONLoader.ts", "lines": [97, 416], "usage": "Loading themes and chapters"},
            {"file": "src/types/content.types.ts", "lines": [42], "usage": "Record<string, ChapterConfig> - chapter keys"}
        ],
        "migration_status": "migrated",
        "notes": "Chapter identifier (key in Theme.chapters object)"
    },
    "chapters.description": {
        "json_source": "Not in JSON (DB-only field)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Optional description field. Not present in JSON structure."
    },
    "chapters.created_at": {
        "json_source": "DB timestamp (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated timestamp when record is created"
    },
    "chapters.updated_at": {
        "json_source": "DB timestamp (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated timestamp when record is updated"
    },
    "chapters.uuid": {
        "json_source": "DB UUID (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated UUID for database relationships"
    },
    "chapters.themes_uuid": {
        "json_source": "Foreign key to themes.uuid",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Foreign key linking chapter to theme"
    },
    "chapters.themes_uuid_backup": {
        "json_source": "Migration backup field",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Backup field during migration, may be removed later"
    },
    
    # Items - Common fields
    "items.round_id": {
        "json_source": "Item.id",
        "code_references": [
            {"file": "export_items_csv.py", "lines": [56, 88, 115], "usage": "CSV export - links item to round"},
            {"file": "docs/example.data.json", "lines": [42, 105, 168], "usage": "Example data structure"}
        ],
        "migration_status": "migrated",
        "notes": "Foreign key to rounds.id (e.g., 'F10_012', 'BR_IT_001')"
    },
    "items.object_type": {
        "json_source": "Item structure (base/correct/distractor)",
        "code_references": [
            {"file": "export_items_csv.py", "lines": [57, 89, 116], "usage": "CSV export - determines item type"},
            {"file": "docs/example.data.json", "lines": [43, 106, 169], "usage": "Values: 'base', 'correct', 'distractor'"}
        ],
        "migration_status": "migrated",
        "notes": "Type discriminator: 'base', 'correct', or 'distractor'"
    },
    "items.word": {
        "json_source": "BaseEntry.word, CorrectEntry.entry.word, DistractorEntry.entry.word",
        "code_references": [
            {"file": "src/entities/BaseEntity.ts", "lines": [10, 58], "usage": "Base word display"},
            {"file": "src/entities/CorrectObject.ts", "lines": [124], "usage": "Correct object word display"},
            {"file": "src/entities/DistractorObject.ts", "lines": [187], "usage": "Distractor object word display"}
        ],
        "migration_status": "migrated",
        "notes": "Text to display. Either word or image must be present."
    },
    "items.type": {
        "json_source": "BaseEntry.type, CorrectEntry.entry.type, DistractorEntry.entry.type",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [81, 89, 109], "usage": "Type definition - category/type for metadata"}
        ],
        "migration_status": "migrated",
        "notes": "Category/type for metadata (e.g., 'Symptom', 'Wrong', 'BrainrotTerm')"
    },
    "items.image": {
        "json_source": "BaseEntry.image, CorrectEntry.entry.image, DistractorEntry.entry.image",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [82, 90, 110], "usage": "Type definition - optional image filename"}
        ],
        "migration_status": "migrated",
        "notes": "Optional image filename. Either word or image must be present."
    },
    "items.context": {
        "json_source": "CorrectEntry.context, DistractorEntry.context",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [101, 121], "usage": "Type definition - explanation text"},
            {"file": "src/components/Editor/TableView.tsx", "lines": [542], "usage": "Editor UI - context input field"}
        ],
        "migration_status": "migrated",
        "notes": "Explanation text shown after collection/destruction. Required for correct/distractor items."
    },
    "items.spawn_position": {
        "json_source": "CorrectEntry.spawnPosition, DistractorEntry.spawnPosition",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [92, 112], "usage": "Type definition - spawn location (0.0-1.0)"},
            {"file": "public/content/CONTENT_GUIDE.md", "lines": [281, 296], "usage": "Documentation - horizontal spawn location"}
        ],
        "migration_status": "migrated",
        "notes": "Horizontal spawn location (0.0-1.0). 0.5 = center, 0.0 = left, 1.0 = right."
    },
    "items.spawn_spread": {
        "json_source": "CorrectEntry.spawnSpread, DistractorEntry.spawnSpread",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [93, 113], "usage": "Type definition - random variance"},
            {"file": "public/content/CONTENT_GUIDE.md", "lines": [282, 314], "usage": "Documentation - random variance around spawnPosition"}
        ],
        "migration_status": "migrated",
        "notes": "Random variance around spawnPosition (typically 0.05 = ±5%)"
    },
    "items.spawn_delay": {
        "json_source": "CorrectEntry.spawnDelay, DistractorEntry.spawnDelay",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [94, 114], "usage": "Type definition - optional delay in seconds"}
        ],
        "migration_status": "migrated",
        "notes": "Optional delay in seconds from round start before spawning"
    },
    "items.speed": {
        "json_source": "CorrectEntry.speed, DistractorEntry.speed",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [95, 115], "usage": "Type definition - speed multiplier"},
            {"file": "src/entities/CorrectObject.ts", "lines": [56], "usage": "Movement speed calculation"},
            {"file": "src/entities/DistractorObject.ts", "lines": [65], "usage": "Movement speed calculation"}
        ],
        "migration_status": "migrated",
        "notes": "Speed multiplier (typically 0.9 for correct, 1.1-1.2 for distractors)"
    },
    "items.points": {
        "json_source": "CorrectEntry.points, DistractorEntry.points",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [96, 116], "usage": "Type definition - points awarded"},
            {"file": "src/logic/ShooterEngine.ts", "lines": [400, 450], "usage": "Score calculation on collect/destroy"}
        ],
        "migration_status": "migrated",
        "notes": "Points awarded when collected (correct) or destroyed (distractor)"
    },
    "items.hp": {
        "json_source": "CorrectEntry.hp, DistractorEntry.hp",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [99, 117], "usage": "Type definition - optional hit points"},
            {"file": "src/entities/DistractorObject.ts", "lines": [215, 229], "usage": "HP display and damage handling"}
        ],
        "migration_status": "migrated",
        "notes": "Hit points (default: 1). Objects with HP > 1 require multiple hits."
    },
    "items.sound": {
        "json_source": "CorrectEntry.sound, DistractorEntry.sound",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [103, 123], "usage": "Type definition - optional sound effect"}
        ],
        "migration_status": "migrated",
        "notes": "Optional sound effect filename (e.g., 'bubble_hit_soft', 'explosion_minor')"
    },
    "items.color": {
        "json_source": "VisualConfig.color",
        "code_references": [
            {"file": "src/entities/CorrectObject.ts", "lines": [148], "usage": "Color for correct objects (Shooter mode)"},
            {"file": "src/entities/DistractorObject.ts", "lines": [200], "usage": "Color for distractor objects"},
            {"file": "src/entities/BaseEntity.ts", "lines": [39], "usage": "Color for base word display"},
            {"file": "agents.md", "lines": [342, 345], "usage": "Documentation - overridden in Lernmodus (green/red)"}
        ],
        "migration_status": "migrated",
        "notes": "Hex color code. In Lernmodus: overridden to green (#00ff88) for correct, red (#ff3333) for distractors."
    },
    "items.variant": {
        "json_source": "VisualConfig.variant",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [134], "usage": "Type definition - shape variant"},
            {"file": "src/components/Editor/TableView.tsx", "lines": [545, 550], "usage": "Editor UI - variant display"}
        ],
        "migration_status": "migrated",
        "notes": "Shape variant: 'hexagon', 'star', 'bubble', 'spike', 'square', 'diamond'"
    },
    "items.pulsate": {
        "json_source": "VisualConfig.pulsate",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [132], "usage": "Type definition - pulsation animation"},
            {"file": "src/entities/CorrectObject.ts", "lines": [101], "usage": "Pulsate animation update"},
            {"file": "src/entities/DistractorObject.ts", "lines": [136], "usage": "Pulsate animation update"}
        ],
        "migration_status": "migrated",
        "notes": "Whether item has pulsation animation"
    },
    "items.font_size": {
        "json_source": "VisualConfig.fontSize",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [135], "usage": "Type definition - font size multiplier"},
            {"file": "src/entities/CorrectObject.ts", "lines": [128], "usage": "Font size calculation"},
            {"file": "src/entities/DistractorObject.ts", "lines": [195], "usage": "Font size calculation"}
        ],
        "migration_status": "migrated",
        "notes": "Font size multiplier (typically 1.0-1.2)"
    },
    "items.behavior": {
        "json_source": "DistractorEntry.behavior",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [119], "usage": "Type definition - movement behavior for distractors"},
            {"file": "src/entities/DistractorObject.ts", "lines": [80, 82], "usage": "Movement behavior switch (seek_center, zigzag, linear_inward)"}
        ],
        "migration_status": "migrated",
        "notes": "Movement pattern for distractor items: 'linear_inward', 'seek_center', 'zigzag', 'wave'"
    },
    "items.damage": {
        "json_source": "DistractorEntry.damage",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [118], "usage": "Type definition - damage dealt on collision"},
            {"file": "src/entities/DistractorObject.ts", "lines": [229], "usage": "Damage calculation on ship collision"},
            {"file": "public/content/CONTENT_GUIDE.md", "lines": [390], "usage": "Documentation - damage levels (1-3)"}
        ],
        "migration_status": "migrated",
        "notes": "Damage dealt to Ship on collision (1 = light, 2 = medium, 3 = heavy)"
    },
    "items.redirect": {
        "json_source": "DistractorEntry.redirect",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [120], "usage": "Type definition - redirect hint"},
            {"file": "src/entities/DistractorObject.ts", "lines": [188, 190], "usage": "Redirect text display during collision"}
        ],
        "migration_status": "migrated",
        "notes": "Correct category hint shown when distractor is hit (e.g., 'Schizophrenie')"
    },
    "items.collectionorder": {
        "json_source": "CorrectEntry.collectionOrder",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [100], "usage": "Type definition - collection sequence"},
            {"file": "src/entities/CorrectObject.ts", "lines": [123], "usage": "Display collection order in Lernmodus"}
        ],
        "migration_status": "migrated",
        "notes": "Required collection sequence (1, 2, 3, ...). null = no order required. Used in Lernmodus only."
    },
    "items.round_uuid": {
        "json_source": "Foreign key to rounds.uuid",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Foreign key linking item to round (UUID)"
    },
    "items.uuid": {
        "json_source": "DB UUID (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated UUID for database relationships"
    },
    "items.created_at": {
        "json_source": "DB timestamp (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated timestamp when record is created"
    },
    "items.updated_at": {
        "json_source": "DB timestamp (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated timestamp when record is updated"
    },
    
    # Rounds
    "rounds.id": {
        "json_source": "Item.id",
        "code_references": [
            {"file": "export_rounds_csv.py", "lines": [89, 108], "usage": "CSV export - round identifier"},
            {"file": "src/types/content.types.ts", "lines": [65], "usage": "Type definition - item identifier"}
        ],
        "migration_status": "migrated",
        "notes": "Round identifier (e.g., 'F10_012', 'BR_IT_001')"
    },
    "rounds.chapter_id": {
        "json_source": "Item.chapter",
        "code_references": [
            {"file": "export_rounds_csv.py", "lines": [90, 109], "usage": "CSV export - chapter identifier"},
            {"file": "src/types/content.types.ts", "lines": [67], "usage": "Type definition - chapter identifier"}
        ],
        "migration_status": "migrated",
        "notes": "Foreign key to chapters.id"
    },
    "rounds.level": {
        "json_source": "Item.level",
        "code_references": [
            {"file": "export_rounds_csv.py", "lines": [91, 110], "usage": "CSV export - level number"},
            {"file": "src/types/content.types.ts", "lines": [68], "usage": "Type definition - level (1-6)"},
            {"file": "src/components/Game.tsx", "lines": [140], "usage": "Filter items by level"}
        ],
        "migration_status": "migrated",
        "notes": "Level number (typically 1-6). Used for difficulty progression."
    },
    "rounds.published": {
        "json_source": "Item.published",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [69], "usage": "Type definition - published status"},
            {"file": "src/infra/utils/JSONLoader.ts", "lines": [175, 176], "usage": "Filter by published status"}
        ],
        "migration_status": "migrated",
        "notes": "Whether item is published and visible to end users (default: true)"
    },
    "rounds.wave_duration": {
        "json_source": "Item.waveDuration",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [71], "usage": "Type definition - wave duration"},
            {"file": "export_rounds_csv.py", "lines": [92, 112], "usage": "CSV export - wave duration"},
            {"file": "src/config/config.json", "lines": [10], "usage": "Default fallback value (8 seconds)"}
        ],
        "migration_status": "migrated",
        "notes": "Wave duration in seconds. Fallback to config.json if not set."
    },
    "rounds.meta_source": {
        "json_source": "Item.meta.source",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [141], "usage": "Type definition - source reference"},
            {"file": "export_rounds_csv.py", "lines": [97, 113], "usage": "CSV export - meta source"}
        ],
        "migration_status": "migrated",
        "notes": "Source reference (e.g., 'ICD-10-GM 2025', 'Italian Brainrot 2025')"
    },
    "rounds.meta_tags": {
        "json_source": "Item.meta.tags",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [142], "usage": "Type definition - tags array"},
            {"file": "export_rounds_csv.py", "lines": [98, 114], "usage": "CSV export - meta tags"}
        ],
        "migration_status": "migrated",
        "notes": "Array of tags for categorization (e.g., ['brainrot', 'italian', 'memes'])"
    },
    "rounds.meta_difficulty_scaling": {
        "json_source": "Item.meta.difficultyScaling",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [144], "usage": "Type definition - difficulty scaling config"},
            {"file": "export_rounds_csv.py", "lines": [99, 115], "usage": "CSV export - difficulty scaling"}
        ],
        "migration_status": "migrated",
        "notes": "JSONB object: {speedMultiplierPerReplay, colorContrastFade, angleVariance}"
    },
    "rounds.free_tier": {
        "json_source": "Item.freeTier",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [70], "usage": "Type definition - free tier flag"},
            {"file": "src/components/Game.tsx", "lines": [147], "usage": "Filter items for guest users"}
        ],
        "migration_status": "missing",
        "notes": "Whether item is available for free (guest users without login). Default: false (Opt-in for security)."
    },
    "rounds.intro_text": {
        "json_source": "Item.introText",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [72], "usage": "Type definition - optional intro text"}
        ],
        "migration_status": "missing",
        "notes": "Optional intro text displayed before round starts"
    },
    "rounds.meta_related": {
        "json_source": "Item.meta.related",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [143], "usage": "Type definition - related item IDs"}
        ],
        "migration_status": "missing",
        "notes": "Array of related round/item IDs for cross-referencing"
    },
    "rounds.chapter_uuid": {
        "json_source": "Foreign key to chapters.uuid",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Foreign key linking round to chapter (UUID)"
    },
    "rounds.uuid": {
        "json_source": "DB UUID (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated UUID for database relationships"
    },
    "rounds.created_at": {
        "json_source": "DB timestamp (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated timestamp when record is created"
    },
    "rounds.updated_at": {
        "json_source": "DB timestamp (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated timestamp when record is updated"
    },
    
    # Themes
    "themes.id": {
        "json_source": "Theme.id",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [31], "usage": "Type definition - theme identifier"},
            {"file": "src/infra/utils/JSONLoader.ts", "lines": [97, 409], "usage": "Loading themes"}
        ],
        "migration_status": "migrated",
        "notes": "Theme identifier (e.g., 'business_english', 'icd10')"
    },
    "themes.name": {
        "json_source": "Theme.name",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [32], "usage": "Type definition - theme name"},
            {"file": "src/components/GalaxyRenderer.ts", "lines": [200], "usage": "Planet label display"}
        ],
        "migration_status": "migrated",
        "notes": "Display name for theme"
    },
    "themes.description": {
        "json_source": "Theme.description",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [33], "usage": "Type definition - theme description"}
        ],
        "migration_status": "migrated",
        "notes": "Description of theme content"
    },
    "themes.color_primary": {
        "json_source": "Theme.colorPrimary",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [34], "usage": "Type definition - primary color"},
            {"file": "src/components/GalaxyRenderer.ts", "lines": [56, 75, 354], "usage": "Planet rendering, glow effects"},
            {"file": "agents.md", "lines": [301, 304], "usage": "Documentation - planet rendering in GalaxyMap"}
        ],
        "migration_status": "migrated",
        "notes": "Main theme color (hex). Used for planet rendering, glow effects, connection lines."
    },
    "themes.color_accent": {
        "json_source": "Theme.colorAccent",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [35], "usage": "Type definition - accent color"},
            {"file": "src/components/GalaxyMap.tsx", "lines": [308], "usage": "Particle effects"},
            {"file": "agents.md", "lines": [307, 310], "usage": "Documentation - particle effects, secondary UI elements"}
        ],
        "migration_status": "migrated",
        "notes": "Secondary theme color (hex). Used for particle effects, secondary visual elements."
    },
    "themes.background_gradient": {
        "json_source": "Theme.backgroundGradient",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [36], "usage": "Type definition - background gradient"},
            {"file": "agents.md", "lines": [312, 315], "usage": "Documentation - theme-level background (chapters override)"}
        ],
        "migration_status": "migrated",
        "notes": "Array of 2+ hex colors. Chapter-level backgroundGradient takes precedence in game rendering."
    },
    "themes.laser_color": {
        "json_source": "Theme.laserColor",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [51], "usage": "Type definition - optional laser color"},
            {"file": "src/components/Game.tsx", "lines": [307], "usage": "Laser rendering"},
            {"file": "src/logic/ShooterEngine.ts", "lines": [500], "usage": "Laser color with fallback chain"},
            {"file": "agents.md", "lines": [317, 321], "usage": "Documentation - priority: theme > universe > default"}
        ],
        "migration_status": "migrated",
        "notes": "Color for laser projectiles. Priority: theme.laserColor > universe.laserColor > '#4a90e2'"
    },
    "themes.icon": {
        "json_source": "Theme.icon",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [38], "usage": "Type definition - icon emoji/identifier"},
            {"file": "src/components/GalaxyRenderer.ts", "lines": [150], "usage": "Planet icon display"}
        ],
        "migration_status": "migrated",
        "notes": "Icon emoji or identifier (e.g., '🧠', '💊')"
    },
    "themes.music": {
        "json_source": "Theme.music (JSONB)",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [43], "usage": "Type definition - music config (not in Theme interface)"},
            {"file": "generate_themes_insert.py", "lines": [107, 114], "usage": "Music as JSONB object"}
        ],
        "migration_status": "migrated",
        "notes": "Music configuration as JSONB: {theme: string, volume: number} or string filename"
    },
    "themes.particle_effect": {
        "json_source": "Theme.particleEffect",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [49], "usage": "Type definition - optional particle effect"}
        ],
        "migration_status": "migrated",
        "notes": "Optional particle effect name. Falls back to universe particle effect."
    },
    "themes.universe_uuid": {
        "json_source": "Foreign key to universes.uuid",
        "code_references": [
            {"file": "generate_themes_insert.py", "lines": [127], "usage": "Foreign key to universe"}
        ],
        "migration_status": "migrated",
        "notes": "Foreign key linking theme to universe (UUID)"
    },
    "themes.uuid": {
        "json_source": "DB UUID (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated UUID for database relationships"
    },
    "themes.obsoloete_uuid": {
        "json_source": "Migration backup field",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Backup field during migration (typo: 'obsoloete' instead of 'obsolete'), may be removed later"
    },
    "themes.created_at": {
        "json_source": "DB timestamp (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated timestamp when record is created"
    },
    "themes.updated_at": {
        "json_source": "DB timestamp (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated timestamp when record is updated"
    },
    
    # Universes
    "universes.id": {
        "json_source": "Universe.id",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [4], "usage": "Type definition - universe identifier"},
            {"file": "src/infra/utils/JSONLoader.ts", "lines": [71, 78], "usage": "Loading universes"}
        ],
        "migration_status": "migrated",
        "notes": "Universe identifier (e.g., 'psychiatrie', 'englisch', 'checkst_du')"
    },
    "universes.name": {
        "json_source": "Universe.name",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [5], "usage": "Type definition - universe name"},
            {"file": "src/components/UniverseSelector.tsx", "lines": [80], "usage": "Universe selector display"}
        ],
        "migration_status": "migrated",
        "notes": "Display name for universe"
    },
    "universes.description": {
        "json_source": "Universe.description",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [6], "usage": "Type definition - universe description"}
        ],
        "migration_status": "migrated",
        "notes": "Description of universe content"
    },
    "universes.color_primary": {
        "json_source": "Universe.colorPrimary",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [7], "usage": "Type definition - primary color"},
            {"file": "src/components/GalaxyRenderer.ts", "lines": [56, 75], "usage": "Planet rendering, glow effects"},
            {"file": "agents.md", "lines": [278, 280], "usage": "Documentation - planet rendering in GalaxyMap"}
        ],
        "migration_status": "migrated",
        "notes": "Main universe color (hex). Used for planet rendering, glow effects, fallback for ring colors."
    },
    "universes.color_accent": {
        "json_source": "Universe.colorAccent",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [8], "usage": "Type definition - accent color"},
            {"file": "src/components/GalaxyMap.tsx", "lines": [308], "usage": "Particle effects (moon particles)"},
            {"file": "agents.md", "lines": [283, 286], "usage": "Documentation - particle effects, secondary UI elements"}
        ],
        "migration_status": "migrated",
        "notes": "Secondary universe color (hex). Used for particle effects, secondary UI elements."
    },
    "universes.background_gradient": {
        "json_source": "Universe.backgroundGradient",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [9], "usage": "Type definition - background gradient"},
            {"file": "src/components/GalaxyMap.tsx", "lines": [789, 790], "usage": "Background rendering in GalaxyMap"},
            {"file": "src/components/UniverseSelector.tsx", "lines": [127], "usage": "Universe selector background"},
            {"file": "agents.md", "lines": [288, 292], "usage": "Documentation - background rendering in GalaxyMap"}
        ],
        "migration_status": "migrated",
        "notes": "Array of 2+ hex colors. Used for background rendering in GalaxyMap (universe selection screen)."
    },
    "universes.laser_color": {
        "json_source": "Universe.laserColor",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [19], "usage": "Type definition - optional laser color"},
            {"file": "src/entities/Laser.ts", "lines": [14, 55], "usage": "Laser rendering"},
            {"file": "src/logic/ShooterEngine.ts", "lines": [500], "usage": "Laser color with fallback chain"},
            {"file": "agents.md", "lines": [294, 298], "usage": "Documentation - fallback chain: theme > universe > default"}
        ],
        "migration_status": "migrated",
        "notes": "Color for laser projectiles. Fallback: theme.laserColor > universe.laserColor > '#4a90e2'"
    },
    "universes.icon": {
        "json_source": "Universe.icon",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [10], "usage": "Type definition - icon emoji/identifier"},
            {"file": "src/components/UniverseSelector.tsx", "lines": [90], "usage": "Universe selector icon display"}
        ],
        "migration_status": "migrated",
        "notes": "Icon emoji or identifier (e.g., '🎓', '✨', '🇬🇧')"
    },
    "universes.available": {
        "json_source": "Universe.available",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [11], "usage": "Type definition - available flag"},
            {"file": "src/infra/utils/JSONLoader.ts", "lines": [59], "usage": "Filter by available status"}
        ],
        "migration_status": "migrated",
        "notes": "Whether universe is available and shown in Galaxy Hub (false = coming soon)"
    },
    "universes.language": {
        "json_source": "Universe.language",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [12], "usage": "Type definition - language code"},
            {"file": "public/content/CONTENT_GUIDE.md", "lines": [93], "usage": "Documentation - ISO language code"}
        ],
        "migration_status": "migrated",
        "notes": "ISO language code (e.g., 'de', 'en', 'es')"
    },
    "universes.music": {
        "json_source": "Universe.music (TEXT or JSONB)",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [13], "usage": "Type definition - music config object"},
            {"file": "migration_insert_universes.sql", "lines": [39, 58], "usage": "Music as TEXT filename"}
        ],
        "migration_status": "migrated",
        "notes": "Music filename (TEXT) or JSONB object: {theme: string, volume: number}"
    },
    "universes.particle_effect": {
        "json_source": "Universe.particleEffect",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [17], "usage": "Type definition - optional particle effect"}
        ],
        "migration_status": "migrated",
        "notes": "Optional particle effect name (e.g., 'trend_particles', 'language_particles')"
    },
    "universes.ship_skin": {
        "json_source": "Universe.shipSkin",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [18], "usage": "Type definition - optional ship skin"},
            {"file": "src/entities/Ship.ts", "lines": [50], "usage": "Ship sprite loading"}
        ],
        "migration_status": "migrated",
        "notes": "Optional ship graphics variant (e.g., 'english_ship', 'trend_ship')"
    },
    "universes.meta": {
        "json_source": "Universe.meta",
        "code_references": [
            {"file": "src/types/content.types.ts", "lines": [23], "usage": "Type definition - meta info object"},
            {"file": "migration_insert_universes.sql", "lines": [42, 61], "usage": "Meta as JSONB: {author, version, created}"}
        ],
        "migration_status": "migrated",
        "notes": "JSONB object: {author: string, version: string, created: string}"
    },
    "universes.uuid": {
        "json_source": "DB UUID (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated UUID for database relationships"
    },
    "universes.created_at": {
        "json_source": "DB timestamp (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated timestamp when record is created"
    },
    "universes.updated_at": {
        "json_source": "DB timestamp (auto-generated)",
        "code_references": [],
        "migration_status": "migrated",
        "notes": "Auto-generated timestamp when record is updated"
    }
}

def enrich_table_fields():
    """Enrich table_fields.json with metadata."""
    file_path = Path("docs/table_fields.json")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    enriched_count = 0
    for field in data:
        key = f"{field['table_name']}.{field['column_name']}"
        
        if key in FIELD_METADATA:
            metadata = FIELD_METADATA[key]
            
            # Only add if not already present
            if 'json_source' not in field:
                field['json_source'] = metadata.get('json_source', '')
                enriched_count += 1
            if 'code_references' not in field:
                field['code_references'] = metadata.get('code_references', [])
            if 'migration_status' not in field:
                field['migration_status'] = metadata.get('migration_status', 'unknown')
            if 'notes' not in field:
                field['notes'] = metadata.get('notes', '')
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    
    print(f"✅ Enriched {enriched_count} fields with metadata")
    print(f"   Total fields: {len(data)}")

if __name__ == "__main__":
    enrich_table_fields()


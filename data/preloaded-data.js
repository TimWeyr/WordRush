// Auto-generated fallback data for file:// usage
window.WORDRUSH_EMBED = {
  "config": {
    "appName": "WordRush",
    "defaultLanguages": [
      "de",
      "en",
      "es"
    ],
    "startingLevel": 1,
    "maxLevel": 10,
    "points": {
      "hitDistractor": 50,
      "hitCorrect": -150,
      "missShot": -25,
      "correctCollision": 50
    },
    "speed": {
      "base": 1.0,
      "incrementPerLevel": 0.1
    },
    "reverseModeEnabled": true,
    "bossSettings": {
      "roundsBetweenBoss": 3,
      "maxWords": 10,
      "speedMultiplier": 1.5,
      "points": {
        "hitDistractor": 60,
        "hitCorrect": -200,
        "correctCollision": 500
      },
      "rewards": {
        "family": "glow_crosshair_01",
        "car": "speed_boost_01",
        "nature": "forest_theme_bg"
      }
    },
    "storageKeys": {
      "progress": "ls_progress",
      "settings": "ls_settings",
      "bonus": "ls_bonus_rounds"
    }
  },
  "levels": [
    {
      "id": 1,
      "name": "Beginner",
      "speedMultiplier": 1.0,
      "maxDistractors": 2,
      "themeRotation": [
        "family",
        "nature"
      ]
    },
    {
      "id": 2,
      "name": "Intermediate",
      "speedMultiplier": 1.25,
      "maxDistractors": 3,
      "themeRotation": [
        "car",
        "family"
      ]
    },
    {
      "id": 3,
      "name": "Advanced",
      "speedMultiplier": 1.5,
      "maxDistractors": 4,
      "themeRotation": [
        "nature",
        "car",
        "family"
      ]
    }
  ],
  "themes": [
    {
      "id": "family",
      "name": "Family",
      "colorTheme": [
        "#ffb6b9",
        "#fae3d9"
      ]
    },
    {
      "id": "nature",
      "name": "Nature",
      "colorTheme": [
        "#b5e48c",
        "#76c893"
      ]
    },
    {
      "id": "car",
      "name": "Automobile",
      "colorTheme": [
        "#a0c4ff",
        "#caffbf"
      ]
    }
  ],
  "words": [
    {
      "id": 101,
      "word_de": "Auto",
      "correct_en": "car",
      "distractors": [
        "train",
        "bus",
        "bike"
      ],
      "theme": "car",
      "level": 1
    },
    {
      "id": 102,
      "word_de": "Getriebe",
      "correct_en": "gearbox",
      "distractors": [
        "engine",
        "brake",
        "pedal"
      ],
      "theme": "car",
      "level": 3
    },
    {
      "id": 201,
      "word_de": "Mutter",
      "correct_en": "mother",
      "distractors": [
        "father",
        "daughter",
        "sister"
      ],
      "theme": "family",
      "level": 1
    },
    {
      "id": 202,
      "word_de": "Stiefvater",
      "correct_en": "stepfather",
      "distractors": [
        "uncle",
        "grandfather",
        "father"
      ],
      "theme": "family",
      "level": 3
    },
    {
      "id": 301,
      "word_de": "Baum",
      "correct_en": "tree",
      "distractors": [
        "flower",
        "grass",
        "bush"
      ],
      "theme": "nature",
      "level": 1
    },
    {
      "id": 302,
      "word_de": "Wolke",
      "correct_en": "cloud",
      "distractors": [
        "rain",
        "snow",
        "fog"
      ],
      "theme": "nature",
      "level": 2
    },
    {
      "id": 901,
      "word_de": "Mutter",
      "correct_en": "mother",
      "distractors": [
        "father",
        "daughter",
        "aunt",
        "woman",
        "lady",
        "girl",
        "sister"
      ],
      "theme": "family",
      "level": "boss",
      "reward": "glow_crosshair_01"
    },
    {
      "id": 902,
      "word_de": "Auto",
      "correct_en": "car",
      "distractors": [
        "bus",
        "truck",
        "train",
        "wheel",
        "engine",
        "bike",
        "road"
      ],
      "theme": "car",
      "level": "boss",
      "reward": "speed_boost_01"
    },
    {
      "id": 903,
      "word_de": "Baum",
      "correct_en": "tree",
      "distractors": [
        "flower",
        "grass",
        "bush",
        "rock",
        "rain",
        "leaf",
        "seed"
      ],
      "theme": "nature",
      "level": "boss",
      "reward": "forest_theme_bg"
    }
  ]
};

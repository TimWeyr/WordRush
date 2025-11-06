🧠 Overview

WordRush is a fast-paced, visually immersive language-learning game inspired by Duolingo and classic arcade shooters.
Players defend a target word by shooting down incorrect translations before they collide.
Each correct word that “lands” rewards you with points and a burst of color and sound — learning by instinct and reaction.

🌈 Gameplay

A target word appears in the center (e.g., “Mutter”).

Several flying words approach from different directions (e.g., “Mother”, “Father”, “Sister”).

The player must shoot the wrong words before they hit.

If the correct translation collides safely → ✨ points + animation.

If a wrong word reaches the center → 💀 lose points.

🕹️ Controls
Platform	Aim	Shoot	Pause
Desktop	Mouse / Cursor	Space or Click	ESC
Mobile / Tablet	Tap target word	Tap again to shoot	Double tap background
⚙️ Features

Level-based difficulty (speed & vocabulary increase).

Adaptive word repetition: missed words return later.

Animated gradient backgrounds for each theme.

Local progress tracking with localStorage.

Optional “reverse mode” (practice the opposite direction).

Bonus pair-matching mini-game every few levels.

🧩 JSON-Driven Design

All content is modular and easy to extend.

config.json

Stores global settings like base speed, scoring, and localStorage keys.

levels.json

Defines levels, speed multipliers, and visual color themes.

words_de_en.json

Contains word pairs and distractors. Example:

{
  "id": 1,
  "level": 1,
  "word_de": "Haus",
  "correct_en": "house",
  "distractors": ["mouse", "car", "tree"]
}
themes.json

Specifies background color gradients and transition speed.

🧮 Game Loop

Load configuration & word data.

Display target word and spawn flying words.

Handle player input (shoot/tap).

Animate hits and update score.

Level up when score threshold reached.

Repeat — with faster words and new themes.

Store results in localStorage for replay continuity.

🧰 File Structure
/WordRush/
│
├── index.html
├── game.js
├── config.json
├── data/
│   ├── levels.json
│   ├── words_de_en.json
│   └── themes.json
└── assets/
    └── sounds/
🚀 Future Ideas

🌍 Add new languages (FR, ES, IT, etc.)

🔉 Sound effects & ambient tones

🧠 AI-generated word sets for adaptive learning

💫 Achievement system & leaderboard

🎨 Custom theme editor

🧑‍💻 Tech Stack

Frontend: HTML5 Canvas / JavaScript

Data: JSON (dynamic loading)

Storage: Browser localStorage

Engine: Custom lightweight game loop

📄 License

MIT License — feel free to fork, remix, and build your own language universe.

#!/usr/bin/env python3
"""
Generate Internetslang Items for WordRush
Creates chapter JSON files with all items from the provided list.
"""

import json
import os
import random

# Theme and chapter configuration
THEME_ID = "internetslang"
BASE_ID_PREFIX = "IS"

# Chapter mapping: Item number -> Chapter name
CHAPTER_MAPPING = {
    1: "Basic_Slang",      # Smol
    2: "Basic_Slang",      # Snack
    3: "Basic_Slang",      # Snatched
    4: "Basic_Slang",      # Dope
    5: "Basic_Slang",      # Dox
    6: "Basic_Slang",      # Bet
    7: "Basic_Slang",      # Extra/Mid
    8: "Basic_Slang",      # GOAT
    9: "Basic_Slang",      # GRWM
    10: "Basic_Slang",     # IYKYK
    13: "Basic_Slang",     # 420
    14: "Basic_Slang",     # Chill
    16: "Basic_Slang",     # Tea
    17: "Basic_Slang",     # Cap/Cooked
    19: "Basic_Slang",     # Lowkey/Highkey
    20: "Basic_Slang",     # Shook
    21: "Basic_Slang",     # Go Off/IDC
    22: "Basic_Slang",     # FYP
    23: "Basic_Slang",     # ROFL/Ragebait
    24: "Basic_Slang",     # W/L
    25: "TikTok_Trends",   # One Tooth
    26: "TikTok_Trends",   # Trouble End
    27: "TikTok_Trends",   # Nutella More
    28: "TikTok_Trends",   # Guard Dogs
    29: "TikTok_Trends",   # Boyfriend Cringe
    30: "TikTok_Trends",   # Holiday List
    33: "TikTok_Trends",   # Season End
    31: "Italian_Brainrot", # Italianrot
    32: "Italian_Brainrot", # Tung Tung
    52: "Italian_Brainrot", # Bomberdilo
    11: "Meme_Culture",    # Crashing Out
    12: "Meme_Culture",    # Locking In
    15: "Meme_Culture",    # Chad
    18: "Meme_Culture",    # Flex
    34: "2025_Trends",     # Parasocial
    35: "2025_Trends",     # 67 Chant
    36: "2025_Trends",     # Hawk Tuah
    37: "2025_Trends",     # Speed Dingaling
    38: "2025_Trends",     # Max Design Pro
    39: "2025_Trends",     # Pomni
    40: "2025_Trends",     # BreakThePencil
    41: "2025_Trends",     # Mr Incredible
    42: "2025_Trends",     # Friday Night Funkin
    43: "2025_Trends",     # Gatekeeping
    44: "2025_Trends",     # Conflict Resolution
    45: "2025_Trends",     # Ice Tea
    46: "2025_Trends",     # Cool Guying
    47: "2025_Trends",     # Quotation Marks
    48: "2025_Trends",     # False Metalcore
    49: "2025_Trends",     # Bed-Rotting
    50: "2025_Trends",     # Lots Of Friends
    51: "2025_Trends",     # Drinking Cool
    53: "2025_Trends",     # Oxtail Emoji
    54: "2025_Trends",     # Aurabiōm
    55: "2025_Trends",     # Pound Sugar Day
    56: "2025_Trends",     # Methylene Blue
    57: "2025_Trends",     # Seed Oils
    58: "Fandom_Culture",  # Homophobic Jinx
    59: "Fandom_Culture", # Jayce Boyz
    60: "Fandom_Culture", # Zaun Stink
}

# Item data structure with levels
ITEMS = {
    1: {"level": 1, "base": "Small Cute", "correct": [{"word": "Smol", "context": "Adorable way to say something tiny and cute, like a puppy."}], "distractors": [{"word": "Biggie", "redirect": "Smol", "context": "Opposite of small; smol for extra cuteness overload."}, {"word": "Giant Vibes", "redirect": "Tiny Feels", "context": "Huge energy; smol keeps it wholesome."}]},
    2: {"level": 1, "base": "Attractive Person", "correct": [{"word": "Snack", "context": "Someone looking super hot, ready to \"eat up.\""}, {"word": "Bussin", "context": "Not just food, but anyone slaying looks."}], "distractors": [{"word": "Meal Deal", "redirect": "Full Course", "context": "Budget combo; snack is quick hotness."}, {"word": "Leftover", "redirect": "Fresh Snack", "context": "Stale vibes; snack is prime time."}]},
    3: {"level": 2, "base": "Looking Good", "correct": [{"word": "Snatched", "context": "Outfit or face on point, no flaws."}], "distractors": [{"word": "Stolen", "redirect": "Snatched Edges", "context": "Theft joke; snatched means styled perfect."}, {"word": "Messy Bun", "redirect": "Clean Look", "context": "Casual chaos; snatched is polished slay."}]},
    4: {"level": 1, "base": "Awesome Thing", "correct": [{"word": "Dope", "context": "Cool or excellent, like a sick trick."}, {"word": "Slaps", "context": "Hits hard, like a banger song."}], "distractors": [{"word": "Lame Duck", "redirect": "Fire Track", "context": "Weak fail; dope slaps the roof."}]},
    5: {"level": 2, "base": "Private Info Leak", "correct": [{"word": "Dox", "context": "Posting someone's address online maliciously."}], "distractors": [{"word": "Box Gift", "redirect": "Info Dump", "context": "Present surprise; dox ruins lives lol."}, {"word": "Fox Hunt", "redirect": "Data Reveal", "context": "Animal chase; dox is cyber revenge."}]},
    6: {"level": 1, "base": "Agreement Word", "correct": [{"word": "Bet", "context": "Means yes or deal, simple affirm."}], "distractors": [{"word": "Nah Fam", "redirect": "Bet On It", "context": "Disagree troll; bet seals the pact."}]},
    7: {"level": 3, "base": "Over The Top", "correct": [{"word": "Extra", "context": "Doing too much, dramatic vibes in 2025 drama."}, {"word": "Mid", "context": "Just average, not hype enough."}], "distractors": [{"word": "Basic Mode", "redirect": "Extra Sauce", "context": "Plain Jane; extra amps it up ironically."}, {"word": "Chill Pill", "redirect": "Drama Queen", "context": "Relaxed; extra is attention grab."}]},
    8: {"level": 1, "base": "Best Ever", "correct": [{"word": "GOAT", "context": "Greatest of all time, like a legend."}], "distractors": [{"word": "Sheep Follow", "redirect": "Legend Status", "context": "Herd mentality; GOAT stands alone."}, {"word": "Farm Animal", "redirect": "Icon Vibes", "context": "Literal pet; GOAT is peak praise."}]},
    9: {"level": 2, "base": "Prep Routine", "correct": [{"word": "GRWM", "context": "Get ready with me, TikTok makeup vid."}], "distractors": [{"word": "GTFO", "redirect": "Routine Share", "context": "Leave now; GRWM invites viewers in."}]},
    10: {"level": 1, "base": "Insider Knowledge", "correct": [{"word": "IYKYK", "context": "If you know, you know, secret club feel."}, {"word": "No Cap", "context": "No lie, straight facts."}], "distractors": [{"word": "Cap On", "redirect": "Truth Bomb", "context": "Lying hat; no cap drops real tea."}, {"word": "Bottle Up", "redirect": "Spill It", "context": "Keep secret; IYKYK hints without spoiling."}]},
    11: {"level": 3, "base": "Losing Control", "correct": [{"word": "Crashing Out", "context": "Freaking out badly, 2025 rage mode."}], "distractors": [{"word": "Smooth Landing", "redirect": "Meltdown Vibes", "context": "Safe end; crashing out is epic fail."}, {"word": "Takeoff High", "redirect": "Crash Land", "context": "Start strong; end in chaos lol."}]},
    12: {"level": 2, "base": "Focus Mode", "correct": [{"word": "Locking In", "context": "Getting serious, grind time."}, {"word": "W or L", "context": "Win or loss, outcome call."}], "distractors": [{"word": "Unlocked Door", "redirect": "Focus Key", "context": "Open access; locking in shuts distractions."}, {"word": "Tie Game", "redirect": "Clear W", "context": "Draw bore; W/L calls the shots."}]},
    13: {"level": 1, "base": "Marijuana Ref", "correct": [{"word": "420", "context": "Weed code, blaze time."}], "distractors": [{"word": "911 Emergency", "redirect": "Chill Sesh", "context": "Call help; 420 is relax code."}]},
    14: {"level": 2, "base": "Relaxed Vibe", "correct": [{"word": "Chill", "context": "Laid back, no stress."}, {"word": "Vibe Check", "context": "Mood gauge, feel the energy."}], "distractors": [{"word": "Heated Up", "redirect": "Cool Down", "context": "Angry boil; chill freezes drama."}, {"word": "Fail Test", "redirect": "Pass Vibes", "context": "Bad grade; vibe check approves."}]},
    15: {"level": 3, "base": "Alpha Male", "correct": [{"word": "Chad", "context": "Buff dude, ladies man stereotype."}], "distractors": [{"word": "Beta Fish", "redirect": "Alpha Bro", "context": "Pet swim; Chad owns the room."}, {"word": "Omega End", "redirect": "Top Dog", "context": "Last place; Chad leads pack."}]},
    16: {"level": 1, "base": "Gossip Spill", "correct": [{"word": "Tea", "context": "Hot news or drama share."}], "distractors": [{"word": "Coffee Break", "redirect": "Spill Tea", "context": "Energy boost; tea brews scandals."}, {"word": "Water Cool", "redirect": "Steamy Gossip", "context": "Plain chat; tea heats it up."}]},
    17: {"level": 2, "base": "Lie Detector", "correct": [{"word": "Cap", "context": "Calling bluff, that's a lie."}, {"word": "Cooked", "context": "Done for, exposed bad."}], "distractors": [{"word": "Hat On", "redirect": "No Cap", "context": "Wear lie; cap off for truth."}, {"word": "Raw Deal", "redirect": "Burnt Out", "context": "Fresh start; cooked means roasted."}]},
    18: {"level": 3, "base": "Show Off", "correct": [{"word": "Flex", "context": "Brag subtly, show gains."}], "distractors": [{"word": "Bend Break", "redirect": "Muscle Show", "context": "Yoga fail; flex is humble brag."}]},
    19: {"level": 1, "base": "Understated Fact", "correct": [{"word": "Lowkey", "context": "Secretly true, downplay it."}, {"word": "Highkey", "context": "Obviously true, loud admit."}], "distractors": [{"word": "Midkey", "redirect": "Extreme Ends", "context": "Average meh; low/high key polarizes."}, {"word": "No Key", "redirect": "Locked In", "context": "Access denied; keys open truths."}]},
    20: {"level": 2, "base": "Surprised React", "correct": [{"word": "Shook", "context": "Shocked or rattled big time."}], "distractors": [{"word": "Steady Rock", "redirect": "Quake Vibes", "context": "Unmoved; shook trembles core."}, {"word": "Calm Wave", "redirect": "Tsunami Hit", "context": "Gentle flow; shook is storm."}]},
    21: {"level": 3, "base": "Encourage Rant", "correct": [{"word": "Go Off", "context": "Let loose, spill your take."}, {"word": "IDC", "context": "I don't care, dismiss vibe."}], "distractors": [{"word": "Shut Up", "redirect": "Speak Up", "context": "Silence please; go off amps voice."}, {"word": "Care Bear", "redirect": "Zero F's", "context": "Huggy feels; IDC ghosts drama."}]},
    22: {"level": 1, "base": "For You Page", "correct": [{"word": "FYP", "context": "TikTok algo feed, viral spot."}], "distractors": [{"word": "My Page", "redirect": "Algo Magic", "context": "Personal profile; FYP discovers gems."}]},
    23: {"level": 2, "base": "Laugh Floor", "correct": [{"word": "ROFL", "context": "Rolling on floor laughing, epic funny."}, {"word": "Ragebait", "context": "Post to trigger anger for engagement."}], "distractors": [{"word": "Stand Still", "redirect": "Floor Roll", "context": "No move; ROFL hits ground."}, {"word": "Peace Post", "redirect": "Trigger Trap", "context": "Calm share; ragebait hooks mad."}]},
    24: {"level": 3, "base": "Win Loss", "correct": [{"word": "W", "context": "Big win, success mark."}, {"word": "L", "context": "Tough loss, fail stamp."}], "distractors": [{"word": "Tie Knot", "redirect": "Clear Cut", "context": "Draw even; W/L decides fate."}, {"word": "Draw Art", "redirect": "Score Settle", "context": "Sketch fun; L draws blood lol."}]},
    25: {"level": 1, "base": "One Tooth Trend", "correct": [{"word": "Giving Myself One Tooth", "context": "Viral TikTok filter for silly smiles."}], "distractors": [{"word": "Full Grill", "redirect": "Single Chomp", "context": "Bling teeth; one tooth memes solo."}, {"word": "Dentist Visit", "redirect": "Filter Fun", "context": "Real fix; trend is digital gag."}]},
    26: {"level": 2, "base": "Trouble End", "correct": [{"word": "All That Trouble Just to End Up With", "context": "Relatable fail caption on TikTok."}, {"word": "Alan We Are So", "context": "Meme phrase for ironic situations."}], "distractors": [{"word": "Easy Win", "redirect": "Epic Fail", "context": "Smooth sail; trouble builds punchline."}, {"word": "Bob Chill", "redirect": "Alan Drama", "context": "Wrong name; Alan owns the meme."}]},
    27: {"level": 3, "base": "Dancing Animals", "correct": [{"word": "Nutella More", "context": "Cute animal dances with product tie-ins."}], "distractors": [{"word": "Static Pets", "redirect": "Groove Crew", "context": "Still shots; dancing goes viral."}]},
    28: {"level": 1, "base": "Guard Dog Fail", "correct": [{"word": "Low Quality Guard Dogs", "context": "Funny vids of lazy pets \"guarding.\""}, {"word": "Texts From Loved Ones", "context": "Sweet or cringy message shares."}], "distractors": [{"word": "Pro Security", "redirect": "Lazy Bark", "context": "Alert pros; low quality flops hilariously."}, {"word": "Spam Mail", "redirect": "Heart Texts", "context": "Junk inbox; loved ones warm hearts."}]},
    29: {"level": 2, "base": "Boyfriend Cringe", "correct": [{"word": "Embarrassing Boyfriends", "context": "TikTok roasts of partners' antics."}], "distractors": [{"word": "Perfect Prince", "redirect": "Cringe King", "context": "Ideal guy; embarrassing adds laughs."}, {"word": "Solo Life", "redirect": "Couple Goals Fail", "context": "Single peace; boyfriends meme chaos."}]},
    30: {"level": 3, "base": "Holiday List", "correct": [{"word": "Festive Wishlists", "context": "Viral shares of dream gifts for holidays."}, {"word": "Thanksgiving Content", "context": "Family chaos vids dominating November."}], "distractors": [{"word": "Empty Cart", "redirect": "Wish Flood", "context": "No wants; lists overflow hype."}, {"word": "Easter Eggs", "redirect": "Turkey Tales", "context": "Spring hunt; Thanksgiving feasts memes."}]},
    31: {"level": 1, "base": "Italian Brainrot", "correct": [{"word": "Italianrot", "context": "Absurd Italian phrases gone viral on TikTok."}], "distractors": [{"word": "French Fry", "redirect": "Pasta Chaos", "context": "Side dish; Italianrot main course madness."}]},
    32: {"level": 2, "base": "Tung Tung", "correct": [{"word": "Tung Tung Tung Sahur", "context": "Catchy sound for Italianrot dances."}, {"word": "Ballerina Cappuccina", "context": "Character in the meme universe."}], "distractors": [{"word": "Silent Night", "redirect": "Beat Drop", "context": "Quiet carol; tung tung bangs loud."}, {"word": "Cowboy Coffee", "redirect": "Ballet Brew", "context": "Western sip; cappuccina spins Italian."}]},
    33: {"level": 3, "base": "Season End", "correct": [{"word": "2025 Season Comes to End", "context": "Reflective TikTok trend for year wrap."}], "distractors": [{"word": "New Begin", "redirect": "Wrap Up", "context": "Fresh start; end trend nostalgia bombs."}, {"word": "Endless Loop", "redirect": "Finale Fade", "context": "Repeat forever; season ends viral."}]},
    34: {"level": 1, "base": "Fake Relationship", "correct": [{"word": "Parasocial", "context": "One-sided fan bond, 2025 word of year."}], "distractors": [{"word": "Real BFF", "redirect": "Fan Illusion", "context": "True pals; parasocial is screen crush."}]},
    35: {"level": 2, "base": "Chant Code", "correct": [{"word": "67 Chant", "context": "Rapper Skrilla's viral nonsense phrase."}, {"word": "6-7", "context": "Classroom chaos trigger, banned in schools."}], "distractors": [{"word": "123 Count", "redirect": "Secret Code", "context": "Basic math; 67 memes rebellion."}, {"word": "High Five", "redirect": "Low Chant", "context": "Slap celebrate; 6-7 disrupts class lol."}]},
    36: {"level": 3, "base": "Spit Meme", "correct": [{"word": "Hawk Tuah", "context": "Viral spit sound from 2024 carrying into 2025."}], "distractors": [{"word": "Swallow Pill", "redirect": "Spit Game", "context": "Accept truth; hawk tuah ejects funny."}, {"word": "Whisper Quiet", "redirect": "Loud Hawk", "context": "Soft talk; tuah blasts memes."}]},
    37: {"level": 1, "base": "Speed Dingaling", "correct": [{"word": "IShowSpeed Dingaling Memes", "context": "Streamer antics turned viral clips."}], "distractors": [{"word": "Slow Poke", "redirect": "Speed Rush", "context": "Lazy lag; speed dings bells fast."}]},
    38: {"level": 2, "base": "Design Pro", "correct": [{"word": "Max Design Pro", "context": "Character memes for absurd humor."}, {"word": "Chill Guy", "context": "Relaxed dude in ironic situations."}], "distractors": [{"word": "Min Effort", "redirect": "Max Pro", "context": "Low try; max designs peak effort."}, {"word": "Stress Bro", "redirect": "Chill Mode", "context": "Tense vibes; guy chills memes out."}]},
    39: {"level": 3, "base": "Circus Girl", "correct": [{"word": "Pomni", "context": "Amazing Digital Circus star, anxiety icon."}], "distractors": [{"word": "Clown Honk", "redirect": "Trap Escape", "context": "Joke nose; Pomni deep lore."}, {"word": "Ring Master", "redirect": "Lost Soul", "context": "Boss control; Pomni panics viral."}]},
    40: {"level": 1, "base": "Pencil Break", "correct": [{"word": "BreakThePencil", "context": "Frustration challenge on TikTok."}], "distractors": [{"word": "Draw Line", "redirect": "Snap Rage", "context": "Art create; break vents anger."}]},
    41: {"level": 2, "base": "Uncanny Meme", "correct": [{"word": "Mr Incredible Becoming Uncanny", "context": "Escalating creepy phases."}], "distractors": [{"word": "Canny Smart", "redirect": "Uncanny Creep", "context": "Clever win; uncanny twists spooky."}, {"word": "Super Normal", "redirect": "Phase Shift", "context": "Everyday; incredible memes evolve."}]},
    42: {"level": 3, "base": "Funkin Night", "correct": [{"word": "Friday Night Funkin", "context": "Rhythm game memes persisting in 2025."}, {"word": "Tweaker", "context": "Hyper energy character in viral posts."}], "distractors": [{"word": "Monday Blues", "redirect": "Friday Beats", "context": "Week start; funkin ends high."}, {"word": "Chill Pill", "redirect": "Twitch Energy", "context": "Calm down; tweaker amps chaos."}]},
    43: {"level": 1, "base": "Gate Keep", "correct": [{"word": "Gatekeeping", "context": "Hoarding info, in for 2025 trends."}], "distractors": [{"word": "Open Gate", "redirect": "Guard Secrets", "context": "Welcome all; gatekeep protects niche."}]},
    44: {"level": 2, "base": "Conflict Fix", "correct": [{"word": "Conflict Resolution", "context": "Solving drama, trendy skill up."}, {"word": "Going To Shows", "context": "Live events back in vogue."}], "distractors": [{"word": "Fight Club", "redirect": "Peace Talk", "context": "Punch out; resolution chats win."}, {"word": "Home Stay", "redirect": "Venue Vibes", "context": "Couch chill; shows energize crowds."}]},
    45: {"level": 3, "base": "Ice Tea Trend", "correct": [{"word": "Ice Tea", "context": "Casual drink symbol for chill 2025."}], "distractors": [{"word": "Hot Coffee", "redirect": "Cool Sip", "context": "Steam burn; ice tea refreshes memes."}, {"word": "Soda Pop", "redirect": "Tea Time", "context": "Fizzy fun; ice tea smooths trends."}]},
    46: {"level": 1, "base": "Cool Guy Out", "correct": [{"word": "Cool Guying", "context": "Pretend cool, out in 2025 predictions."}], "distractors": [{"word": "Nerd Flex", "redirect": "Pose Fail", "context": "Geek win; cool guying flops ironic."}]},
    47: {"level": 2, "base": "Quote Mock", "correct": [{"word": "Quotation Marks Mock", "context": "Sarcasm quotes, phased out."}, {"word": "Genre Tourism", "context": "Fake fan hopping, not knowing history."}], "distractors": [{"word": "Real Quote", "redirect": "Sarcasm Drop", "context": "Serious cite; mocks overuse tired."}, {"word": "Deep Dive", "redirect": "Surface Skim", "context": "Expert know; tourism shallow lol."}]},
    48: {"level": 3, "base": "False Core", "correct": [{"word": "False Metalcore", "context": "Fake genre fans, out for authenticity."}], "distractors": [{"word": "True Metal", "redirect": "Core Fake", "context": "Real headbang; false dilutes scene."}, {"word": "Pop Tour", "redirect": "Metal Stay", "context": "Mainstream hop; core demands roots."}]},
    49: {"level": 1, "base": "Bed Rot Out", "correct": [{"word": "Bed-Rotting Out", "context": "Lazy isolation trend dying slow."}], "distractors": [{"word": "Active Run", "redirect": "Rot Stop", "context": "Energy burst; rotting was 2024 slump."}]},
    50: {"level": 2, "base": "Friend Status", "correct": [{"word": "Lots Of Friends", "context": "High-status squad building in 2025."}, {"word": "Whimsy Media", "context": "Fun, uncurated posts rising."}], "distractors": [{"word": "Lone Wolf", "redirect": "Pack High", "context": "Solo hunt; friends boost status."}, {"word": "Perfect Grid", "redirect": "Messy Fun", "context": "Curated bore; whimsy sparks joy."}]},
    51: {"level": 3, "base": "Drinking Cool", "correct": [{"word": "Drinking Cool Again", "context": "Social sipping back in trends."}], "distractors": [{"word": "Sober Strict", "redirect": "Sip Trend", "context": "No buzz; drinking chills party."}, {"word": "Dry January", "redirect": "Wet Year", "context": "Month off; 2025 flows drinks."}]},
    52: {"level": 1, "base": "Bomberdilo", "correct": [{"word": "Bomberdilo Crocodilo", "context": "Italianrot phrase for absurd hype."}], "distractors": [{"word": "Turtle Shell", "redirect": "Croc Snap", "context": "Slow hide; bomberdilo explodes viral."}]},
    53: {"level": 2, "base": "Oxtail Emoji", "correct": [{"word": "Oxtail Emoji", "context": "Predicted new food icon for 2025."}, {"word": "Luigi Model", "context": "Meme character kicking off career."}], "distractors": [{"word": "Cow Tail", "redirect": "Ox Tail", "context": "Moo mixup; oxtail specific crave."}, {"word": "Mario Lead", "redirect": "Luigi Win", "context": "Bro boss; Luigi solos trends."}]},
    54: {"level": 3, "base": "Aurabiom Drop", "correct": [{"word": "Aurabiōm Product", "context": "Anti-ageing skincare bankrupting Botox."}], "distractors": [{"word": "Wrinkle Cream", "redirect": "Glow Bomb", "context": "Basic fix; aurabiōm revolutionizes."}, {"word": "Injection Stay", "redirect": "Topical Win", "context": "Needle pain; drop disrupts industry."}]},
    55: {"level": 1, "base": "Sugar Experiment", "correct": [{"word": "Pound Sugar Day", "context": "Health twist experiment in predictions."}], "distractors": [{"word": "Keto Strict", "redirect": "Sweet Max", "context": "No carb; sugar pounds test limits."}]},
    56: {"level": 2, "base": "Blue Water", "correct": [{"word": "Methylene Blue Tap", "context": "Mandated health boost in water."}, {"word": "Gelatinous Cookbook", "context": "Mandatory school read for wellness."}], "distractors": [{"word": "Red Dye", "redirect": "Blue Boost", "context": "Fake color; methylene heals memes."}, {"word": "Fiction Novel", "redirect": "Recipe Must", "context": "Story time; gelatinous cooks real."}]},
    57: {"level": 3, "base": "Seed Oil Frown", "correct": [{"word": "Seed Oils Frowned", "context": "Bullied like old taboos in 2025."}], "distractors": [{"word": "Olive Praise", "redirect": "Seed Hate", "context": "Healthy drip; seeds get roasted."}, {"word": "Vaccine Boost", "redirect": "Jab Shade", "context": "Health shot; vaccines meme bullied."}]},
    58: {"level": 1, "base": "Homophobic Jinx", "correct": [{"word": "Homophobic Jinx", "context": "Fandom meme bringing back in 2025."}], "distractors": [{"word": "Ally Flag", "redirect": "Jinx Shade", "context": "Support wave; homophobic trolls ironic."}]},
    59: {"level": 2, "base": "Jayce Boyz", "correct": [{"word": "Jayce One Of Da Boyzz", "context": "Character inclusion in group memes."}, {"word": "Ur Hot Cupcake", "context": "Flirty phrase revival."}], "distractors": [{"word": "Lone Ranger", "redirect": "Squad Join", "context": "Solo ride; Jayce boys up."}, {"word": "Cold Ice", "redirect": "Hot Bake", "context": "Freeze burn; cupcake melts hearts."}]},
    60: {"level": 3, "base": "Zaun Stink", "correct": [{"word": "Zaunites Stinkin Like Boiled Eggs", "context": "Fandom roast for smelly vibes."}, {"word": "Maddie Marcus Daughter", "context": "Plot twist meme persisting."}], "distractors": [{"word": "Fresh Breeze", "redirect": "Egg Stench", "context": "Clean air; Zaun boils bad."}, {"word": "Stranger Kid", "redirect": "Family Tie", "context": "No link; Maddie connects dots lol."}]},
}

def generate_item_id(chapter_abbr, item_num):
    """Generate item ID like IS_BS_001"""
    chapter_abbreviations = {
        "Basic_Slang": "BS",
        "TikTok_Trends": "TT",
        "Italian_Brainrot": "IB",
        "Meme_Culture": "MC",
        "2025_Trends": "TR",
        "Fandom_Culture": "FC"
    }
    abbr = chapter_abbreviations.get(chapter_abbr, "XX")
    return f"{BASE_ID_PREFIX}_{abbr}_{item_num:03d}"

def create_item(item_num, chapter_name, item_data):
    """Create a single item entry"""
    item_id = generate_item_id(chapter_name, item_num)
    
    # Base configuration
    base = {
        "word": item_data["base"],
        "type": "SlangTerm",
        "visual": {
            "tier": 2,
            "size": 1,
            "appearance": "bold",
            "color": "#00b894",
            "glow": True,
            "pulsate": True
        }
    }
    
    # Correct entries - breitere spawnPosition (0.1-0.9)
    correct = []
    # Generiere zufällige spawnPositions im Bereich 0.1-0.9
    available_positions = [round(x * 0.1, 2) for x in range(1, 10)]  # 0.1, 0.2, ..., 0.9
    random.shuffle(available_positions)
    
    variants = ["star", "hexagon", "bubble", "spike"]
    
    # Gleiche speed für alle (keine Unterscheidung)
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
    
    # Verwende restliche Positionen für Distractors
    distractor_positions = available_positions[len(item_data["correct"]):]
    if len(distractor_positions) < len(item_data["distractors"]):
        # Falls nicht genug Positionen, generiere weitere
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
            "speed": uniform_speed,  # Gleiche speed wie correct
            "points": 100,
            "hp": 1,
            "damage": 1,
            "behavior": uniform_pattern,  # Gleiche behavior wie correct
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
        "source": "Internetslang 2025",
        "tags": ["internetslang", "slang", "trends", chapter_name.lower()],
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
        "level": item_data["level"],  # Verwende Level aus Item-Daten
        "waveDuration": 3,
        "base": base,
        "correct": correct,
        "distractors": distractors,
        "meta": meta
    }

def generate_chapters():
    """Generate all chapter JSON files"""
    output_dir = "public/content/themes/checkst_du/internetslang"
    os.makedirs(output_dir, exist_ok=True)
    
    # Group items by chapter
    chapters = {}
    for item_num, chapter_name in CHAPTER_MAPPING.items():
        if chapter_name not in chapters:
            chapters[chapter_name] = []
        chapters[chapter_name].append(item_num)
    
    # Generate items for each chapter
    for chapter_name, item_nums in chapters.items():
        items = []
        chapter_item_counter = 1
        
        for item_num in sorted(item_nums):
            item_data = ITEMS[item_num]
            item = create_item(chapter_item_counter, chapter_name, item_data)
            items.append(item)
            chapter_item_counter += 1
        
        # Write chapter file
        filename = f"{chapter_name}.json"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(items, f, indent=2, ensure_ascii=False)
        
        print(f"Generated {filename} with {len(items)} items")

if __name__ == "__main__":
    random.seed(42)  # Für reproduzierbare spawnPositions
    generate_chapters()
    print("All chapter files generated successfully!")


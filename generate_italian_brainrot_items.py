#!/usr/bin/env python3
"""
Generate Italian Brainrot Items for WordRush
Creates chapter JSON files with all items from the provided list.
"""

import json
import os
import random

# Theme and chapter configuration
THEME_ID = "brainrot"
BASE_ID_PREFIX = "BR"

# Chapter mapping: Item number -> Chapter name
CHAPTER_MAPPING = {i: "Italian" for i in range(1, 61)}

# Item data structure with levels
ITEMS = {
    1: {"level": 1, "base": "Shark Sneakers", "correct": [{"word": "Tralalero Tralala", "context": "AI shark in Nikes dancing absurdly on TikTok."}], "distractors": [{"word": "Fish Flippers", "redirect": "Shark Shoes", "context": "Boring swim gear; Tralalero rocks street style chaos."}, {"word": "Whale Wallet", "redirect": "Sneaker Shark", "context": "Fat cash flop; Tralalero's got drip, not depth."}]},
    2: {"level": 1, "base": "Bomber Croc", "correct": [{"word": "Bombardino Crocodilo", "context": "Plane-croc hybrid bombing nonsense rhymes."}, {"word": "Croc Plane", "context": "Military mashup for viral explosions."}], "distractors": [{"word": "Alligator Airplane", "redirect": "Bomber Croc", "context": "Swamp flyer fail; Bombardino drops real bombs of weird."}, {"word": "Lizard Jetpack", "redirect": "Croc Bomb", "context": "Tiny leap; Bombardino soars into absurdity."}]},
    3: {"level": 2, "base": "Coffee Ballerina", "correct": [{"word": "Ballerina Cappuccina", "context": "Cappuccino-headed dancer twirling in foam tutus."}], "distractors": [{"word": "Espresso Elephant", "redirect": "Coffee Twirl", "context": "Trunk spill mess; Cappuccina pirouettes perfectly steamed."}, {"word": "Latte Lion", "redirect": "Foam Dance", "context": "Roaring brew; Ballerina sips and spins elegantly absurd."}]},
    4: {"level": 1, "base": "Cactus Elephant", "correct": [{"word": "Lirili Larila", "context": "Flippers on desert walker, cactus-elephant hybrid vibes."}, {"word": "Elephant Flippers", "context": "Trunk-trampling sand with awkward waddle."}], "distractors": [{"word": "Palm Tree Penguin", "redirect": "Cactus Stomp", "context": "Ice bird in heat; Lirili lumbers leafy laughs."}, {"word": "Succulent Sloth", "redirect": "Flipper Trunk", "context": "Slow drip; Lirili charges chaotically cool."}]},
    5: {"level": 2, "base": "Drum Beat Sahur", "correct": [{"word": "Tung Tung Tung Sahur", "context": "Wooden stick figure drumming Ramadan chaos."}], "distractors": [{"word": "Bong Bong Breakfast", "redirect": "Drum Wake-Up", "context": "Stoner snooze; Tung calls dawn with bangs."}, {"word": "Ping Pong Prayer", "redirect": "Sahur Beat", "context": "Table tennis tease; Tung thumps tradition troll."}]},
    6: {"level": 1, "base": "Pigeon Spy", "correct": [{"word": "Spijuniro Golubiro", "context": "Secret agent bird with shady spy shades."}, {"word": "Spy Pigeon", "context": "Cooing codes in feathered espionage."}], "distractors": [{"word": "Owl Operator", "redirect": "Pigeon Plot", "context": "Wise hoot hider; Spijuniro scouts silly skies."}, {"word": "Eagle Enforcer", "redirect": "Golubiro Gaze", "context": "Patriot perch; Spijuniro sneaks smirks."}]},
    7: {"level": 3, "base": "Banana Monkey", "correct": [{"word": "Chimpazini Banamini", "context": "Fruit-fused ape peeling absurd antics."}], "distractors": [{"word": "Gorilla Grape", "redirect": "Banana Peel", "context": "Purple punch flop; Chimpazini slips into hilarity."}, {"word": "Orangutan Orange", "redirect": "Monkey Mash", "context": "Citrus swing miss; Banamini bananas brains."}]},
    8: {"level": 2, "base": "Cappuccino Killer", "correct": [{"word": "Cappuccino Assassino", "context": "Steamy assassin brewing deadly espresso hits."}, {"word": "Coffee Hitman", "context": "Foam-frothy stealth in cafe shadows."}], "distractors": [{"word": "Tea Terminator", "redirect": "Brew Blade", "context": "Herbal hug; Cappuccino crushes with crema."}, {"word": "Mocha Mobster", "redirect": "Espresso Edge", "context": "Chocolate chump; Assassino awakens with aroma."}]},
    9: {"level": 1, "base": "Wood Bat Swinger", "correct": [{"word": "Hotspot Bro", "context": "Indonesian spin-off swinging wireless wood wildly."}], "distractors": [{"word": "Signal Stick", "redirect": "Bat Bro", "context": "Weak WiFi whack; Hotspot hits home runs of hype."}, {"word": "Router Rabbit", "redirect": "Wood Swing", "context": "Hoppy lag; Bro bashes broadband blues."}]},
    10: {"level": 2, "base": "Doll Ambalabu", "correct": [{"word": "Boneca Ambalabu", "context": "Creepy doll dancing in dollhouse disasters."}], "distractors": [{"word": "Teddy Terror", "redirect": "Doll Dance", "context": "Stuffed scare soft; Boneca breaks porcelain peace."}, {"word": "Action Figure Fail", "redirect": "Ambalabu Awkward", "context": "Plastic pose; Boneca boogies bizarrely."}]},
    11: {"level": 3, "base": "Trallallero Nursery", "correct": [{"word": "Trallallero Trallallà", "context": "Rhyme sparking the whole shark sneaker saga."}, {"word": "Nursery Nonsense", "context": "Italian lullaby gone grotesque."}], "distractors": [{"word": "Hushabye Hammer", "redirect": "Rhyme Rampage", "context": "Sleepy smash; Trallallero tumbles into tunes."}, {"word": "Cradle Catastrophe", "redirect": "Shark Lull", "context": "Rock-a-bye ruin; Trallallà teases dreams."}]},
    12: {"level": 1, "base": "Porco Dio Phrase", "correct": [{"word": "Porco Dio e Porco Allah", "context": "Blasphemous rhyme cursing gods in memes."}], "distractors": [{"word": "Holy Hamster", "redirect": "Curse Chant", "context": "Sacred squeak; Porco profanes playfully."}, {"word": "Divine Duck", "redirect": "God Groan", "context": "Quack quest; Phrase flips faith funny."}]},
    13: {"level": 2, "base": "Roblox Stealer", "correct": [{"word": "Steal a Brainrot", "context": "Game where kids swipe characters, sparking cries."}, {"word": "Admin Abuse", "context": "Mods cheat steals, fueling frenzy videos."}], "distractors": [{"word": "Give Back Gang", "redirect": "Steal Squad", "context": "Kind return; Steal a sparks sobs."}, {"word": "Fair Play Fail", "redirect": "Abuse Alert", "context": "Rule hug; Admin antics amuse."}]},
    14: {"level": 1, "base": "Meme Coin Chaos", "correct": [{"word": "Italianrot Token", "context": "Volatile crypto launched March 2025 from memes."}], "distractors": [{"word": "Pizza Pound", "redirect": "Rot Riches", "context": "Dough drop; Italianrot inflates insanity."}, {"word": "Pasta Purse", "redirect": "Coin Craze", "context": "Carb cash; Token trades trends."}]},
    15: {"level": 3, "base": "Orban Dance", "correct": [{"word": "Viktor Orbán TikTok", "context": "PM's vid with Tung dancing in meetings."}], "distractors": [{"word": "Politician Polka", "redirect": "Sahur Shuffle", "context": "Stiff step; Orbán's Tung twirls weird."}, {"word": "Leader Limbo", "redirect": "Meeting Meme", "context": "Low bend; Vid vibes viral."}]},
    16: {"level": 2, "base": "Brand Remix", "correct": [{"word": "Ryanair Italianrot", "context": "Airline's absurd ad jumping on shark plane hype."}, {"word": "Samsung Belgium", "context": "Tech twist with gadget-grotesque characters."}], "distractors": [{"word": "Boring Bus", "redirect": "Flight Freak", "context": "Dull drive; Ryanair remixes rot."}, {"word": "Phone Flatline", "redirect": "Gadget Grotesque", "context": "Screen snooze; Samsung sparks surreal."}]},
    17: {"level": 1, "base": "Walmart Toys", "correct": [{"word": "Brainrot Merch", "context": "Store sells plush shark sneaker hybrids."}], "distractors": [{"word": "Normal Neddies", "redirect": "Absurd Action", "context": "Plain play; Toys tangle toddlers in trends."}, {"word": "Safe Stuffed", "redirect": "Meme Monsters", "context": "Cuddle calm; Walmart wilds with weird."}]},
    18: {"level": 3, "base": "Merge Game Boost", "correct": [{"word": "Merge Fellas Update", "context": "Hyper-casual app peaks downloads with rot characters."}], "distractors": [{"word": "Fruit Fuse Flop", "redirect": "Creature Clash", "context": "Berry bore; Merge mashes meme magic."}, {"word": "Puzzle Plain", "redirect": "Brainrot Blend", "context": "Square snooze; Fellas fuses frenzy."}]},
    19: {"level": 2, "base": "ElevenLabs Voice", "correct": [{"word": "Adam TTS Narrator", "context": "AI voice rhyming rot in Italian accents."}, {"word": "Synthesized Surreal", "context": "Grotesque tales told in text-to-speech tones."}], "distractors": [{"word": "Robot Rap", "redirect": "Italian Intone", "context": "Beat box bust; Adam accents absurdity."}, {"word": "Echo English", "redirect": "Rhyme Rot", "context": "Flat fake; Voice vamps viral vibes."}]},
    20: {"level": 1, "base": "Indonesian Origin", "correct": [{"word": "Tung Tung Kentungan", "context": "Slit drum onomatopoeia from Ramadan rituals."}], "distractors": [{"word": "Italian Igloo", "redirect": "Sahur Sound", "context": "Pasta polar; Tung ties to tropics."}, {"word": "Pizza Percussion", "redirect": "Drum Dawn", "context": "Sauce slap; Kentungan kicks culture."}]},
    21: {"level": 3, "base": "Global Spin-Offs", "correct": [{"word": "Mexican Brainrot", "context": "Localized absurd animals with spicy twists."}, {"word": "French Fusions", "context": "Gourmet grotesque hybrids in beret bombs."}], "distractors": [{"word": "American Apple Pie", "redirect": "Taco Terror", "context": "Sweet suburb; Mexican mashes mayhem."}, {"word": "German Goulash", "redirect": "Croissant Croc", "context": "Sausage snooze; French fries freaky."}]},
    22: {"level": 2, "base": "Fan Fiction Frenzy", "correct": [{"word": "Rot Romances", "context": "Stories of characters falling in love absurdly."}], "distractors": [{"word": "Shark Solo", "redirect": "Cappuccina Crush", "context": "Lone fin; Fiction fuels flings."}, {"word": "Croc Celibate", "redirect": "Elephant Entangle", "context": "Swamp single; Romances rot reality."}]},
    23: {"level": 1, "base": "Quiz Craze", "correct": [{"word": "Character Rankings", "context": "TikTok tests knowledge of rot roster."}, {"word": "Who's Who Weird", "context": "Matching names to nightmare neighbors."}], "distractors": [{"word": "Normal Name Game", "redirect": "Absurd Audit", "context": "Boring bingo; Quizzes quiz quirks."}, {"word": "Sanity Sort", "redirect": "Meme Match", "context": "Logical list; Rankings revel in ridiculous."}]},
    24: {"level": 3, "base": "Song Sagas", "correct": [{"word": "Original Rot Tunes", "context": "Custom tracks for creature catchphrases."}], "distractors": [{"word": "Pop Standard", "redirect": "Nonsense Notes", "context": "Chart cheese; Songs sing surreal."}, {"word": "Ballad Bore", "redirect": "Rhyme Rampage", "context": "Slow strum; Tunes tangle tongues."}]},
    25: {"level": 1, "base": "Lego Builds", "correct": [{"word": "Brainrot Bricks", "context": "Fans construct croc planes from colorful blocks."}], "distractors": [{"word": "Castle Calm", "redirect": "Bomber Block", "context": "Knight nap; Lego launches lunacy."}, {"word": "Ship Straight", "redirect": "Shark Stack", "context": "Sail sane; Builds brick bizarre."}]},
    26: {"level": 2, "base": "Tattoo Trends", "correct": [{"word": "Rot Ink", "context": "Permanent shark sneaker stamps on skin."}, {"word": "Cappuccina Canvas", "context": "Coffee dancer etched eternally."}], "distractors": [{"word": "Heart Harmony", "redirect": "Absurd Art", "context": "Love loop; Tattoos tease trends."}, {"word": "Rose Routine", "redirect": "Croc Carve", "context": "Thorn tame; Ink inks insanity."}]},
    27: {"level": 3, "base": "Movie Murmurs", "correct": [{"word": "Tung Film Pitch", "context": "Talks of big screen for wooden drummer."}], "distractors": [{"word": "Shark Shlock", "redirect": "Sahur Screen", "context": "Fin flick flop; Movie memes millions."}, {"word": "Croc Cartoon", "redirect": "Blockbuster Brain", "context": "Swamp short; Pitch pumps prestige."}]},
    28: {"level": 1, "base": "Classroom Chant", "correct": [{"word": "Student Mimics", "context": "Kids echo phrases disrupting desks."}], "distractors": [{"word": "Quiet Quiz", "redirect": "Rot Recite", "context": "Silent study; Chants chaos class."}, {"word": "Lesson Lull", "redirect": "Meme Mutter", "context": "Bore board; Mimics mock monotony."}]},
    29: {"level": 2, "base": "Algorithm Abyss", "correct": [{"word": "Rabbit Hole Risk", "context": "Vids lead to sinister scroll spirals."}, {"word": "Brainrot Bait", "context": "Quick clips hook harmful haunts."}], "distractors": [{"word": "Safe Scroll", "redirect": "Dark Dive", "context": "Light link; Abyss alerts adults."}, {"word": "Fun Feed", "redirect": "Trap Tease", "context": "Giggle gate; Bait buries boundaries."}]},
    30: {"level": 3, "base": "Oxford Echo", "correct": [{"word": "Brainrot Word Year", "context": "2024 term lingering into rot realms."}], "distractors": [{"word": "Sanity Synonym", "redirect": "Rot Ruin", "context": "Mind mend; Oxford owns overkill."}, {"word": "Logic Lexicon", "redirect": "Absurd Adjective", "context": "Sense stack; Word warps weird."}]},
    31: {"level": 1, "base": "eZburger Origin", "correct": [{"word": "First Tralalero Vid", "context": "January 2025 upload sparking shark saga."}], "distractors": [{"word": "Burger Flip", "redirect": "Meme Meat", "context": "Patty pat; eZburger eats origins."}, {"word": "Patty Post", "redirect": "Shark Spark", "context": "Grill gag; Vid virals velocity."}]},
    32: {"level": 2, "base": "Amoamimandy Hit", "correct": [{"word": "7 Million Views", "context": "Deleted shark shoe clip exploding early."}, {"word": "Blue Nike Boost", "context": "Footwear flair fueling frenzy."}], "distractors": [{"word": "Red Sock Slip", "redirect": "Sneaker Surge", "context": "Laundry laugh; Amoamimandy amps absurd."}, {"word": "Barefoot Blunder", "redirect": "Shoe Show", "context": "Toeless tease; Hit hauls hype."}]},
    33: {"level": 3, "base": "Nazars Compilation", "correct": [{"word": "All Rot Roundup", "context": "YouTube vid featuring full freakshow."}], "distractors": [{"word": "Solo Shark", "redirect": "Crew Chaos", "context": "Fin focus; Compilation crams crazy."}, {"word": "Partial Parade", "redirect": "Total Tangle", "context": "Bit bite; Roundup roasts roster."}]},
    34: {"level": 2, "base": "Hashtag Hype", "correct": [{"word": "#ItalianBrainrot", "context": "Over three billion views on TikTok tag."}, {"word": "Viral Vault", "context": "Absurd archive exploding engagement."}], "distractors": [{"word": "#NormalNonsense", "redirect": "Rot Rally", "context": "Mild meh; Hashtag hauls hordes."}, {"word": "#SaneScroll", "redirect": "Meme Madness", "context": "Calm click; Tag tumbles into trends."}]},
    35: {"level": 1, "base": "AI Fusion Fun", "correct": [{"word": "Animal-Object Mash", "context": "Creatures cobbled from chaos code."}], "distractors": [{"word": "Real Rabbit", "redirect": "Hybrid Hilarity", "context": "Hop normal; Fusion freaks fabulous."}, {"word": "Plain Pigeon", "redirect": "Croc Combo", "context": "Coo cute; Mash mocks mundane."}]},
    36: {"level": 3, "base": "Post-Ironic Punch", "correct": [{"word": "Dadaist Rejection", "context": "Mocking big IPs with meme mockery."}, {"word": "Studio Subversion", "context": "Franchise flip to fan freakouts."}], "distractors": [{"word": "Brand Bow", "redirect": "Chaos Crown", "context": "Corp clap; Post-Ironic pummels posh."}, {"word": "IP Idol", "redirect": "Rot Rebellion", "context": "Hero hug; Punch parodies power."}]},
    37: {"level": 1, "base": "Gen Alpha Glue", "correct": [{"word": "Tween TikTok Takeover", "context": "Kids 10-15 chanting rot relentlessly."}], "distractors": [{"word": "Adult Avoid", "redirect": "Youth Yell", "context": "Grown groan; Alpha absorbs absurdity."}, {"word": "Senior Skip", "redirect": "Kid Craze", "context": "Wise wave off; Glue grips giggles."}]},
    38: {"level": 2, "base": "Reward System Rip", "correct": [{"word": "Digital Dopamine", "context": "Quick clips exploiting teen thrill loops."}, {"word": "Addiction Blueprint", "context": "Harmless hook to harmful haze."}], "distractors": [{"word": "Boredom Buffer", "redirect": "Thrill Trap", "context": "Dull dam; System spikes surges."}, {"word": "Calm Click", "redirect": "Chaos Chase", "context": "Peace pill; Rip rewires rushes."}]},
    39: {"level": 3, "base": "Attention Hijack", "correct": [{"word": "Overstimulation Overload", "context": "Bizarre blasts battling brain focus."}], "distractors": [{"word": "Focus Feast", "redirect": "Drain Dance", "context": "Sharp stare; Hijack hogs hazy."}, {"word": "Mind Mend", "redirect": "Scroll Storm", "context": "Clear cog; Attention aches absurd."}]},
    40: {"level": 1, "base": "Merch Madness", "correct": [{"word": "Plush Rot Roster", "context": "Stuffed sharks selling surreal smiles."}], "distractors": [{"word": "Toy Tame", "redirect": "Meme Monster", "context": "Soft safe; Madness markets mania."}, {"word": "Doll Dull", "redirect": "Cappuccina Cuddle", "context": "Plain poppet; Roster riles retail."}]},
    41: {"level": 2, "base": "Viral Velocity", "correct": [{"word": "77K Tagged Vids", "context": "Millions of views in months of mayhem."}, {"word": "Daily Drops", "context": "Fresh freaks fueling feed floods."}], "distractors": [{"word": "Slow Scroll", "redirect": "Speed Surge", "context": "Lazy lag; Velocity vaults viral."}, {"word": "Weekly Whim", "redirect": "Hourly Hype", "context": "Calendar calm; Drops drown daily."}]},
    42: {"level": 3, "base": "Cultural Chaos", "correct": [{"word": "US to Korea Spread", "context": "Global groan from German gigs too."}, {"word": "Orbán Outreach", "context": "PM pimps rot for political points."}], "distractors": [{"word": "Local Lull", "redirect": "World Whirl", "context": "Home hum; Spread spins spheres."}, {"word": "Solo State", "redirect": "Meme Migration", "context": "Nation nap; Outreach orbits odd."}]},
    43: {"level": 1, "base": "DIY Ethos", "correct": [{"word": "Low-Effort Lore", "context": "Fans forge freaky family trees."}], "distractors": [{"word": "Pro Polish", "redirect": "Rough Rot", "context": "Shine sham; Ethos embraces errors."}, {"word": "Fancy Forge", "redirect": "Quick Quill", "context": "Gold grind; DIY doodles delight."}]},
    44: {"level": 2, "base": "Hyper-Casual Hype", "correct": [{"word": "App Store Surge", "context": "Games merge rot for million downloads."}, {"word": "2025 Rewrite", "context": "Memes motor mobile growth."}], "distractors": [{"word": "Console Calm", "redirect": "Pocket Panic", "context": "Couch code; Surge spikes small screens."}, {"word": "Old Game Grind", "redirect": "Trend Twist", "context": "Retro rut; Hype hacks hyper."}]},
    45: {"level": 3, "base": "Nonsense Narrative", "correct": [{"word": "Dreamlike Dramas", "context": "Stories stitching surreal shark soaps."}, {"word": "Hyperbolic Howls", "context": "Voiceovers voicing void vibes."}], "distractors": [{"word": "Plot Perfect", "redirect": "Chaos Chronicle", "context": "Linear lie; Narrative nods nonsense."}, {"word": "Sense Saga", "redirect": "Absurd Arc", "context": "Tidy tale; Dramas delirious delights."}]},
    46: {"level": 1, "base": "Mock-Italian Mockery", "correct": [{"word": "Exaggerated Accents", "context": "AI arias amusing with opera overkill."}], "distractors": [{"word": "Proper Pronounce", "redirect": "Rot Rant", "context": "Crisp clip; Mockery mangles mirth."}, {"word": "Silent Sketch", "redirect": "Accent Assault", "context": "Mute mime; Accents amplify antics."}]},
    47: {"level": 2, "base": "Roblox Rampage", "correct": [{"word": "111M Users Frenzy", "context": "Steal game steals screams worldwide."}, {"word": "Cry Clip Gold", "context": "46M views on kid meltdown vids."}], "distractors": [{"word": "Peaceful Play", "redirect": "Theft Thrill", "context": "Harmony hug; Rampage rouses roars."}, {"word": "Win Without Weep", "redirect": "Abuse Amuse", "context": "Victory vibe; Clip captures chaos."}]},
    48: {"level": 3, "base": "55M View Queen", "correct": [{"word": "Summer Scroll Star", "context": "One creator's rot reels rack records."}], "distractors": [{"word": "Winter Watch", "redirect": "Heat Hype", "context": "Cold click; Queen quakes quotas."}, {"word": "Low Like Lull", "redirect": "Million Mark", "context": "Few faves; View vaults vanity."}]},
    49: {"level": 1, "base": "Three-Legged Trot", "correct": [{"word": "Tralalero Trainers", "context": "Nike-clad shark stumbling stylishly."}], "distractors": [{"word": "Four-Foot Fail", "redirect": "Legged Lurch", "context": "Even stumble; Three teases trippy."}, {"word": "Wheel Waddle", "redirect": "Sneaker Stomp", "context": "Roll ruin; Trot trips trends."}]},
    50: {"level": 2, "base": "Cappuccino Courtship", "correct": [{"word": "Ballerina Blush", "context": "Foam flirt with Tung in fan fics."}, {"word": "Sahur Suitor", "context": "Wooden wooer waltzing weirdly."}], "distractors": [{"word": "Brew Breakup", "redirect": "Dance Duo", "context": "Spill split; Courtship coffees chaos."}, {"word": "Drum Divorce", "redirect": "Rot Romance", "context": "Beat bust; Blush brews bizarre bonds."}]},
    51: {"level": 3, "base": "Admin Antics", "correct": [{"word": "Cheat Steal Sobs", "context": "Mod mischief melting young minds."}], "distractors": [{"word": "Fair Fight", "redirect": "Abuse Avalanche", "context": "Rule respect; Antics ignite infamy."}, {"word": "Honest Heist", "redirect": "Mod Mayhem", "context": "Clean caper; Sobs summon sympathy."}]},
    52: {"level": 1, "base": "Kentungan Knock", "correct": [{"word": "Sundanese Rumble", "context": "Tung's tongue-twisting tribal thump."}], "distractors": [{"word": "Italian Igloo", "redirect": "Drum Dawn", "context": "Frozen feast; Knock nods native."}, {"word": "Pasta Pound", "redirect": "Sahur Slam", "context": "Noodle noise; Rumble roots real."}]},
    53: {"level": 2, "base": "Flippers Flop", "correct": [{"word": "Desert Dash", "context": "Lirili's sandy sprint in awkward attire."}, {"word": "Cactus Cruise", "context": "Prickly parade puzzling passersby."}], "distractors": [{"word": "Beach Breeze", "redirect": "Sand Struggle", "context": "Wave win; Flop fumbles fun."}, {"word": "Oasis Oaf", "redirect": "Elephant Escapade", "context": "Cool calm; Dash dazzles dumb."}]},
    54: {"level": 3, "base": "Nike Nonsense", "correct": [{"word": "Shark Streetwear", "context": "Blue kicks kicking off 2025 craze."}], "distractors": [{"word": "Adidas Abyss", "redirect": "Sneaker Saga", "context": "Stripe stumble; Nike nails notoriety."}, {"word": "Puma Plight", "redirect": "Trainer Trend", "context": "Cat claw; Blue boosts brainrot."}]},
    55: {"level": 1, "base": "Foam Frolic", "correct": [{"word": "Cappuccina Carousel", "context": "Steamy spins in surreal spotlight."}], "distractors": [{"word": "Milkshake March", "redirect": "Coffee Cartwheel", "context": "Thick twirl; Frolic foams frenzy."}, {"word": "Soda Spin", "redirect": "Ballet Brew", "context": "Fizz flop; Carousel caffeinates crazy."}]},
    56: {"level": 2, "base": "Crocodile Copter", "correct": [{"word": "Bombardiro Blades", "context": "Tail-twisting aerial assaults absurd."}, {"word": "Plane Predator", "context": "Jaw-jamming jet jockey joy."}], "distractors": [{"word": "Bird Bomber", "redirect": "Croc Chopper", "context": "Wing whiff; Copter crunches croc."}, {"word": "Fish Flyer", "redirect": "Tail Tornado", "context": "Scale soar; Blades bite bizarre."}]},
    57: {"level": 3, "base": "Ramadan Remix", "correct": [{"word": "Suhur Slit Drum", "context": "Tung's traditional troll on fasting fun."}], "distractors": [{"word": "Breakfast Bell", "redirect": "Dawn Drum", "context": "Egg echo; Remix rattles rituals."}, {"word": "Lunch Lullaby", "redirect": "Sahur Satire", "context": "Midday meh; Slit slices surreal."}]},
    58: {"level": 1, "base": "Pigeon Plotter", "correct": [{"word": "Golubiro Goggles", "context": "Feathered fiend spying with style."}], "distractors": [{"word": "Dove Decoder", "redirect": "Spy Squint", "context": "Peace peek; Plotter pecks paranoia."}, {"word": "Raven Recon", "redirect": "Pigeon Peek", "context": "Dark dart; Goggles gawk goofy."}]},
    59: {"level": 2, "base": "Banana Bandit", "correct": [{"word": "Banamini Banditry", "context": "Peel pilfering primate pandemonium."}, {"word": "Fruit Felony", "context": "Ape antics in orchard outrage."}], "distractors": [{"word": "Apple Anarchist", "redirect": "Peel Pilfer", "context": "Core crime; Bandit bananas bedlam."}, {"word": "Grape Gangster", "redirect": "Monkey Mischief", "context": "Bunch bust; Felony fruits folly."}]},
    60: {"level": 3, "base": "Tralala Trailblazer", "correct": [{"word": "eZburger Explosion", "context": "Deleted origin vid detonating decades of dumb."}, {"word": "Porco Pioneer", "context": "Curse coiner cursing culture."}], "distractors": [{"word": "Mild Meme", "redirect": "Absurd Atom", "context": "Tame tickle; Trailblazer torches tropes."}, {"word": "Sane Starter", "redirect": "Chaos Catalyst", "context": "Logical launch; Explosion erupts eccentricity."}]},
}

def generate_item_id(chapter_abbr, item_num):
    """Generate item ID like BR_IT_001"""
    chapter_abbreviations = {
        "Italian": "IT"
    }
    abbr = chapter_abbreviations.get(chapter_abbr, "XX")
    return f"{BASE_ID_PREFIX}_{abbr}_{item_num:03d}"

def create_item(item_num, chapter_name, item_data):
    """Create a single item entry"""
    item_id = generate_item_id(chapter_name, item_num)
    
    # Base configuration
    base = {
        "word": item_data["base"],
        "type": "BrainrotTerm",
        "visual": {
            "tier": 2,
            "size": 1,
            "appearance": "bold",
            "color": "#fdcb6e",
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
        "source": "Italian Brainrot 2025",
        "tags": ["brainrot", "italian", "memes", "trends", chapter_name.lower()],
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
    output_dir = "public/content/themes/checkst_du/brainrot"
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


#!/usr/bin/env python3
"""
Generate Gen-Alpha & Kid Influencer Items for WordRush
Creates chapter JSON files with all items from the provided list.
"""

import json
import os
import random

# Theme and chapter configuration
THEME_ID = "gen_alpha_kid_influencer"
BASE_ID_PREFIX = "GA"

# Chapter mapping: Item number -> Chapter name
CHAPTER_MAPPING = {
    1: "Kid_Influencers",      # Ryan's World
    2: "Kid_Influencers",      # Like Nastya
    3: "Kid_Influencers",      # Harper Zilmer
    4: "Kid_Influencers",      # McClure Twins
    5: "Kid_Influencers",      # Vlad and Niki
    6: "Kid_Influencers",      # Kids Diana Show
    7: "Kid_Influencers",      # Ayla Palmer
    8: "Kid_Influencers",      # Koti and Haven Garza
    9: "Kid_Influencers",      # Luna Sophia
    10: "Kid_Influencers",     # Evelyn Unruh
    11: "Kid_Influencers",     # Taytum and Oakley Fisher
    12: "Kid_Influencers",     # The Sweet Sisterhood
    13: "Kid_Influencers",     # Maria Clara & JP
    14: "Kid_Influencers",     # Toys And Colors
    16: "Kid_Influencers",     # Like Nastya Vlog
    17: "Kid_Influencers",     # Ryan's Family Review
    18: "Kid_Influencers",     # Garza Twins
    19: "Kid_Influencers",     # Lil Champ Sharma
    22: "Kid_Influencers",     # Cocomelon Legacy
    23: "Kid_Influencers",     # Diana Kids
    24: "Kid_Influencers",     # Scarlett & Tiania
    25: "Kid_Influencers",     # Genevieve's Playhouse
    26: "Kid_Influencers",     # 5-Minute Crafts Kids
    27: "Kid_Influencers",     # Mighty McClures
    28: "Kid_Influencers",     # Alejo Igoa
    29: "Kid_Influencers",     # MR. BEAST KIDS
    30: "Kid_Influencers",     # Evelyn GRWM
    20: "German_Creators",      # Evelin Wunder
    21: "German_Creators",      # Emi & Elia
    36: "German_Creators",     # Emilia
    37: "German_Creators",     # Bianca's Kids
    38: "German_Creators",     # Sarah Harrison Kids
    39: "German_Creators",     # Eliana Damm
    40: "German_Creators",     # Giasmina Liebt
    41: "German_Creators",     # Alicia's Mumlife
    42: "German_Creators",     # Nadine Sobotzik
    43: "German_Creators",     # Annkathrin Thyret
    44: "German_Creators",     # Emrah's Baby
    45: "German_Creators",     # Dr. Emi Skin
    46: "German_Creators",     # Vitor Gatinho
    47: "German_Creators",     # Ernsting's Family
    48: "German_Creators",     # PD Dr. Dördelmann
    49: "German_Creators",     # Lami Gaming
    50: "German_Creators",     # Uyen Tran
    51: "German_Creators",     # Emilio Piano
    52: "German_Creators",     # Merayad
    15: "Brand_Collabs",       # Evereden Skincare
    31: "Brand_Collabs",       # Drunk Elephant Kids
    32: "Brand_Collabs",       # Casetify Cases
    33: "Brand_Collabs",       # Cult Gaia Bags
    34: "Brand_Collabs",       # Mikaila Ulmer
    35: "Brand_Collabs",       # Grace
    54: "Brand_Collabs",       # Evereden Collection
    53: "Brand_Collabs",       # SIS vs BRO
    55: "Studies_Reports",     # Digital Voices Study
    56: "Studies_Reports",     # Whop Report
    57: "Studies_Reports",     # PwC Holiday Outlook
    58: "Studies_Reports",     # Illinois Law
    59: "Studies_Reports",     # California Bill
    60: "Studies_Reports",     # Razorfish Research
}

# Item data structure with levels - korrigiert alle Tippfehler
ITEMS = {
    1: {"level": 1, "base": "Ryan's World", "correct": [{"word": "Toy Unboxing", "context": "Ryan reviews toys with huge excitement for kids."}], "distractors": [{"word": "Tax Filing", "redirect": "Toy Review", "context": "Boring adult stuff; Ryan's all about fun unboxings."}]},
    2: {"level": 1, "base": "Like Nastya", "correct": [{"word": "Family Adventures", "context": "Nastya explores fun stories with parents worldwide."}, {"word": "Multilingual Songs", "context": "Dubs in many languages for global kid appeal."}], "distractors": [{"word": "Homework Help", "redirect": "Playtime Tales", "context": "School snooze; Nastya's vibes are pure play."}, {"word": "Cooking Lessons", "redirect": "Adventure Quests", "context": "Adult apron; her kitchen's for pretend cakes."}]},
    3: {"level": 2, "base": "Harper Zilmer", "correct": [{"word": "Farm Vlogs", "context": "Harper shares rural fun with animals and chores."}], "distractors": [{"word": "City Traffic", "redirect": "Country Life", "context": "Urban jam; Harper's on hay bales, not highways."}]},
    4: {"level": 1, "base": "McClure Twins", "correct": [{"word": "Twin Pranks", "context": "Ava and Alexis pull hilarious sibling stunts."}, {"word": "Forbes Top Kids", "context": "Ranked as elite young creators in 2025."}], "distractors": [{"word": "Solo Homework", "redirect": "Double Trouble", "context": "Lone study; twins team up for chaos."}]},
    5: {"level": 2, "base": "Vlad and Niki", "correct": [{"word": "Magic Toy Trains", "context": "Brothers build epic pretend worlds with toys."}], "distractors": [{"word": "Real Commute", "redirect": "Toy Tracks", "context": "Bus bore; their trains chug imagination."}]},
    6: {"level": 1, "base": "Kids Diana Show", "correct": [{"word": "Eva's Dollhouse", "context": "Eva creates magical stories with her toys."}], "distractors": [{"word": "Office Desk", "redirect": "Playroom Palace", "context": "Work woes; Diana's desk is doll drama."}]},
    7: {"level": 3, "base": "Ayla Palmer", "correct": [{"word": "Pet Product Deals", "context": "Ayla endorses fun toys for furry friends."}, {"word": "Claire's Collabs", "context": "Sparkly accessories with brand partnerships."}], "distractors": [{"word": "Tax Audits", "redirect": "Fashion Fun", "context": "IRS nightmare; Ayla's audits are accessory audits."}]},
    8: {"level": 2, "base": "Koti and Haven Garza", "correct": [{"word": "Viral TikTok Twins", "context": "Gen Alpha stars in family dance challenges."}], "distractors": [{"word": "Quiet Library", "redirect": "Dance Duo", "context": "Shush session; Garzas groove globally."}]},
    9: {"level": 1, "base": "Luna Sophia", "correct": [{"word": "Mini Sephora Haul", "context": "Kid beauty reviews with safe kid picks."}], "distractors": [{"word": "Adult Perfume", "redirect": "Tween Trends", "context": "Grown-up glow; Luna's light and lovely."}]},
    10: {"level": 2, "base": "Evelyn Unruh", "correct": [{"word": "GRWM Kid Edition", "context": "Evelyn's get-ready routines with fun makeup."}, {"word": "Anastasia Beverly Hills", "context": "Brand deals for young glam enthusiasts."}], "distractors": [{"word": "Dentist Drills", "redirect": "Beauty Basics", "context": "Tooth terror; Evelyn's drills are drill-free."}]},
    11: {"level": 3, "base": "Taytum and Oakley Fisher", "correct": [{"word": "Brand Collabs", "context": "Twins team up for kid fashion features."}], "distractors": [{"word": "Fishing Trips", "redirect": "Fashion Fun", "context": "Hook mishap; Fishers flaunt fits, not fins."}]},
    12: {"level": 1, "base": "The Sweet Sisterhood", "correct": [{"word": "Kid Creator Collective", "context": "Group channel with safe, fun collabs."}], "distractors": [{"word": "Spicy Drama House", "redirect": "Sweet Squad", "context": "Gen Z gossip; Sisterhood's sugar and spice-free."}]},
    13: {"level": 2, "base": "Maria Clara & JP", "correct": [{"word": "Pretend Play Pranks", "context": "Siblings stage silly scenarios daily."}], "distractors": [{"word": "Real Job Interviews", "redirect": "Playtime Plots", "context": "Resume read; their interviews are imaginary."}]},
    14: {"level": 1, "base": "Toys And Colors", "correct": [{"word": "Kinetic Sand Builds", "context": "Colorful toy creations for creative kids."}], "distractors": [{"word": "Paint Dry Watch", "redirect": "Sand Sculpt", "context": "Bore fest; colors come alive in hands."}]},
    15: {"level": 3, "base": "Evereden Skincare", "correct": [{"word": "Kid-Safe Glow", "context": "Evelyn promotes gentle products for tweens."}], "distractors": [{"word": "Botox Basics", "redirect": "Tween Treatments", "context": "Adult anti-age; Evereden's eternal youth fun."}]},
    16: {"level": 2, "base": "Like Nastya Vlog", "correct": [{"word": "Behind Scenes Fun", "context": "Daily life peeks with family laughs."}], "distractors": [{"word": "Scripted Soap Opera", "redirect": "Real Relatable", "context": "Drama queen; vlogs vibe casual."}]},
    17: {"level": 1, "base": "Ryan's Family Review", "correct": [{"word": "Science Experiments", "context": "Family tests bubbly, messy kid science."}], "distractors": [{"word": "Tax Experiments", "redirect": "Toy Tests", "context": "Deduction dull; Ryan's reactions rock."}]},
    18: {"level": 3, "base": "Garza Twins", "correct": [{"word": "Shein Partnerships", "context": "Budget fashion hauls for young trendsetters."}], "distractors": [{"word": "Luxury Loans", "redirect": "Affordable Attire", "context": "Debt designer; Garzas glam on a dime."}]},
    19: {"level": 2, "base": "Lil Champ Sharma", "correct": [{"word": "Kid Fashion Stories", "context": "Mini influencer shares style and tales."}], "distractors": [{"word": "Adult Suit Tales", "redirect": "Tween Threads", "context": "Boardroom bore; Champ's chic kid couture."}]},
    20: {"level": 1, "base": "Evelin Wunder", "correct": [{"word": "DIY Kid Crafts", "context": "German fun with easy home projects."}], "distractors": [{"word": "Tax Form Crafts", "redirect": "Play Projects", "context": "IRS origami; Evelin's endless entertainment."}]},
    21: {"level": 3, "base": "Emi & Elia", "correct": [{"word": "Sibling Challenges", "context": "German twins tackle trends and tasks."}, {"word": "Family Vlog Vibes", "context": "Daily doses of duo delight."}], "distractors": [{"word": "Solo Tax Challenges", "redirect": "Twin Tasks", "context": "Lone ledger; Emi & Elia's energy explodes."}]},
    22: {"level": 2, "base": "Cocomelon Legacy", "correct": [{"word": "Nursery Rhyme Remixes", "context": "Animated hits teaching through tunes."}], "distractors": [{"word": "Bill Payment Songs", "redirect": "Kiddo Choruses", "context": "Due date dirge; Cocomelon's catchy classics."}]},
    23: {"level": 1, "base": "Diana Kids", "correct": [{"word": "Pretend School Days", "context": "Eva acts out fun learning adventures."}], "distractors": [{"word": "Real Report Cards", "redirect": "Play Pretend", "context": "Grade groan; Diana's desk is dreamland."}]},
    24: {"level": 3, "base": "Scarlett & Tiania", "correct": [{"word": "Sweet Sister Collabs", "context": "Part of the safe kid creator group."}], "distractors": [{"word": "Sour Sibling Fights", "redirect": "Harmony Hype", "context": "Bitter brawl; Sisterhood's sweet synergy."}]},
    25: {"level": 1, "base": "Genevieve's Playhouse", "correct": [{"word": "Learning Videos", "context": "Dolls teach colors and numbers gently."}], "distractors": [{"word": "Math Drills", "redirect": "Playful Lessons", "context": "Strict sums; Genevieve's gentle games."}]},
    26: {"level": 2, "base": "5-Minute Crafts Kids", "correct": [{"word": "Quick DIY Toys", "context": "Easy hacks for homemade fun gadgets."}], "distractors": [{"word": "5-Minute Taxes", "redirect": "Crafty Creations", "context": "Form frenzy; Crafts cook up cool."}]},
    27: {"level": 3, "base": "Mighty McClures", "correct": [{"word": "Forbes Ranked", "context": "Twin creators in top kid lists 2025."}], "distractors": [{"word": "Mighty Tax Clures", "redirect": "Creator Crowns", "context": "Audit ache; McClures make magic."}]},
    28: {"level": 1, "base": "Alejo Igoa", "correct": [{"word": "Toy Unbox Argentina", "context": "Kid reviews with Latin flair."}], "distractors": [{"word": "Bill Unbox", "redirect": "Toy Treasures", "context": "Invoice ick; Alejo's all adventure."}]},
    29: {"level": 2, "base": "MR. BEAST KIDS", "correct": [{"word": "Challenge Copies", "context": "Mini versions of epic giveaways."}], "distractors": [{"word": "Beastly Bills", "redirect": "Giveaway Giggles", "context": "Debt dare; Kids' challenges charm."}]},
    30: {"level": 1, "base": "Evelyn GRWM", "correct": [{"word": "Kid Makeup Routines", "context": "Safe beauty tips for young faces."}], "distractors": [{"word": "Adult Audit Routines", "redirect": "Glam Games", "context": "Form face; Evelyn's effortless elegance."}]},
    31: {"level": 3, "base": "Drunk Elephant Kids", "correct": [{"word": "Safe Skin Picks", "context": "Brand guides gentle products for tweens."}], "distractors": [{"word": "Elephant Trunks Tax", "redirect": "Tween Treatments", "context": "Heavy hide; Drunk's delightful for dews."}]},
    32: {"level": 2, "base": "Casetify Cases", "correct": [{"word": "Garza Custom Designs", "context": "Twins collab on fun phone protectors."}], "distractors": [{"word": "Case Closed Audits", "redirect": "Design Dazzle", "context": "Final form; Casetify's creative covers."}]},
    33: {"level": 1, "base": "Cult Gaia Bags", "correct": [{"word": "Ayla Mini Hauls", "context": "Kid-sized luxury for playtime purses."}], "distractors": [{"word": "Gaia Tax Bags", "redirect": "Fashion Finds", "context": "Deduction drag; Ayla's accessorize awes."}]},
    34: {"level": 3, "base": "Mikaila Ulmer", "correct": [{"word": "Lemonade Empire", "context": "Young entrepreneur's bee-saving biz."}, {"word": "Shark Tank Star", "context": "Pitched sustainability at young age."}], "distractors": [{"word": "Lemon Tax Squeeze", "redirect": "Sweet Success", "context": "Sour state; Mikaila's millions motivate."}]},
    35: {"level": 2, "base": "Grace", "correct": [{"word": "Inclusivity Posts", "context": "Shares gender identity stories positively."}], "distractors": [{"word": "Exclusive Clubs", "redirect": "Open Advocacy", "context": "Gate keep; Grace's grace guides all."}]},
    36: {"level": 1, "base": "Emilia", "correct": [{"word": "Daily Outfits", "context": "German teen's style shares on Insta."}], "distractors": [{"word": "Uniform Days", "redirect": "Trendy Threads", "context": "School sameness; Emilia's eclectic edges."}]},
    37: {"level": 3, "base": "Bianca's Kids", "correct": [{"word": "Lio and Emily", "context": "BibisBeauty Palace family features."}], "distractors": [{"word": "Tax Time Twins", "redirect": "Family Fun", "context": "Form family; Lio & Emily light laughs."}]},
    38: {"level": 2, "base": "Sarah Harrison Kids", "correct": [{"word": "Family Travel Vlogs", "context": "Adventures with Dominic and little ones."}], "distractors": [{"word": "Staycation Taxes", "redirect": "Global Getaways", "context": "Home hold; Harrison's horizons horizons."}]},
    39: {"level": 1, "base": "Eliana Damm", "correct": [{"word": "Sun Daughter Vibes", "context": "Anna Maria's kid in sunny family pics."}], "distractors": [{"word": "Moonlit Meetings", "redirect": "Bright Beginnings", "context": "Night nod; Eliana's sunshine sparkles."}]},
    40: {"level": 2, "base": "Giasmina Liebt", "correct": [{"word": "DIY Family Hacks", "context": "Mom of four shares kid chaos tips."}], "distractors": [{"word": "Tax Hack Nightmares", "redirect": "Home Hilarity", "context": "Deduct dread; Giasmina's giggles galore."}]},
    41: {"level": 3, "base": "Alicia's Mumlife", "correct": [{"word": "Kids Book Author", "context": "Writes tales for her three little ones."}], "distractors": [{"word": "Tax Book Auditor", "redirect": "Storytime Stars", "context": "Form fiction; Alicia's adventures awe."}]},
    42: {"level": 1, "base": "Nadine Sobotzik", "correct": [{"word": "Teacher Mom Tips", "context": "Balances family and fashion insights."}], "distractors": [{"word": "Student Tax Grades", "redirect": "Parent Pointers", "context": "Report rub; Nadine's nurturing nuggets."}]},
    43: {"level": 2, "base": "Annkathrin Thyret", "correct": [{"word": "Yael Label Mom", "context": "Designs kid fashion with her duo."}], "distractors": [{"word": "Label Tax Lies", "redirect": "Style Savvy", "context": "Deduct deceit; Annkathrin's apparel shines."}]},
    44: {"level": 3, "base": "Emrah's Baby", "correct": [{"word": "Gender Reveal Joy", "context": "Marisa's little one in family bliss."}], "distractors": [{"word": "Reveal Revenue", "redirect": "Baby Bundle", "context": "Income ink; Emrah's excitement eternal."}]},
    45: {"level": 1, "base": "Dr. Emi Skin", "correct": [{"word": "Kid Dermatologist", "context": "Safe skincare for young glowing skin."}], "distractors": [{"word": "Skin Tax Deep", "redirect": "Gentle Glow", "context": "Deduct dive; Dr. Emi's easy essentials."}]},
    46: {"level": 2, "base": "Vitor Gatinho", "correct": [{"word": "Childhood Disney", "context": "Party tips with Mickey magic."}], "distractors": [{"word": "Adult Audit Party", "redirect": "Kid Kingdom", "context": "Form fiesta flop; Gatinho's glee galore."}]},
    47: {"level": 3, "base": "Ernsting's Family", "correct": [{"word": "Recommended Fun", "context": "Affordable kid clothes for families."}], "distractors": [{"word": "Family Tax Recs", "redirect": "Playwear Picks", "context": "Deduct dread; Ernsting's everyday ease."}]},
    48: {"level": 1, "base": "PD Dr. Dördelmann", "correct": [{"word": "Kid Health Hacks", "context": "Medical tips for playful parents."}], "distractors": [{"word": "Health Tax Hacks", "redirect": "Wellness Wins", "context": "Claim chaos; Dördelmann's doctor delights."}]},
    49: {"level": 2, "base": "Lami Gaming", "correct": [{"word": "Roblox Group Fun", "context": "Kid gamer with merch and collabs."}], "distractors": [{"word": "Game Tax Grind", "redirect": "Play Pals", "context": "Level lag; Lami's lobby laughs."}]},
    50: {"level": 3, "base": "Uyen Tran", "correct": [{"word": "Travel Tales", "context": "Explores Germany with kid curiosity."}, {"word": "Study Adventures", "context": "Balances school and social shares."}], "distractors": [{"word": "Tran Tax Trails", "redirect": "Wander Wonders", "context": "Path paperwork; Uyen's upbeat uncovers."}]},
    51: {"level": 1, "base": "Emilio Piano", "correct": [{"word": "Street Surprises", "context": "Plays tunes for joyful reactions."}], "distractors": [{"word": "Piano Tax Keys", "redirect": "Melody Magic", "context": "Note nightmare; Emilio's encore enchants."}]},
    52: {"level": 2, "base": "Merayad", "correct": [{"word": "Humor Anecdotes", "context": "Relatable laughs with sponsored spins."}], "distractors": [{"word": "Merayad Math", "redirect": "Giggle Gold", "context": "Sum snore; Merayad's memes mesmerize."}]},
    53: {"level": 3, "base": "SIS vs BRO", "correct": [{"word": "Challenge Champs", "context": "Siblings battle in viral kid games."}], "distractors": [{"word": "Bro vs IRS", "redirect": "Sib Showdown", "context": "Tax tussle; SIS vs BRO's brotherly brawls."}]},
    54: {"level": 1, "base": "Evereden Collection", "correct": [{"word": "Tween Skincare Boom", "context": "Products exploding in kid routines."}], "distractors": [{"word": "Ever Tax Den", "redirect": "Glow Goods", "context": "Claim cave; Evereden's eternal ease."}]},
    55: {"level": 2, "base": "Digital Voices Study", "correct": [{"word": "Influencer Trust", "context": "49% kids trust creators like family."}], "distractors": [{"word": "Voice Tax Votes", "redirect": "Kid Cred", "context": "Audit agree; Study shows star sway."}]},
    56: {"level": 3, "base": "Whop Report", "correct": [{"word": "YouTuber Dreams", "context": "30% Gen Alpha aspire to create."}], "distractors": [{"word": "Whop Work Woes", "redirect": "Creator Call", "context": "Job jam; Report reveals riches route."}]},
    57: {"level": 1, "base": "PwC Holiday Outlook", "correct": [{"word": "Kid Spending Drop", "context": "5% less but influencers sway buys."}], "distractors": [{"word": "Outlook Overdraft", "redirect": "Gift Guide", "context": "Budget bust; PwC predicts playful picks."}]},
    58: {"level": 2, "base": "Illinois Law", "correct": [{"word": "Kid Earnings Share", "context": "Protects child influencers' cut."}], "distractors": [{"word": "Lawyer Loot", "redirect": "Fair Funds", "context": "Legal lift; Illinois invests in innocence."}]},
    59: {"level": 3, "base": "California Bill", "correct": [{"word": "Child Protections", "context": "Senate passes influencer safeguards."}], "distractors": [{"word": "Bill Tax Bills", "redirect": "Rights Rally", "context": "Due dread; CA champions child cash."}]},
    60: {"level": 1, "base": "Razorfish Research", "correct": [{"word": "YouTube Discovery", "context": "51% find brands via kid channels."}], "distractors": [{"word": "Research Returns", "redirect": "Trend Tracks", "context": "Refund rut; Razorfish reveals reach."}]},
}

def generate_item_id(chapter_abbr, item_num):
    """Generate item ID like GA_KI_001"""
    chapter_abbreviations = {
        "Kid_Influencers": "KI",
        "German_Creators": "GC",
        "Brand_Collabs": "BC",
        "Studies_Reports": "SR"
    }
    abbr = chapter_abbreviations.get(chapter_abbr, "XX")
    return f"{BASE_ID_PREFIX}_{abbr}_{item_num:03d}"

def create_item(item_num, chapter_name, item_data):
    """Create a single item entry"""
    item_id = generate_item_id(chapter_name, item_num)
    
    # Base configuration
    base = {
        "word": item_data["base"],
        "type": "InfluencerTerm",
        "visual": {
            "tier": 2,
            "size": 1,
            "appearance": "bold",
            "color": "#e74c3c",
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
    
    # Distractor entries
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
        "source": "Gen-Alpha & Kid Influencer Chaos 2025",
        "tags": ["gen-alpha", "kid-influencer", "trends", chapter_name.lower()],
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
    output_dir = "public/content/themes/checkst_du/gen_alpha_kid_influencer"
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


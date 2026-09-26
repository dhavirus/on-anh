#!/usr/bin/env python3
"""Link a starter set of word_bank lemmas to each seeded topic (§7 M1).

Curated by hand (common, everyday vocabulary per topic), not derived from
any external list. Must run after import_efllex.py, since it matches
against already-imported word_bank rows.

Usage:
  python3 scripts/tag_topics.py | psql "$DATABASE_URL"
  python3 scripts/tag_topics.py | docker exec -i supabase_db_2.2.English-webpage psql -U postgres -d postgres
"""
import sys

TOPIC_WORDS = {
    "family-relationships": [
        "mother", "father", "parent", "brother", "sister", "son", "daughter",
        "child", "baby", "husband", "wife", "family", "relative",
        "grandmother", "grandfather", "aunt", "uncle", "cousin", "friend",
        "neighbor", "marry", "love", "hug", "kiss", "twin", "couple",
    ],
    "food-cooking": [
        "eat", "drink", "food", "breakfast", "lunch", "dinner", "cook",
        "kitchen", "recipe", "bread", "rice", "meat", "fish", "vegetable",
        "fruit", "apple", "water", "milk", "coffee", "tea", "sugar", "salt",
        "cup", "plate", "spoon", "fork", "knife", "hungry", "thirsty",
        "delicious", "taste", "boil", "fry", "bake", "restaurant", "menu",
    ],
    "home-daily-routines": [
        "house", "home", "room", "bedroom", "bathroom", "door", "window",
        "bed", "sleep", "wake", "wash", "clean", "morning", "evening",
        "night", "today", "tomorrow", "yesterday", "shower", "brush",
        "dress", "chair", "table", "floor", "wall", "key", "lock",
    ],
    "shopping-money": [
        "buy", "sell", "shop", "store", "market", "price", "money", "pay",
        "cost", "cheap", "expensive", "cash", "card", "receipt", "bag",
        "size", "color", "discount", "bill", "wallet", "coin", "dollar",
        "change", "customer", "sale",
    ],
    "travel": [
        "travel", "trip", "journey", "airport", "flight", "plane", "train",
        "bus", "car", "ticket", "passport", "hotel", "map", "luggage",
        "suitcase", "tourist", "visit", "abroad", "country", "city", "road",
        "station", "destination", "guide",
    ],
    "health-body": [
        "body", "head", "hand", "arm", "leg", "foot", "eye", "ear", "mouth",
        "nose", "hair", "heart", "sick", "ill", "healthy", "doctor",
        "hospital", "medicine", "pain", "hurt", "fever", "tired", "rest",
        "exercise", "tooth", "nurse",
    ],
    "weather-nature": [
        "weather", "sun", "sunny", "rain", "rainy", "cloud", "cloudy",
        "wind", "windy", "snow", "cold", "hot", "warm", "cool", "storm",
        "sky", "tree", "flower", "forest", "mountain", "river", "sea",
        "ocean", "beach", "season", "spring", "summer", "autumn", "winter",
        "animal",
    ],
    "education-school": [
        "school", "student", "teacher", "class", "classroom", "book", "pen",
        "pencil", "paper", "homework", "exam", "test", "study", "learn",
        "lesson", "subject", "read", "write", "question", "answer", "grade",
        "university", "degree",
    ],
    "work-career": [
        "work", "job", "career", "office", "company", "boss", "employee",
        "colleague", "meeting", "salary", "interview", "project", "task",
        "deadline", "manager", "business", "skill", "experience",
        "promotion", "retire", "hire", "apply", "contract",
    ],
    "technology-communication": [
        "phone", "computer", "internet", "email", "message", "call", "text",
        "screen", "app", "website", "password", "connect", "camera",
        "photo", "video", "chat", "network", "device", "charge", "battery",
        "download", "upload", "online",
    ],
}


def main():
    print("begin;")
    for slug, words in TOPIC_WORDS.items():
        word_list = ", ".join(f"'{w}'" for w in words)
        print(
            f"""insert into public.word_topics (word_id, topic_id)
select wb.id, t.id
from public.word_bank wb
join public.topics t on t.slug = '{slug}'
where wb.lemma in ({word_list})
on conflict do nothing;"""
        )
    print("commit;")
    print(
        "-- run a lemma-coverage check afterward: see scripts/tag_topics_report.sql",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()

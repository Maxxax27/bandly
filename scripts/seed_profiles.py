import random
from datetime import datetime

import firebase_admin
from firebase_admin import credentials, firestore

# 🔑 Service Account
cred = credentials.Certificate("firebase-service-account.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

REGIONS = ["LU", "ZH", "BE", "BS", "SG", "AG", "TG", "GR", "VS", "TI"]
ROLES = ["Singer", "Gitarre", "Bass", "Drums", "Keys", "DJ", "Violin"]
STATUSES = ["Band", "Solo", "Suchend"]
GENRES = ["Rock", "Metal", "Pop", "Indie", "Blues", "Jazz"]

def pick(arr):
    return random.choice(arr)

def pick_many(arr, min_n=1, max_n=3):
    return random.sample(arr, random.randint(min_n, min(max_n, len(arr))))

def seed_profiles(count=40):
    print(f"🌱 Seeding {count} test profiles…")

    for i in range(count):
        uid = f"test_{i+1}"
        name = f"TestMusiker {i+1}"
        band = f"Band {i+1}" if random.random() > 0.5 else ""

        avatar_id = (i % 70) + 1
        photo_url = f"https://i.pravatar.cc/300?img={avatar_id}"

        profile = {
            "uid": uid,
            "displayName": name,
            "photoURL": photo_url,
            "region": pick(REGIONS),
            "zip": str(6000 + random.randint(0, 300)),
            "bandName": band,
            "status": pick(STATUSES),
            "roles": pick_many(ROLES),
            "genres": pick_many(GENRES),
            "bio": "Dies ist ein automatisch generiertes Testprofil für Bandly.",
            "search": {
                "name": name.lower(),
                "band": band.lower(),
            },
            "isTest": True,
            "updatedAt": datetime.utcnow(),
        }

        db.collection("profiles").document(uid).set(profile)
        print(f"✅ {uid} · {name}")

    print("🎉 Fertig!")

if __name__ == "__main__":
    seed_profiles(40)

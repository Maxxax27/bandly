/**
 * Run:
 *   node scripts/seed-profiles.cjs
 *
 * Needs .env.local with:
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 */

require("dotenv").config({ path: ".env.local" });

const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

// Minimal config reicht fürs Seeding
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error("❌ Missing Firebase env vars. Check .env.local:");
  console.error("   NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const REGIONS = ["LU", "ZH", "BE", "BS", "SG", "AG", "TG", "GR", "VS", "TI"];
const ROLES = ["Singer", "Gitarre", "Bass", "Drums", "Keys", "DJ", "Violin"];
const STATUSES = ["Band", "Solo", "Suchend"];
const GENRES = ["Rock", "Metal", "Pop", "Indie", "Blues", "Jazz"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickMany = (arr, min = 1, max = 3) => {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
};

// Entfernt undefined rekursiv (Firestore mag kein undefined)
function stripUndefined(obj) {
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return obj;
}

async function seed(count = 40) {
  console.log(`🌱 Seeding ${count} test profiles…`);

  for (let i = 0; i < count; i++) {
    const uid = `test_${i + 1}`;
    const name = `TestMusiker ${i + 1}`;
    const band = Math.random() > 0.5 ? `Band ${i + 1}` : "";

    const avatarId = (i % 70) + 1;
    const photoURL = `https://i.pravatar.cc/300?img=${avatarId}`;

    const profile = stripUndefined({
      uid,
      displayName: name,
      photoURL,
      region: pick(REGIONS),
      zip: String(6000 + Math.floor(Math.random() * 300)),
      bandName: band,
      status: pick(STATUSES),
      roles: pickMany(ROLES),
      genres: pickMany(GENRES),
      bio: "Dies ist ein automatisch generiertes Testprofil für Bandly.",
      search: {
        name: name.toLowerCase(),
        band: band.toLowerCase(),
      },
      isTest: true,
      // ✅ statt serverTimestamp() -> Date ist Firestore-kompatibel
      updatedAt: new Date(),
    });

    try {
      await setDoc(doc(db, "profiles", uid), profile, { merge: true });
      console.log(`✅ ${uid} · ${name}`);
    } catch (err) {
      console.error(`❌ Failed on ${uid}`, err);
      process.exit(1);
    }
  }

  console.log("🎉 Fertig!");
}

seed(40);

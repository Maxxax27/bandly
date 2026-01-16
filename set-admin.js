const admin = require("firebase-admin");

// ✅ Service Account Key muss im gleichen Ordner liegen:
admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")),
});

// 👉 HIER deine UID eintragen:
const uid = "LOpt9aHb1HMDXwm7ZM1jqu0g0Y33";

(async () => {
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log("✅ Admin-Claim gesetzt für UID:", uid);
  console.log("➡️ Wichtig: Bitte ausloggen & wieder einloggen (Token refresh).");
  process.exit(0);
})().catch((err) => {
  console.error("❌ Fehler:", err);
  process.exit(1);
});

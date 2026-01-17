const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 🔴 HIER DEINE UID EINTRAGEN
const UID = "LOpt9aHb1HMDXwm7ZM1jqu0g0Y33";

admin
  .auth()
  .setCustomUserClaims(UID, { admin: true })
  .then(() => {
    console.log("✅ Admin Claim gesetzt für UID:", UID);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Fehler beim Setzen des Admin Claims:", err);
    process.exit(1);
  });

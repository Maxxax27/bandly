"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export function useUnreadCount(uid: string | null) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    // ✅ WICHTIG: ohne uid KEINE Query (sonst permission-denied)
    if (!uid) {
      setUnread(0);
      return;
    }

    // Beispiel-Ansatz: conversations haben ein Feld "participants" (array)
    // und "unreadBy.<uid>" = true/number/whatever.
    // Passe die where(...) Zeile an dein Datenmodell an!
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", uid)
      // OPTIONAL falls du ein unread-Feld hast:
      // where(`unreadBy.${uid}`, "==", true)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        // ✅ Minimal: Anzahl Conversations (oder echte unread-Logik)
        // Wenn du pro Conversation eine Zahl "unreadCount.<uid>" hast,
        // kannst du hier summieren.
        setUnread(snap.size);
      },
      (err) => {
        // ✅ Kein Console-Spam + UI bleibt stabil
        console.warn("useUnreadCount snapshot error:", err?.code || err);
        setUnread(0);
      }
    );

    return () => unsub();
  }, [uid]);

  return unread;
}

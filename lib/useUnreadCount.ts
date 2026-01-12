"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useUnreadCount(uid: string | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uid) {
      setCount(0);
      return;
    }

    const qy = query(
      collection(db, "conversations"),
      where("participants", "array-contains", uid)
    );

    const unsub = onSnapshot(qy, (snap) => {
      let sum = 0;
      snap.forEach((doc) => {
        const d = doc.data() as any;
        const n = d?.unreadFor?.[uid];
        if (typeof n === "number" && n > 0) sum += n;
      });
      setCount(sum);
    });

    return () => unsub();
  }, [uid]);

  return count;
}

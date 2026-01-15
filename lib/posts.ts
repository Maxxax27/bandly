// lib/posts.ts
import { db, storage } from "@/lib/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";

export type PostAuthor =
  | { type: "musician"; uid: string; displayName: string; photoURL: string | null }
  | { type: "band"; bandId: string; displayName: string; photoURL: string | null };

export type PostAttachment = {
  type: "image" | "audio" | "document";
  url: string;
  path: string; // Firebase Storage path (zum Löschen)
  name: string;
  size: number;
  contentType: string;
};

export async function createPost(params: {
  content: string;
  author: PostAuthor;
  postedBy?: { uid: string; displayName: string; photoURL: string | null; username?: string | null };
  attachments?: PostAttachment[]; // ✅ NEU
}) {
  const content = params.content.trim();
  const attachments = params.attachments ?? [];

  // ✅ Erlaube Post auch nur mit Anhang (ohne Text)
  if (!content && attachments.length === 0) throw new Error("Content empty");

  await addDoc(collection(db, "posts"), {
    content,
    author: params.author,
    ...(params.postedBy ? { postedBy: params.postedBy } : {}),
    attachments, // ✅ NEU
    visibility: "public",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function fetchLatestPosts(pageSize = 20) {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Löscht den Post. Optional: löscht auch alle Storage-Dateien aus attachments[].
 * (empfohlen, sonst bleiben Dateien im Storage liegen)
 */
export async function deletePost(postId: string, opts?: { deleteAttachments?: boolean }) {
  const deleteAttachments = opts?.deleteAttachments ?? true;

  if (deleteAttachments) {
    const postRef = doc(db, "posts", postId);
    const snap = await getDoc(postRef);

    if (snap.exists()) {
      const data: any = snap.data();
      const attachments: PostAttachment[] = Array.isArray(data.attachments) ? data.attachments : [];

      // Storage-Dateien löschen (best effort)
      await Promise.allSettled(
        attachments
          .filter((a) => a?.path)
          .map((a) => deleteObject(ref(storage, a.path)))
      );
    }
  }

  await deleteDoc(doc(db, "posts", postId));
}

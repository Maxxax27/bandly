// lib/posts.ts
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs,
  doc, 
  deleteDoc
} from "firebase/firestore";

export type PostAuthor =
  | { type: "musician"; uid: string; displayName: string; photoURL: string | null }
  | { type: "band"; bandId: string; displayName: string; photoURL: string | null };

export async function createPost(params: {
  content: string;
  author: PostAuthor;
  postedBy?: { uid: string; displayName: string; photoURL: string | null; username?: string | null };
}) {
  const content = params.content.trim();
  if (!content) throw new Error("Content empty");

  await addDoc(collection(db, "posts"), {
    content,
    author: params.author,
    ...(params.postedBy ? { postedBy: params.postedBy } : {}),
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
export async function deletePost(postId: string) {
  await deleteDoc(doc(db, "posts", postId));}
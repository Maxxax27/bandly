"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Post = {
  content?: string;
  createdAt?: any;
  author?: {
    type?: "musician" | "band" | "producer";
    uid?: string;
    bandId?: string;
    displayName?: string;
    photoURL?: string | null;
  };
  attachments?: {
    type: "image" | "audio" | "document";
    url: string;
    path: string;
    name: string;
    size: number;
    contentType: string;
  }[];
  visibility?: string;
};

export default function BlogPostPage({
  params,
}: {
  params: { postId: string };
}) {
  const { postId } = params;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "posts", postId));
        if (!snap.exists()) {
          setNotFound(true);
        } else {
          setPost(snap.data() as Post);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [postId]);

  if (loading) {
    return <div className="p-6 text-sm text-white/60">Lade Post…</div>;
  }

  if (notFound || !post) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-sm text-white/70">Post nicht gefunden.</p>
        <Link
          href="/blog"
          className="inline-block rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
        >
          ← Zurück zum Blog
        </Link>
      </div>
    );
  }

  const authorName = post.author?.displayName ?? "Unbekannt";
  const avatar = post.author?.photoURL ?? "/default-avatar.png";

  return (
    <div className="pb-28 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/blog" className="text-sm text-white/70 hover:text-white">
          ← Blog
        </Link>
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/40">
            <img
              src={avatar}
              alt={authorName}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">
              {authorName}
            </div>
            <div className="text-xs text-white/50">
              {post.author?.type ? post.author.type : "author"}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 text-white whitespace-pre-line">
          {post.content ?? ""}
        </div>

        {/* Attachments */}
        {Array.isArray(post.attachments) && post.attachments.length > 0 && (
          <div className="mt-5 space-y-2">
            <div className="text-xs font-semibold text-white/60">Anhänge</div>

            {post.attachments.map((a, idx) => (
              <a
                key={idx}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/80 hover:bg-white/5"
              >
                {(a.type || "file").toUpperCase()} • {a.name ?? "Anhang"}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Kommentare später */}
      <div className="text-xs text-white/40">
        Kommentare: später (posts/{postId}/comments)
      </div>
    </div>
  );
}

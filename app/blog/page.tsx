"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchLatestPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

type Post = {
  id: string;
  content?: string;
  author?: {
    type?: "musician" | "band" | "producer";
    uid?: string;
    bandId?: string;
    displayName?: string;
    photoURL?: string | null;
  };
  postedBy?: {
    uid?: string;
    displayName?: string;
    photoURL?: string | null;
    username?: string | null;
  };
};

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestPosts(20)
      .then((res: any[]) => setPosts(res as Post[]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-4xl px-4 py-16 space-y-6">
        <h1 className="text-3xl font-bold">📰 Blog</h1>

        {loading ? (
          <p className="text-white/60">Lade Posts…</p>
        ) : posts.length === 0 ? (
          <p className="text-white/60">Noch keine Posts vorhanden.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => {
              const authorName = p.author?.displayName ?? "Unbekannt";
              const authorAvatar =
                p.author?.photoURL ?? "/default-avatar.png";

              const postedBy =
                p.postedBy?.username
                  ? `@${p.postedBy.username}`
                  : p.postedBy?.displayName
                  ? `@${p.postedBy.displayName}`
                  : null;

              const authorTypeLabel =
                p.author?.type === "band"
                  ? "Band"
                  : p.author?.type === "musician"
                  ? "Musiker"
                  : p.author?.type === "producer"
                  ? "Producer"
                  : "Author";

              return (
                <Link
                  key={p.id}
                  href={`/blog/${p.id}`}
                  className="block rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-white/5 transition"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/40">
                      <img
                        src={authorAvatar}
                        alt={authorName}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold text-white truncate">
                          {authorName}
                        </span>

                        <span className="text-xs text-white/50 truncate">
                          ·{" "}
                          {postedBy
                            ? `gepostet von ${postedBy}`
                            : "Band-Post"}
                        </span>
                      </div>

                      <div className="text-xs text-white/40">
                        {authorTypeLabel}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="mt-3 text-sm text-white/80 line-clamp-3 whitespace-pre-line">
                    {p.content ?? ""}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

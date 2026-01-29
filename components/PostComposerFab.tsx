"use client";

import { useEffect, useState } from "react";
import { PostComposer } from "./PostComposer";

export function PostComposerFab({ myProfile }: { myProfile: any }) {
  const [open, setOpen] = useState(false);

  // Optional: ESC schließt Modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Floating Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-white text-black shadow-xl hover:opacity-90 active:scale-95"
        aria-label="Neuen Post erstellen"
      >
        <span className="text-3xl leading-none">+</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
            aria-label="Schließen"
          />

          {/* Panel */}
          <div className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-xl rounded-t-3xl border border-white/10 bg-black/90 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-white/80">Neuen Post erstellen</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-1 text-sm text-white/70 hover:text-white"
              >
                Schließen
              </button>
            </div>

            <PostComposer myProfile={myProfile} />

            {/* Optional: nach dem Posten automatisch schließen:
                -> siehe Punkt 2 (onPosted Callback)
            */}
          </div>
        </div>
      )}
    </>
  );
}

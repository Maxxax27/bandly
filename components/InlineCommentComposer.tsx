"use client";

import { useEffect, useRef, useState } from "react";

function clsx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function InlineCommentComposer({
  count,
  onSubmit,
  disabled,
  placeholder = "Kommentar…",
}: {
  count: number;
  onSubmit: (text: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function submit() {
    const v = text.trim();
    if (!v || sending || disabled) return;

    setSending(true);
    try {
      await onSubmit(v);
      setText("");
      setOpen(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Kommentar Icon Button + Count */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((s) => !s)}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-xl px-2.5 py-2",
          "border border-white/10 bg-black/30 hover:bg-white/5",
          "text-white/80 hover:text-white transition",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Kommentieren"
        title="Kommentieren"
      >
        {/* schlichtes Chat Icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v8A3.5 3.5 0 0 1 16.5 17H9l-5 5v-5.5A3.5 3.5 0 0 1 4 13.5v-8Z" />
        </svg>

        {/* nur Zahl – kein extra Icon */}
        <span className="text-xs text-white/60">{count}</span>
      </button>

      {/* Input nur wenn open */}
      {open && (
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              setText("");
            }
          }}
          onBlur={() => {
            setOpen(false);
            setText("");
          }}
          disabled={disabled || sending}
          className={clsx(
            "h-9 w-full max-w-[320px] rounded-xl",
            "border border-white/10 bg-black/30 px-3 text-sm text-white",
            "outline-none placeholder:text-white/40",
            "focus:border-white/20"
          )}
        />
      )}
    </div>
  );
}

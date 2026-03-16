"use client";
import { useState, useCallback } from "react";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      onClick={copy}
      className="text-[9px] tracking-[1px] px-2 py-0.5 border border-[var(--border)] rounded text-[var(--sub)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
    >
      {copied ? "COPIED" : label || "COPY"}
    </button>
  );
}

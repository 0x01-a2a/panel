"use client";
import { decodePayload } from "@/app/lib/types";

export function DeliverViewer({ payloadB64 }: { payloadB64: string }) {
  const decoded = decodePayload(payloadB64);

  if (!decoded) {
    return (
      <div className="text-[10px] text-[var(--dim)] italic">
        Unable to decode payload
      </div>
    );
  }

  // String content (plain text delivery)
  if (typeof decoded === "string") {
    // Check if it looks like a data URL (image)
    if (decoded.startsWith("data:image/")) {
      return (
        <div className="mt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={decoded}
            alt="Delivered content"
            className="max-w-full max-h-60 rounded border border-[var(--border)]"
          />
        </div>
      );
    }
    return (
      <div className="mt-1 bg-[var(--bg)] rounded p-2">
        <pre className="text-[10px] text-[var(--text)] whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
          {decoded}
        </pre>
      </div>
    );
  }

  // Object payload — check for known structures
  const obj = decoded as Record<string, unknown>;

  // Image delivery: { type: "image", data: "base64...", mime: "image/png" }
  if (obj.type === "image" && typeof obj.data === "string") {
    const mime = (obj.mime as string) || "image/png";
    return (
      <div className="mt-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:${mime};base64,${obj.data}`}
          alt="Delivered image"
          className="max-w-full max-h-60 rounded border border-[var(--border)]"
        />
      </div>
    );
  }

  // Text delivery: { type: "text", content: "..." } or { text: "..." }
  if (obj.type === "text" && typeof obj.content === "string") {
    return (
      <div className="mt-1 bg-[var(--bg)] rounded p-2">
        <pre className="text-[10px] text-[var(--text)] whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
          {obj.content}
        </pre>
      </div>
    );
  }

  if (typeof obj.text === "string") {
    return (
      <div className="mt-1 bg-[var(--bg)] rounded p-2">
        <pre className="text-[10px] text-[var(--text)] whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
          {obj.text}
        </pre>
      </div>
    );
  }

  // Fallback: render as formatted JSON
  return (
    <div className="mt-1 bg-[var(--bg)] rounded p-2">
      <pre className="text-[10px] text-[var(--dim)] max-h-40 overflow-y-auto">
        {JSON.stringify(obj, null, 2)}
      </pre>
    </div>
  );
}

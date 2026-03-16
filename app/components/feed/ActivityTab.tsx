"use client";
import { useState } from "react";
import type { ActivityEvent } from "@/app/lib/types";
import { shortId, timeAgo, MSG_COLORS } from "@/app/lib/types";

export function ActivityTab({ events }: { events: ActivityEvent[] }) {
  const [filter, setFilter] = useState<"all" | string>("all");

  const eventTypes = Array.from(new Set(events.map((ev) => ev.event_type)));
  const filtered =
    filter === "all"
      ? events
      : events.filter((ev) => ev.event_type === filter);

  return (
    <div>
      {/* Stats + filter */}
      <div className="flex items-center justify-between mb-3 border-b border-[var(--border)] pb-3">
        <div className="flex gap-4">
          <div>
            <span className="text-[18px] font-bold text-[var(--text)]">
              {events.length}
            </span>
            <span className="text-[10px] tracking-[2px] text-[var(--sub)] ml-2">
              EVENTS
            </span>
          </div>
          <div>
            <span className="text-[18px] font-bold text-[var(--green)]">
              {events.filter((e) => (Date.now() / 1000 - e.ts) < 300).length}
            </span>
            <span className="text-[10px] tracking-[2px] text-[var(--sub)] ml-2">
              LAST 5m
            </span>
          </div>
        </div>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`text-[9px] tracking-[1px] px-2 py-1 border rounded transition-colors ${
              filter === "all"
                ? "border-[var(--green)] text-[var(--green)]"
                : "border-[var(--border)] text-[var(--dim)]"
            }`}
          >
            ALL
          </button>
          {eventTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-[9px] tracking-[1px] px-2 py-1 border rounded transition-colors ${
                filter === t
                  ? "border-[var(--green)] text-[var(--green)]"
                  : "border-[var(--border)] text-[var(--dim)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Event list */}
      <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
        {filtered.map((ev) => {
          const color = MSG_COLORS[ev.event_type] || "text-[var(--sub)]";
          return (
            <div
              key={ev.id}
              className="flex items-center gap-3 px-3 py-1.5 border border-[var(--border)] rounded hover:border-[var(--dim)] transition-colors"
            >
              <span
                className={`text-[10px] tracking-[2px] font-bold w-20 ${color}`}
              >
                {ev.event_type}
              </span>
              <span className="text-[10px] text-[var(--sub)] w-24 truncate">
                {ev.name || shortId(ev.agent_id)}
              </span>
              <span className="text-[10px] text-[var(--dim)] flex-1 truncate">
                {ev.target_id
                  ? `-> ${ev.target_name || shortId(ev.target_id)}`
                  : ""}
                {ev.score !== null && ev.score !== undefined
                  ? ` score:${ev.score}`
                  : ""}
                {ev.conversation_id
                  ? ` conv:${shortId(ev.conversation_id)}`
                  : ""}
              </span>
              <span className="text-[9px] text-[var(--dim)]">
                {timeAgo(ev.ts)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import type { Agent, ActivityEvent, BountyHistoryEntry } from "@/app/lib/types";
import { shortId, timeAgo } from "@/app/lib/types";
import type { AgentSort } from "@/app/lib/hooks/useAgents";
import { AgentDetailModal } from "./AgentDetailModal";

export function MeshTab({
  agents,
  sorted,
  search,
  setSearch,
  sort,
  setSort,
  onlineCount,
  totalCount,
  activity,
  bountyHistory,
}: {
  agents: Agent[];
  sorted: Agent[];
  search: string;
  setSearch: (s: string) => void;
  sort: AgentSort;
  setSort: (s: AgentSort) => void;
  onlineCount: number;
  totalCount: number;
  activity: ActivityEvent[];
  bountyHistory: BountyHistoryEntry[];
}) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const now = Date.now() / 1000;

  return (
    <div>
      <AgentDetailModal
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
        activity={activity}
        bountyHistory={bountyHistory}
      />

      {/* Stats bar */}
      <div className="flex gap-6 mb-4 border-b border-[var(--border)] pb-3">
        <div>
          <span className="text-[20px] font-bold text-[var(--green)]">
            {totalCount}
          </span>
          <span className="text-[10px] tracking-[2px] text-[var(--sub)] ml-2">
            AGENTS
          </span>
        </div>
        <div>
          <span className="text-[20px] font-bold text-[var(--green)]">
            {onlineCount}
          </span>
          <span className="text-[10px] tracking-[2px] text-[var(--sub)] ml-2">
            ONLINE
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-3">
        <input
          placeholder="Search agents..."
          className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-[12px] text-[var(--text)] placeholder:text-[var(--dim)] focus:border-[var(--green)] focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {(["seen", "rep", "name", "feedback"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`text-[10px] tracking-[2px] px-3 py-1 border rounded transition-colors ${
              sort === s
                ? "border-[var(--green)] text-[var(--green)]"
                : "border-[var(--border)] text-[var(--sub)] hover:border-[var(--dim)]"
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Agent list */}
      <div className="max-h-[calc(100vh-320px)] overflow-y-auto space-y-1">
        {sorted.map((a) => {
          const online = now - a.last_seen < 120;
          return (
            <div
              key={a.agent_id}
              onClick={() => setSelectedAgent(a)}
              className="flex items-center gap-3 px-3 py-2 border border-[var(--border)] rounded hover:border-[var(--dim)] transition-colors group cursor-pointer"
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  online ? "bg-[var(--green)]" : "bg-[var(--dim)]"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[var(--text)] truncate">
                    {a.name}
                  </span>
                  <span className="text-[10px] text-[var(--sub)]">
                    {shortId(a.agent_id)}
                  </span>
                  {a.country && (
                    <span className="text-[10px] text-[var(--dim)]">
                      {a.country}
                      {a.city ? `/${a.city}` : ""}
                    </span>
                  )}
                  {a.geo_consistent !== undefined && (
                    <span
                      className={`text-[8px] px-1 rounded ${
                        a.geo_consistent
                          ? "bg-[var(--green)]/10 text-[var(--green)]"
                          : "bg-[var(--red)]/10 text-[var(--red)]"
                      }`}
                    >
                      {a.geo_consistent ? "GEO OK" : "GEO ?"}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-[var(--sub)]">
                {timeAgo(a.last_seen)}
              </span>
              <span
                className={`text-[11px] font-bold ${
                  a.average_score > 0
                    ? "text-[var(--green)]"
                    : a.average_score < 0
                    ? "text-[var(--red)]"
                    : "text-[var(--sub)]"
                }`}
              >
                {a.average_score.toFixed(1)}
              </span>
              <span className="text-[9px] text-[var(--dim)]">
                {a.feedback_count}fb
              </span>
              {a.latency && Object.keys(a.latency).length > 0 && (
                <div className="hidden group-hover:flex gap-1">
                  {Object.entries(a.latency).map(([r, ms]) => (
                    <span
                      key={r}
                      className={`text-[9px] px-1 rounded ${
                        ms < 200
                          ? "text-[var(--green)] bg-[var(--green)]/10"
                          : ms < 500
                          ? "text-[var(--amber)] bg-[var(--amber)]/10"
                          : "text-[var(--red)] bg-[var(--red)]/10"
                      }`}
                    >
                      {r}:{ms}ms
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

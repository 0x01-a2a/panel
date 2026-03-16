"use client";
import type { Agent, BountyHistoryEntry, ActivityEvent } from "@/app/lib/types";
import { exportJson, exportCsv } from "@/app/lib/storage";

export function ExportPanel({
  agents,
  history,
  activity,
}: {
  agents: Agent[];
  history: BountyHistoryEntry[];
  activity: ActivityEvent[];
}) {
  return (
    <div className="border border-[var(--border)] rounded p-4">
      <h3 className="text-[10px] tracking-[3px] text-[var(--sub)] mb-3">
        DATA EXPORT
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {/* Agents */}
        <div className="border border-[var(--border)] rounded p-3">
          <div className="text-[12px] text-[var(--text)] mb-1">
            Agents ({agents.length})
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                exportJson(agents, `agents-${Date.now()}.json`)
              }
              className="text-[9px] tracking-[1px] px-2 py-1 border border-[var(--border)] rounded text-[var(--sub)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
            >
              JSON
            </button>
            <button
              onClick={() =>
                exportCsv(
                  agents,
                  [
                    "agent_id",
                    "name",
                    "average_score",
                    "feedback_count",
                    "positive_count",
                    "negative_count",
                    "last_seen",
                    "country",
                    "city",
                  ],
                  `agents-${Date.now()}.csv`
                )
              }
              className="text-[9px] tracking-[1px] px-2 py-1 border border-[var(--border)] rounded text-[var(--sub)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
            >
              CSV
            </button>
          </div>
        </div>

        {/* Bounty History */}
        <div className="border border-[var(--border)] rounded p-3">
          <div className="text-[12px] text-[var(--text)] mb-1">
            Bounties ({history.length})
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                exportJson(history, `bounties-${Date.now()}.json`)
              }
              className="text-[9px] tracking-[1px] px-2 py-1 border border-[var(--border)] rounded text-[var(--sub)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
            >
              JSON
            </button>
            <button
              onClick={() =>
                exportCsv(
                  history,
                  [
                    "conversationId",
                    "recipient",
                    "recipientName",
                    "message",
                    "amountUsdc",
                    "sentAt",
                    "sentFrom",
                    "status",
                  ],
                  `bounties-${Date.now()}.csv`
                )
              }
              className="text-[9px] tracking-[1px] px-2 py-1 border border-[var(--border)] rounded text-[var(--sub)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
            >
              CSV
            </button>
          </div>
        </div>

        {/* Activity */}
        <div className="border border-[var(--border)] rounded p-3">
          <div className="text-[12px] text-[var(--text)] mb-1">
            Activity ({activity.length})
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                exportJson(activity, `activity-${Date.now()}.json`)
              }
              className="text-[9px] tracking-[1px] px-2 py-1 border border-[var(--border)] rounded text-[var(--sub)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
            >
              JSON
            </button>
            <button
              onClick={() =>
                exportCsv(
                  activity.map((e) => ({
                    id: e.id,
                    event_type: e.event_type,
                    agent_id: e.agent_id,
                    name: e.name || "",
                    target_id: e.target_id || "",
                    target_name: e.target_name || "",
                    score: e.score ?? "",
                    ts: e.ts,
                  })),
                  [
                    "id",
                    "event_type",
                    "agent_id",
                    "name",
                    "target_id",
                    "target_name",
                    "score",
                    "ts",
                  ],
                  `activity-${Date.now()}.csv`
                )
              }
              className="text-[9px] tracking-[1px] px-2 py-1 border border-[var(--border)] rounded text-[var(--sub)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
            >
              CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

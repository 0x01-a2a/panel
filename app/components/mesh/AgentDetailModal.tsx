"use client";
import type { Agent, ActivityEvent, BountyHistoryEntry } from "@/app/lib/types";
import { shortId, timeAgo, MSG_COLORS } from "@/app/lib/types";
import { Modal } from "../shared/Modal";
import { CopyButton } from "../shared/CopyButton";

export function AgentDetailModal({
  agent,
  onClose,
  activity,
  bountyHistory,
}: {
  agent: Agent | null;
  onClose: () => void;
  activity: ActivityEvent[];
  bountyHistory: BountyHistoryEntry[];
}) {
  if (!agent) return null;

  const agentActivity = activity.filter(
    (e) =>
      e.agent_id === agent.agent_id ||
      e.target_id === agent.agent_id
  ).slice(0, 30);

  const agentBounties = bountyHistory.filter(
    (h) => h.recipient === agent.agent_id
  );

  const now = Date.now() / 1000;
  const isOnline = now - agent.last_seen < 120;

  return (
    <Modal open={!!agent} onClose={onClose} title="AGENT DETAIL" wide>
      <div className="space-y-5">
        {/* Identity */}
        <div className="flex items-start gap-4">
          <div
            className={`w-3 h-3 rounded-full mt-1 ${
              isOnline ? "bg-[var(--green)]" : "bg-[var(--dim)]"
            }`}
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[14px] font-bold text-[var(--text)]">
                {agent.name}
              </span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded ${
                  isOnline
                    ? "bg-[var(--green)]/10 text-[var(--green)]"
                    : "bg-[var(--dim)]/20 text-[var(--sub)]"
                }`}
              >
                {isOnline ? "ONLINE" : `LAST SEEN ${timeAgo(agent.last_seen)}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-[10px] text-[var(--sub)] break-all">
                {agent.agent_id}
              </code>
              <CopyButton text={agent.agent_id} />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3">
          <StatBox label="AVG SCORE" value={agent.average_score.toFixed(1)} color={agent.average_score > 0 ? "var(--green)" : agent.average_score < 0 ? "var(--red)" : "var(--sub)"} />
          <StatBox label="FEEDBACK" value={String(agent.feedback_count)} color="var(--text)" />
          <StatBox label="POSITIVE" value={String(agent.positive_count)} color="var(--green)" />
          <StatBox label="NEGATIVE" value={String(agent.negative_count)} color="var(--red)" />
        </div>

        {/* Geo + Latency */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-[var(--border)] rounded p-3">
            <h4 className="text-[9px] tracking-[2px] text-[var(--sub)] mb-2">LOCATION</h4>
            {agent.country ? (
              <div className="space-y-1">
                <div className="text-[12px] text-[var(--text)]">
                  {agent.country}{agent.city ? ` / ${agent.city}` : ""}
                </div>
                {agent.geo_consistent !== undefined && (
                  <span className={`text-[9px] px-2 py-0.5 rounded ${
                    agent.geo_consistent
                      ? "bg-[var(--green)]/10 text-[var(--green)]"
                      : "bg-[var(--red)]/10 text-[var(--red)]"
                  }`}>
                    {agent.geo_consistent ? "GEO VERIFIED" : "GEO MISMATCH"}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-[var(--dim)]">No geo data</span>
            )}
          </div>
          <div className="border border-[var(--border)] rounded p-3">
            <h4 className="text-[9px] tracking-[2px] text-[var(--sub)] mb-2">LATENCY</h4>
            {agent.latency && Object.keys(agent.latency).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(agent.latency).map(([region, ms]) => (
                  <span
                    key={region}
                    className={`text-[10px] px-2 py-1 rounded border ${
                      ms < 200
                        ? "border-[var(--green)]/30 text-[var(--green)]"
                        : ms < 500
                        ? "border-[var(--amber)]/30 text-[var(--amber)]"
                        : "border-[var(--red)]/30 text-[var(--red)]"
                    }`}
                  >
                    {region}: {ms}ms
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-[var(--dim)]">No latency data</span>
            )}
          </div>
        </div>

        {/* Bounty history with this agent */}
        {agentBounties.length > 0 && (
          <div>
            <h4 className="text-[9px] tracking-[2px] text-[var(--sub)] mb-2">
              BOUNTY HISTORY ({agentBounties.length})
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {agentBounties.map((h) => (
                <div
                  key={h.conversationId}
                  className="flex items-center gap-3 px-2 py-1 text-[10px] border border-[var(--border)] rounded"
                >
                  <span className={`w-20 tracking-[1px] ${
                    h.status === "delivered" ? "text-blue-400"
                    : h.status === "accepted" ? "text-[var(--green)]"
                    : h.status === "rejected" ? "text-[var(--red)]"
                    : "text-[var(--amber)]"
                  }`}>
                    {h.status.toUpperCase()}
                  </span>
                  <span className="text-[var(--dim)] flex-1 truncate">
                    {h.message.slice(0, 60)}
                  </span>
                  <span className="text-[var(--green)]">${h.amountUsdc.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {agentActivity.length > 0 && (
          <div>
            <h4 className="text-[9px] tracking-[2px] text-[var(--sub)] mb-2">
              RECENT ACTIVITY ({agentActivity.length})
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {agentActivity.map((ev) => {
                const color = MSG_COLORS[ev.event_type] || "text-[var(--sub)]";
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 px-2 py-1 text-[10px] border border-[var(--border)] rounded"
                  >
                    <span className={`w-16 tracking-[1px] font-bold ${color}`}>
                      {ev.event_type}
                    </span>
                    <span className="text-[var(--dim)] flex-1 truncate">
                      {ev.target_id ? `-> ${ev.target_name || shortId(ev.target_id)}` : ""}
                      {ev.score != null ? ` score:${ev.score}` : ""}
                    </span>
                    <span className="text-[var(--dim)]">{timeAgo(ev.ts)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border border-[var(--border)] rounded p-3 text-center">
      <div className="text-[20px] font-bold" style={{ color }}>{value}</div>
      <div className="text-[8px] tracking-[2px] text-[var(--sub)]">{label}</div>
    </div>
  );
}

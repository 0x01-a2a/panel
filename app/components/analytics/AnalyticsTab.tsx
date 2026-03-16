"use client";
import type { Agent, BountyHistoryEntry, InboxEnvelope, NodeHealthStatus } from "@/app/lib/types";

export function AnalyticsTab({
  history,
  agents,
  envelopes,
  nodes,
  onlineAgentCount,
  recentAgentCount,
}: {
  history: BountyHistoryEntry[];
  agents: Agent[];
  envelopes: InboxEnvelope[];
  nodes: NodeHealthStatus[];
  onlineAgentCount: number;
  recentAgentCount: number;
}) {
  const proposed = history.length;
  const accepted = history.filter((h) => h.status === "accepted" || h.status === "delivered" || h.status === "feedback_sent").length;
  const delivered = history.filter((h) => h.status === "delivered" || h.status === "feedback_sent").length;
  const rejected = history.filter((h) => h.status === "rejected").length;
  const feedbackSent = history.filter((h) => h.status === "feedback_sent").length;
  const totalUsdc = history.reduce((s, h) => s + h.amountUsdc, 0);
  const nodesOnline = nodes.filter((n) => n.online).length;

  // Top agents by feedback
  const topAgents = [...agents]
    .sort((a, b) => b.average_score - a.average_score)
    .slice(0, 5);

  // Geo distribution
  const geoMap = new Map<string, number>();
  for (const a of agents) {
    const key = a.country || "Unknown";
    geoMap.set(key, (geoMap.get(key) || 0) + 1);
  }
  const geoEntries = [...geoMap.entries()].sort((a, b) => b[1] - a[1]);

  // Envelope type distribution
  const envTypes = new Map<string, number>();
  for (const e of envelopes) {
    envTypes.set(e.msg_type, (envTypes.get(e.msg_type) || 0) + 1);
  }

  return (
    <div className="space-y-5">
      {/* Bounty pipeline */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "PROPOSED", value: proposed, color: "var(--green)" },
          { label: "ACCEPTED", value: accepted, color: "var(--amber)" },
          { label: "DELIVERED", value: delivered, color: "#2979ff" },
          { label: "REJECTED", value: rejected, color: "var(--red)" },
          { label: "FEEDBACK", value: feedbackSent, color: "#ab47bc" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-[var(--border)] rounded p-4 text-center"
          >
            <div className="text-[28px] font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-[9px] tracking-[2px] text-[var(--sub)]">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Row: mesh + nodes + budget */}
      <div className="grid grid-cols-3 gap-4">
        {/* Mesh health */}
        <div className="border border-[var(--border)] rounded p-4">
          <h3 className="text-[10px] tracking-[3px] text-[var(--sub)] mb-3">
            MESH HEALTH
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[10px] text-[var(--sub)]">Online</span>
              <span className="text-[14px] font-bold text-[var(--green)]">
                {onlineAgentCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-[var(--sub)]">Recent (&lt;5m)</span>
              <span className="text-[14px] font-bold text-[var(--amber)]">
                {recentAgentCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-[var(--sub)]">Total</span>
              <span className="text-[14px] font-bold text-[var(--text)]">
                {agents.length}
              </span>
            </div>
          </div>
        </div>

        {/* Node health */}
        <div className="border border-[var(--border)] rounded p-4">
          <h3 className="text-[10px] tracking-[3px] text-[var(--sub)] mb-3">
            BOOTSTRAP NODES
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[10px] text-[var(--sub)]">Online</span>
              <span className="text-[14px] font-bold text-[var(--green)]">
                {nodesOnline}/{nodes.length}
              </span>
            </div>
            {nodes.map((n) => (
              <div key={n.nodeId} className="flex justify-between">
                <span className="text-[10px] text-[var(--sub)]">{n.label}</span>
                <span
                  className={`text-[10px] font-bold ${
                    n.online ? "text-[var(--green)]" : "text-[var(--red)]"
                  }`}
                >
                  {n.online ? `${n.rttMs}ms` : "DOWN"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="border border-[var(--border)] rounded p-4">
          <h3 className="text-[10px] tracking-[3px] text-[var(--sub)] mb-3">
            BOUNTY BUDGET
          </h3>
          <div className="text-[24px] font-bold text-[var(--green)]">
            ${totalUsdc.toFixed(2)}
          </div>
          <div className="text-[10px] text-[var(--sub)] mt-1">USDC proposed</div>
          <div className="text-[10px] text-[var(--sub)] mt-1">
            Accept rate:{" "}
            {proposed > 0
              ? `${((accepted / proposed) * 100).toFixed(0)}%`
              : "---"}
          </div>
          <div className="text-[10px] text-[var(--sub)]">
            Delivery rate:{" "}
            {accepted > 0
              ? `${((delivered / accepted) * 100).toFixed(0)}%`
              : "---"}
          </div>
        </div>
      </div>

      {/* Row: top agents + geo + envelope types */}
      <div className="grid grid-cols-3 gap-4">
        {/* Top agents */}
        <div className="border border-[var(--border)] rounded p-4">
          <h3 className="text-[10px] tracking-[3px] text-[var(--sub)] mb-3">
            TOP AGENTS
          </h3>
          <div className="space-y-1">
            {topAgents.map((a, i) => (
              <div key={a.agent_id} className="flex items-center gap-2 text-[10px]">
                <span className="text-[var(--dim)] w-4">{i + 1}.</span>
                <span className="text-[var(--text)] flex-1 truncate">{a.name}</span>
                <span
                  className={`font-bold ${
                    a.average_score > 0
                      ? "text-[var(--green)]"
                      : a.average_score < 0
                      ? "text-[var(--red)]"
                      : "text-[var(--sub)]"
                  }`}
                >
                  {a.average_score.toFixed(1)}
                </span>
                <span className="text-[var(--dim)]">{a.feedback_count}fb</span>
              </div>
            ))}
          </div>
        </div>

        {/* Geo distribution */}
        <div className="border border-[var(--border)] rounded p-4">
          <h3 className="text-[10px] tracking-[3px] text-[var(--sub)] mb-3">
            GEO DISTRIBUTION
          </h3>
          <div className="space-y-1">
            {geoEntries.slice(0, 8).map(([country, count]) => (
              <div key={country} className="flex items-center gap-2 text-[10px]">
                <span className="text-[var(--text)] flex-1">{country}</span>
                <div className="flex-1 h-1 bg-[var(--border)] rounded overflow-hidden">
                  <div
                    className="h-full bg-[var(--green)] rounded"
                    style={{
                      width: `${(count / agents.length) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[var(--sub)] w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Envelope types */}
        <div className="border border-[var(--border)] rounded p-4">
          <h3 className="text-[10px] tracking-[3px] text-[var(--sub)] mb-3">
            ENVELOPE TYPES
          </h3>
          <div className="space-y-1">
            {[...envTypes.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2 text-[10px]">
                <span className="text-[var(--text)] w-20">{type}</span>
                <div className="flex-1 h-1 bg-[var(--border)] rounded overflow-hidden">
                  <div
                    className="h-full bg-[var(--amber)] rounded"
                    style={{
                      width: `${(count / envelopes.length) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[var(--sub)] w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

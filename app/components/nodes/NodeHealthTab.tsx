"use client";
import type { NodeHealthStatus } from "@/app/lib/types";

export function NodeHealthTab({
  nodes,
  onlineCount,
  pingAll,
}: {
  nodes: NodeHealthStatus[];
  onlineCount: number;
  pingAll: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex gap-6">
          <div>
            <span className="text-[20px] font-bold text-[var(--green)]">
              {onlineCount}
            </span>
            <span className="text-[10px] tracking-[2px] text-[var(--sub)] ml-2">
              / {nodes.length} NODES ONLINE
            </span>
          </div>
        </div>
        <button
          onClick={pingAll}
          className="text-[10px] tracking-[2px] px-4 py-2 border border-[var(--border)] rounded text-[var(--sub)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
        >
          PING ALL
        </button>
      </div>

      {/* Node cards */}
      <div className="grid grid-cols-2 gap-4">
        {nodes.map((node) => (
          <NodeCard key={node.nodeId} node={node} />
        ))}
      </div>
    </div>
  );
}

function NodeCard({ node }: { node: NodeHealthStatus }) {
  const rttColor =
    node.rttMs === null
      ? "var(--dim)"
      : node.rttMs < 200
      ? "var(--green)"
      : node.rttMs < 500
      ? "var(--amber)"
      : "var(--red)";

  return (
    <div
      className={`border rounded p-4 transition-colors ${
        node.online
          ? "border-[var(--green)]/30 bg-[var(--green)]/5"
          : "border-[var(--red)]/30 bg-[var(--red)]/5"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            node.online ? "bg-[var(--green)] animate-pulse" : "bg-[var(--red)]"
          }`}
        />
        <span className="text-[13px] font-bold text-[var(--text)]">
          {node.label}
        </span>
        <span className="text-[10px] text-[var(--dim)]">{node.region}</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-[10px] text-[var(--sub)]">IP</span>
          <code className="text-[10px] text-[var(--text)]">{node.ip}</code>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-[var(--sub)]">STATUS</span>
          <span
            className={`text-[10px] font-bold ${
              node.online ? "text-[var(--green)]" : "text-[var(--red)]"
            }`}
          >
            {node.online ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-[var(--sub)]">RTT</span>
          <span className="text-[10px] font-bold" style={{ color: rttColor }}>
            {node.rttMs !== null ? `${node.rttMs}ms` : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-[var(--sub)]">API</span>
          <span
            className={`text-[10px] ${
              node.hasApi ? "text-[var(--green)]" : "text-[var(--dim)]"
            }`}
          >
            {node.hasApi ? "REST API" : "RELAY ONLY"}
          </span>
        </div>
        {node.consecutiveFailures > 0 && (
          <div className="flex justify-between">
            <span className="text-[10px] text-[var(--sub)]">FAILURES</span>
            <span className="text-[10px] text-[var(--red)]">
              {node.consecutiveFailures} consecutive
            </span>
          </div>
        )}
        {node.lastChecked > 0 && (
          <div className="flex justify-between">
            <span className="text-[10px] text-[var(--sub)]">LAST CHECK</span>
            <span className="text-[10px] text-[var(--dim)]">
              {Math.round((Date.now() - node.lastChecked) / 1000)}s ago
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

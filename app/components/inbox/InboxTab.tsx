"use client";
import { useState, useCallback } from "react";
import type { Agent, BountySubmission, InboxEnvelope, BountyHistoryEntry } from "@/app/lib/types";
import { NODES, shortId, timeAgo, decodePayload, MSG_COLORS } from "@/app/lib/types";
import { sendEnvelopeViaNode } from "@/app/lib/api";
import { DeliverViewer } from "./DeliverViewer";

export function InboxTab({
  envelopes,
  secrets,
  history,
  agents,
  updateBountyStatus,
  updateSubmissionStatus,
  clear,
}: {
  envelopes: InboxEnvelope[];
  secrets: Record<string, string>;
  history: BountyHistoryEntry[];
  agents: Agent[];
  updateBountyStatus: (convId: string, status: BountyHistoryEntry["status"]) => void;
  updateSubmissionStatus: (convId: string, agentId: string, status: BountySubmission["status"]) => void;
  clear: () => void;
}) {
  const [filter, setFilter] = useState<"all" | string>("all");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleFeedback = useCallback(
    async (env: InboxEnvelope, score: number, outcome: string) => {
      const node = NODES.find((n) => n.nodeUrl && secrets[n.id]);
      if (!node?.nodeUrl) return;
      const ok = await sendEnvelopeViaNode(
        node.nodeUrl,
        secrets[node.id],
        "FEEDBACK",
        env.sender,
        env.conversation_id,
        btoa(JSON.stringify({ score, outcome }))
      );
      if (ok) {
        updateBountyStatus(env.conversation_id, "feedback_sent");
        updateSubmissionStatus(env.conversation_id, env.sender, "feedback_sent");
      }
    },
    [secrets, updateBountyStatus, updateSubmissionStatus]
  );

  const msgTypes = Array.from(new Set(envelopes.map((e) => e.msg_type)));
  const filtered = filter === "all" ? envelopes : envelopes.filter((e) => e.msg_type === filter);

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`text-[9px] tracking-[1px] px-2 py-1 border rounded transition-colors ${
              filter === "all"
                ? "border-[var(--green)] text-[var(--green)]"
                : "border-[var(--border)] text-[var(--dim)]"
            }`}
          >
            ALL ({envelopes.length})
          </button>
          {msgTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-[9px] tracking-[1px] px-2 py-1 border rounded transition-colors ${
                filter === t
                  ? "border-[var(--green)] text-[var(--green)]"
                  : "border-[var(--border)] text-[var(--dim)]"
              }`}
            >
              {t} ({envelopes.filter((e) => e.msg_type === t).length})
            </button>
          ))}
        </div>
        {envelopes.length > 0 && (
          <button
            onClick={clear}
            className="text-[9px] tracking-[1px] px-2 py-1 border border-[var(--red)]/30 rounded text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Envelope list */}
      <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--sub)] text-[12px]">
              Listening for incoming envelopes...
            </p>
            <p className="text-[var(--dim)] text-[10px] mt-1">
              ACCEPT, DELIVER, REJECT from agents will appear here
            </p>
          </div>
        )}
        {filtered.map((env, i) => {
          const color = MSG_COLORS[env.msg_type] || "text-[var(--text)]";
          const matchingBounty = history.find(
            (h) => h.conversationId === env.conversation_id
          );
          const isExpanded = expandedIdx === i;

          return (
            <div
              key={`${env.conversation_id}-${i}`}
              className="border border-[var(--border)] rounded p-3 hover:border-[var(--dim)] transition-colors"
            >
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
              >
                <span className={`text-[10px] tracking-[2px] font-bold ${color}`}>
                  {env.msg_type}
                </span>
                <span className="text-[10px] text-[var(--sub)]">
                  {agents.find(a => a.agent_id === env.sender)?.name ?? shortId(env.sender)}
                </span>
                <span className="text-[10px] text-[var(--dim)]">
                  conv:{shortId(env.conversation_id)}
                </span>
                {matchingBounty && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-[var(--green)]/10 text-[var(--green)]">
                    {matchingBounty.message.slice(0, 30)}
                  </span>
                )}
                {env.received_at && (
                  <span className="text-[9px] text-[var(--dim)] ml-auto">
                    {timeAgo(env.received_at / 1000)}
                  </span>
                )}
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="mt-2 pt-2 border-t border-[var(--border)]">
                  {env.msg_type === "DELIVER" ? (
                    <DeliverViewer payloadB64={env.payload_b64} />
                  ) : (
                    (() => {
                      const payload = decodePayload(env.payload_b64);
                      return payload ? (
                        <pre className="text-[10px] text-[var(--dim)] max-h-32 overflow-y-auto bg-[var(--bg)] rounded p-2">
                          {typeof payload === "string"
                            ? payload
                            : JSON.stringify(payload, null, 2)}
                        </pre>
                      ) : null;
                    })()
                  )}
                </div>
              )}

              {/* Action buttons for DELIVER */}
              {env.msg_type === "DELIVER" && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleFeedback(env, 100, "positive")}
                    className="text-[9px] tracking-[2px] px-3 py-1 border border-[var(--green)] text-[var(--green)] rounded hover:bg-[var(--green)]/10 transition-colors"
                  >
                    APPROVE (+100)
                  </button>
                  <button
                    onClick={() => handleFeedback(env, 50, "neutral")}
                    className="text-[9px] tracking-[2px] px-3 py-1 border border-[var(--amber)] text-[var(--amber)] rounded hover:bg-[var(--amber)]/10 transition-colors"
                  >
                    PARTIAL (+50)
                  </button>
                  <button
                    onClick={() => handleFeedback(env, -100, "negative")}
                    className="text-[9px] tracking-[2px] px-3 py-1 border border-[var(--red)] text-[var(--red)] rounded hover:bg-[var(--red)]/10 transition-colors"
                  >
                    REJECT (-100)
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

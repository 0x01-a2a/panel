"use client";
import { useCallback } from "react";
import type { Agent, BountyHistoryEntry, BountySubmission } from "@/app/lib/types";
import { shortId, timeAgo, decodePayload } from "@/app/lib/types";
import { NODES } from "@/app/lib/types";
import { sendEnvelopeViaNode } from "@/app/lib/api";
import { Modal } from "../shared/Modal";
import { CopyButton } from "../shared/CopyButton";
import { DeliverViewer } from "../inbox/DeliverViewer";

interface EnvelopeData {
  msg_type: string;
  sender: string;
  conversation_id: string;
  payload_b64: string;
}

const STATUS_COLOR: Record<string, string> = {
  accepted: "text-[var(--amber)]",
  delivered: "text-blue-400",
  rejected: "text-[var(--red)]",
  feedback_sent: "text-purple-400",
};

const STATUS_BORDER: Record<string, string> = {
  accepted: "border-[var(--amber)]/40",
  delivered: "border-blue-400/40",
  rejected: "border-[var(--red)]/40",
  feedback_sent: "border-purple-400/40",
};

// ── Submission card (for broadcast bounties) ─────────────────────────────────

function SubmissionCard({
  sub,
  agents,
  envelopes,
  conversationId,
  secrets,
  onFeedbackSent,
}: {
  sub: BountySubmission;
  agents: Agent[];
  envelopes: EnvelopeData[];
  conversationId: string;
  secrets: Record<string, string>;
  onFeedbackSent: (agentId: string) => void;
}) {
  const name = agents.find(a => a.agent_id === sub.agentId)?.name ?? shortId(sub.agentId);
  const deliverEnv = envelopes.find(
    e => e.sender === sub.agentId && e.msg_type === "DELIVER" && e.conversation_id === conversationId
  );
  const payload = deliverEnv ? deliverEnv.payload_b64 : sub.payloadB64;

  const sendFeedback = useCallback(async (score: number, outcome: string) => {
    const node = NODES.find(n => n.nodeUrl && secrets[n.id]);
    if (!node?.nodeUrl) return;
    const ok = await sendEnvelopeViaNode(
      node.nodeUrl,
      secrets[node.id],
      "FEEDBACK",
      sub.agentId,
      conversationId,
      btoa(JSON.stringify({ score, outcome }))
    );
    if (ok) onFeedbackSent(sub.agentId);
  }, [sub.agentId, conversationId, secrets, onFeedbackSent]);

  return (
    <div className={`border rounded p-3 space-y-2 ${STATUS_BORDER[sub.status] ?? "border-[var(--border)]"}`}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-[var(--text)]">{name}</span>
        <span className="text-[9px] text-[var(--dim)]">{shortId(sub.agentId)}</span>
        <span className={`ml-auto text-[10px] font-bold tracking-[1px] ${STATUS_COLOR[sub.status] ?? "text-[var(--sub)]"}`}>
          {sub.status.toUpperCase().replace("_", " ")}
        </span>
        <span className="text-[9px] text-[var(--dim)]">{timeAgo(sub.receivedAt / 1000)}</span>
      </div>

      {/* Deliver payload */}
      {(sub.status === "delivered" || sub.status === "feedback_sent") && payload && (
        <div className="pt-1">
          <DeliverViewer payloadB64={payload} />
        </div>
      )}

      {/* Feedback actions */}
      {sub.status === "delivered" && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => sendFeedback(100, "positive")}
            className="text-[9px] tracking-[2px] px-3 py-1 border border-[var(--green)] text-[var(--green)] rounded hover:bg-[var(--green)]/10 transition-colors"
          >
            APPROVE +100
          </button>
          <button
            onClick={() => sendFeedback(50, "partial")}
            className="text-[9px] tracking-[2px] px-3 py-1 border border-[var(--amber)] text-[var(--amber)] rounded hover:bg-[var(--amber)]/10 transition-colors"
          >
            PARTIAL +50
          </button>
          <button
            onClick={() => sendFeedback(-100, "negative")}
            className="text-[9px] tracking-[2px] px-3 py-1 border border-[var(--red)] text-[var(--red)] rounded hover:bg-[var(--red)]/10 transition-colors"
          >
            REJECT −100
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ConversationThread({
  conversationId,
  history,
  envelopes,
  agents,
  secrets,
  onFeedbackSent,
  onClose,
}: {
  conversationId: string;
  history: BountyHistoryEntry[];
  envelopes: EnvelopeData[];
  agents: Agent[];
  secrets: Record<string, string>;
  onFeedbackSent: (conversationId: string, agentId: string) => void;
  onClose: () => void;
}) {
  const bounty = history.find(h => h.conversationId === conversationId);
  const isBroadcast = bounty?.recipient === "broadcast";
  const submissions = bounty?.submissions ?? [];

  // For direct PROPOSE: show classic timeline
  const convEnvelopes = envelopes.filter(e => e.conversation_id === conversationId);

  const deliveredCount = submissions.filter(s => s.status === "delivered" || s.status === "feedback_sent").length;
  const acceptedCount = submissions.filter(s => s.status === "accepted").length;
  const rejectedCount = submissions.filter(s => s.status === "rejected").length;
  const feedbackSentCount = submissions.filter(s => s.status === "feedback_sent").length;
  const pendingFeedback = submissions.filter(s => s.status === "delivered").length;

  return (
    <Modal open={true} onClose={onClose} title="CONVERSATION THREAD" wide>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <code className="text-[10px] text-[var(--sub)] break-all">{conversationId}</code>
          <CopyButton text={conversationId} />
        </div>

        {bounty && (
          <div className={`grid gap-3 text-center ${isBroadcast ? "grid-cols-5" : "grid-cols-3"}`}>
            <div className="border border-[var(--border)] rounded p-2">
              <div className="text-[14px] font-bold text-[var(--green)]">${bounty.amountUsdc.toFixed(2)}</div>
              <div className="text-[8px] tracking-[2px] text-[var(--sub)]">REWARD</div>
            </div>
            <div className="border border-[var(--border)] rounded p-2">
              <div className="text-[12px] font-bold text-[var(--text)] truncate">{bounty.recipientName}</div>
              <div className="text-[8px] tracking-[2px] text-[var(--sub)]">{isBroadcast ? "BROADCAST" : "RECIPIENT"}</div>
            </div>
            {isBroadcast ? (
              <>
                <div className="border border-[var(--amber)]/40 rounded p-2">
                  <div className="text-[14px] font-bold text-[var(--amber)]">{acceptedCount}</div>
                  <div className="text-[8px] tracking-[2px] text-[var(--sub)]">ACCEPTED</div>
                </div>
                <div className="border border-blue-400/40 rounded p-2">
                  <div className="text-[14px] font-bold text-blue-400">{deliveredCount}</div>
                  <div className="text-[8px] tracking-[2px] text-[var(--sub)]">DELIVERED</div>
                </div>
                <div className={`border rounded p-2 ${pendingFeedback > 0 ? "border-[var(--green)]/60 animate-pulse" : "border-purple-400/40"}`}>
                  <div className="text-[14px] font-bold text-purple-400">{feedbackSentCount}/{deliveredCount || 1}</div>
                  <div className="text-[8px] tracking-[2px] text-[var(--sub)]">REVIEWED</div>
                </div>
              </>
            ) : (
              <div className="border border-[var(--border)] rounded p-2">
                <div className={`text-[12px] font-bold ${
                  bounty.status === "delivered" ? "text-blue-400"
                  : bounty.status === "accepted" ? "text-[var(--green)]"
                  : bounty.status === "rejected" ? "text-[var(--red)]"
                  : bounty.status === "feedback_sent" ? "text-purple-400"
                  : "text-[var(--amber)]"
                }`}>
                  {bounty.status.toUpperCase()}
                </div>
                <div className="text-[8px] tracking-[2px] text-[var(--sub)]">STATUS</div>
              </div>
            )}
          </div>
        )}

        {/* Task description */}
        {bounty && (
          <p className="text-[11px] text-[var(--sub)] border border-[var(--border)] rounded p-2">
            {bounty.message}
          </p>
        )}

        {/* Broadcast: submissions grid */}
        {isBroadcast && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] tracking-[3px] text-[var(--sub)]">
                SUBMISSIONS ({submissions.length})
              </span>
              {pendingFeedback > 0 && (
                <span className="text-[9px] text-[var(--green)] animate-pulse">
                  {pendingFeedback} awaiting review
                </span>
              )}
            </div>
            {submissions.length === 0 ? (
              <p className="text-[11px] text-[var(--dim)] text-center py-4">
                No responses yet — waiting for agents to accept/deliver.
              </p>
            ) : (
              // Sort: delivered first (needs review), then accepted, then rest
              [...submissions]
                .sort((a, b) => {
                  const order = { delivered: 0, accepted: 1, feedback_sent: 2, rejected: 3 };
                  return (order[a.status] ?? 9) - (order[b.status] ?? 9);
                })
                .map(sub => (
                  <SubmissionCard
                    key={sub.agentId}
                    sub={sub}
                    agents={agents}
                    envelopes={convEnvelopes}
                    conversationId={conversationId}
                    secrets={secrets}
                    onFeedbackSent={(agentId) => onFeedbackSent(conversationId, agentId)}
                  />
                ))
            )}
          </div>
        )}

        {/* Direct PROPOSE: classic timeline */}
        {!isBroadcast && (
          <div className="space-y-0">
            {bounty && (
              <div className="border-l-2 border-[var(--green)] pl-4 py-3 relative">
                <div className="absolute -left-[5px] top-4 w-2 h-2 rounded-full bg-[var(--green)]" />
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] tracking-[2px] font-bold text-[var(--green)]">PROPOSE</span>
                  <span className="text-[9px] text-[var(--dim)]">from ADMIN · {timeAgo(bounty.sentAt / 1000)}</span>
                </div>
                <pre className="text-[10px] text-[var(--dim)] bg-[var(--bg)] rounded p-2">
                  {JSON.stringify({ message: bounty.message, amount_usdc: bounty.amountUsdc }, null, 2)}
                </pre>
              </div>
            )}
            {convEnvelopes.map((env, i) => {
              const colors: Record<string, string> = {
                ACCEPT: "border-[var(--amber)] text-[var(--amber)] bg-[var(--amber)]",
                DELIVER: "border-blue-400 text-blue-400 bg-blue-400",
                FEEDBACK: "border-purple-400 text-purple-400 bg-purple-400",
                REJECT: "border-[var(--red)] text-[var(--red)] bg-[var(--red)]",
              };
              const c = colors[env.msg_type] ?? "border-[var(--dim)] text-[var(--sub)] bg-[var(--dim)]";
              const [borderC, textC, bgC] = c.split(" ");
              return (
                <div key={i} className={`border-l-2 ${borderC} pl-4 py-3 relative`}>
                  <div className={`absolute -left-[5px] top-4 w-2 h-2 rounded-full ${bgC}`} />
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] tracking-[2px] font-bold ${textC}`}>{env.msg_type}</span>
                    <span className="text-[9px] text-[var(--dim)]">
                      from {agents.find(a => a.agent_id === env.sender)?.name ?? shortId(env.sender)}
                    </span>
                  </div>
                  {env.msg_type === "DELIVER" ? (
                    <DeliverViewer payloadB64={env.payload_b64} />
                  ) : (
                    (() => {
                      const p = decodePayload(env.payload_b64);
                      return p ? (
                        <pre className="text-[10px] text-[var(--dim)] max-h-32 overflow-y-auto bg-[var(--bg)] rounded p-2">
                          {typeof p === "string" ? p : JSON.stringify(p, null, 2)}
                        </pre>
                      ) : null;
                    })()
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Rejected count for broadcast */}
        {isBroadcast && rejectedCount > 0 && (
          <p className="text-[9px] text-[var(--dim)] text-right">{rejectedCount} agent{rejectedCount !== 1 ? "s" : ""} rejected</p>
        )}
      </div>
    </Modal>
  );
}

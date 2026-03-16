"use client";
import type { BountyHistoryEntry } from "@/app/lib/types";
import { shortId, timeAgo, decodePayload } from "@/app/lib/types";
import { Modal } from "../shared/Modal";
import { CopyButton } from "../shared/CopyButton";
import { DeliverViewer } from "../inbox/DeliverViewer";

interface EnvelopeData {
  msg_type: string;
  sender: string;
  conversation_id: string;
  payload_b64: string;
}

export function ConversationThread({
  conversationId,
  history,
  envelopes,
  onClose,
}: {
  conversationId: string;
  history: BountyHistoryEntry[];
  envelopes: EnvelopeData[];
  onClose: () => void;
}) {
  const bounty = history.find((h) => h.conversationId === conversationId);
  const convEnvelopes = envelopes.filter((e) => e.conversation_id === conversationId);

  const steps: {
    type: string;
    timestamp: number;
    from: string;
    payload?: ReturnType<typeof decodePayload>;
    raw?: string;
  }[] = [];

  // Add the initial PROPOSE from us
  if (bounty) {
    steps.push({
      type: "PROPOSE",
      timestamp: bounty.sentAt,
      from: "admin",
      payload: { message: bounty.message, amount_usdc: bounty.amountUsdc },
    });
  }

  // Add envelopes in order
  for (const env of convEnvelopes) {
    steps.push({
      type: env.msg_type,
      timestamp: 0, // we don't have timestamps for these
      from: env.sender,
      payload: decodePayload(env.payload_b64),
      raw: env.payload_b64,
    });
  }

  const statusColors: Record<string, string> = {
    PROPOSE: "border-[var(--green)]",
    ACCEPT: "border-[var(--amber)]",
    DELIVER: "border-blue-400",
    FEEDBACK: "border-purple-400",
    REJECT: "border-[var(--red)]",
  };

  const textColors: Record<string, string> = {
    PROPOSE: "text-[var(--green)]",
    ACCEPT: "text-[var(--amber)]",
    DELIVER: "text-blue-400",
    FEEDBACK: "text-purple-400",
    REJECT: "text-[var(--red)]",
  };

  return (
    <Modal open={true} onClose={onClose} title="CONVERSATION THREAD" wide>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <code className="text-[10px] text-[var(--sub)] break-all">
            {conversationId}
          </code>
          <CopyButton text={conversationId} />
        </div>

        {bounty && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="border border-[var(--border)] rounded p-2">
              <div className="text-[14px] font-bold text-[var(--green)]">
                ${bounty.amountUsdc.toFixed(2)}
              </div>
              <div className="text-[8px] tracking-[2px] text-[var(--sub)]">REWARD</div>
            </div>
            <div className="border border-[var(--border)] rounded p-2">
              <div className="text-[12px] font-bold text-[var(--text)]">
                {bounty.recipientName}
              </div>
              <div className="text-[8px] tracking-[2px] text-[var(--sub)]">RECIPIENT</div>
            </div>
            <div className="border border-[var(--border)] rounded p-2">
              <div
                className={`text-[12px] font-bold ${
                  bounty.status === "delivered"
                    ? "text-blue-400"
                    : bounty.status === "accepted"
                    ? "text-[var(--green)]"
                    : bounty.status === "rejected"
                    ? "text-[var(--red)]"
                    : bounty.status === "feedback_sent"
                    ? "text-purple-400"
                    : "text-[var(--amber)]"
                }`}
              >
                {bounty.status.toUpperCase()}
              </div>
              <div className="text-[8px] tracking-[2px] text-[var(--sub)]">STATUS</div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-0">
          {steps.length === 0 ? (
            <p className="text-[11px] text-[var(--dim)] text-center py-4">
              No steps recorded for this conversation.
            </p>
          ) : (
            steps.map((step, i) => (
              <div
                key={i}
                className={`border-l-2 ${statusColors[step.type] || "border-[var(--dim)]"} pl-4 py-3 relative`}
              >
                <div
                  className={`absolute -left-[5px] top-4 w-2 h-2 rounded-full ${
                    step.type === "PROPOSE"
                      ? "bg-[var(--green)]"
                      : step.type === "ACCEPT"
                      ? "bg-[var(--amber)]"
                      : step.type === "DELIVER"
                      ? "bg-blue-400"
                      : step.type === "FEEDBACK"
                      ? "bg-purple-400"
                      : step.type === "REJECT"
                      ? "bg-[var(--red)]"
                      : "bg-[var(--dim)]"
                  }`}
                />
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] tracking-[2px] font-bold ${textColors[step.type] || "text-[var(--sub)]"}`}
                  >
                    {step.type}
                  </span>
                  <span className="text-[9px] text-[var(--dim)]">
                    from {step.from === "admin" ? "ADMIN" : shortId(step.from)}
                  </span>
                  {step.timestamp > 0 && (
                    <span className="text-[9px] text-[var(--dim)]">
                      {timeAgo(step.timestamp / 1000)}
                    </span>
                  )}
                </div>

                {/* Payload */}
                {step.type === "DELIVER" && step.raw ? (
                  <DeliverViewer payloadB64={step.raw} />
                ) : step.payload ? (
                  <pre className="text-[10px] text-[var(--dim)] max-h-32 overflow-y-auto bg-[var(--bg)] rounded p-2">
                    {typeof step.payload === "string"
                      ? step.payload
                      : JSON.stringify(step.payload, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

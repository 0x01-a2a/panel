"use client";
import { useState, useCallback, useMemo } from "react";
import type { Agent, BountySubmission, InboxEnvelope, BountyHistoryEntry } from "@/app/lib/types";
import { NODES, shortId, timeAgo, decodePayload, MSG_COLORS } from "@/app/lib/types";
import { sendEnvelopeViaNode, sendAccept, sendCounter, sendReject, sendDeliver } from "@/app/lib/api";
import { DeliverViewer } from "./DeliverViewer";

type ActionState =
  | { idx: number; type: "counter"; amount: string; message: string }
  | { idx: number; type: "deliver"; text: string }
  | { idx: number; type: "propose-back"; amount: string; message: string };

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
  const [action, setAction] = useState<ActionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionResult, setActionResult] = useState<{ idx: number; ok: boolean; msg: string } | null>(null);

  const firstNode = useMemo(() => NODES.find((n) => n.nodeUrl && secrets[n.id]), [secrets]);

  const handleFeedback = useCallback(
    async (env: InboxEnvelope, score: number, outcome: string) => {
      if (!firstNode?.nodeUrl) return;
      const ok = await sendEnvelopeViaNode(
        firstNode.nodeUrl, secrets[firstNode.id], "FEEDBACK",
        env.sender, env.conversation_id,
        btoa(JSON.stringify({ score, outcome }))
      );
      if (ok) {
        updateBountyStatus(env.conversation_id, "feedback_sent");
        updateSubmissionStatus(env.conversation_id, env.sender, "feedback_sent");
      }
    },
    [firstNode, secrets, updateBountyStatus, updateSubmissionStatus]
  );

  const handleAccept = useCallback(async (env: InboxEnvelope) => {
    if (!firstNode?.nodeUrl) return;
    setBusy(true);
    try {
      // Extract amount from payload if decodable; default 0
      const p = decodePayload(env.payload_b64);
      const amount = typeof p === "object" && p !== null && "amount_usdc_micro" in p
        ? Number((p as Record<string, unknown>).amount_usdc_micro)
        : 0;
      await sendAccept(firstNode.nodeUrl, secrets[firstNode.id], {
        recipient: env.sender,
        conversation_id: env.conversation_id,
        amount_usdc_micro: amount,
      });
      setActionResult({ idx: envelopes.indexOf(env), ok: true, msg: "ACCEPTED" });
      updateBountyStatus(env.conversation_id, "accepted");
    } catch (e) {
      setActionResult({ idx: envelopes.indexOf(env), ok: false, msg: String(e) });
    } finally {
      setBusy(false);
    }
  }, [firstNode, secrets, envelopes, updateBountyStatus]);

  const handleReject = useCallback(async (env: InboxEnvelope) => {
    if (!firstNode?.nodeUrl) return;
    setBusy(true);
    try {
      await sendReject(firstNode.nodeUrl, secrets[firstNode.id], {
        recipient: env.sender, conversation_id: env.conversation_id,
      });
      setActionResult({ idx: envelopes.indexOf(env), ok: true, msg: "REJECTED" });
      updateBountyStatus(env.conversation_id, "rejected");
    } catch (e) {
      setActionResult({ idx: envelopes.indexOf(env), ok: false, msg: String(e) });
    } finally {
      setBusy(false);
    }
  }, [firstNode, secrets, envelopes, updateBountyStatus]);

  const handleCounterSubmit = useCallback(async (env: InboxEnvelope, round: number) => {
    if (!firstNode?.nodeUrl || action?.type !== "counter") return;
    const micro = Math.round(parseFloat(action.amount) * 1_000_000);
    if (isNaN(micro) || micro <= 0) return;
    setBusy(true);
    try {
      await sendCounter(firstNode.nodeUrl, secrets[firstNode.id], {
        recipient: env.sender,
        conversation_id: env.conversation_id,
        amount_usdc_micro: micro,
        round,
        message: action.message || undefined,
      });
      setActionResult({ idx: envelopes.indexOf(env), ok: true, msg: `COUNTER sent @ $${action.amount}` });
      setAction(null);
    } catch (e) {
      setActionResult({ idx: envelopes.indexOf(env), ok: false, msg: String(e) });
    } finally {
      setBusy(false);
    }
  }, [firstNode, secrets, action, envelopes]);

  const handleDeliverSubmit = useCallback(async (env: InboxEnvelope) => {
    if (!firstNode?.nodeUrl || action?.type !== "deliver") return;
    if (!action.text.trim()) return;
    setBusy(true);
    try {
      await sendDeliver(firstNode.nodeUrl, secrets[firstNode.id], {
        recipient: env.sender,
        conversation_id: env.conversation_id,
        text: action.text,
      });
      setActionResult({ idx: envelopes.indexOf(env), ok: true, msg: "DELIVERED" });
      setAction(null);
    } catch (e) {
      setActionResult({ idx: envelopes.indexOf(env), ok: false, msg: String(e) });
    } finally {
      setBusy(false);
    }
  }, [firstNode, secrets, action, envelopes]);

  const msgTypes = useMemo(
    () => Array.from(new Set(envelopes.map((e) => e.msg_type))),
    [envelopes]
  );
  const filtered = useMemo(
    () => filter === "all" ? envelopes : envelopes.filter((e) => e.msg_type === filter),
    [envelopes, filter]
  );

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 flex-wrap">
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

      {!firstNode && (
        <p className="text-[10px] text-[var(--amber)] mb-2">
          Add a node API secret in CONFIG to enable response actions.
        </p>
      )}

      {/* Envelope list */}
      <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--sub)] text-[12px]">Listening for incoming envelopes...</p>
            <p className="text-[var(--dim)] text-[10px] mt-1">
              PROPOSE, ACCEPT, DELIVER, BOUNTY from agents will appear here
            </p>
          </div>
        )}
        {filtered.map((env, i) => {
          const color = MSG_COLORS[env.msg_type] || "text-[var(--text)]";
          const matchingBounty = history.find((h) => h.conversationId === env.conversation_id);
          const isExpanded = expandedIdx === i;
          const isActing = action?.idx === i;
          const result = actionResult?.idx === i ? actionResult : null;

          // Parse round from COUNTER payload for counter-back
          const envPayload = decodePayload(env.payload_b64);
          const counterRound = typeof envPayload === "object" && envPayload !== null && "round" in envPayload
            ? Number((envPayload as Record<string, unknown>).round) + 1
            : 1;

          return (
            <div
              key={`${env.conversation_id}:${env.msg_type}:${env.sender}:${env.slot ?? i}`}
              className="border border-[var(--border)] rounded p-3 hover:border-[var(--dim)] transition-colors"
            >
              {/* Header row */}
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

              {/* Expanded payload */}
              {isExpanded && (
                <div className="mt-2 pt-2 border-t border-[var(--border)]">
                  {env.msg_type === "DELIVER" ? (
                    <DeliverViewer payloadB64={env.payload_b64} />
                  ) : (
                    (() => {
                      const payload = decodePayload(env.payload_b64);
                      return payload ? (
                        <pre className="text-[10px] text-[var(--dim)] max-h-32 overflow-y-auto bg-[var(--bg)] rounded p-2">
                          {typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)}
                        </pre>
                      ) : null;
                    })()
                  )}
                </div>
              )}

              {/* Action result */}
              {result && (
                <p className={`text-[9px] mt-2 ${result.ok ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                  {result.msg}
                </p>
              )}

              {/* ── PROPOSE actions: ACCEPT / REJECT / COUNTER ── */}
              {env.msg_type === "PROPOSE" && firstNode && !result?.ok && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(env)}
                      disabled={busy}
                      className="text-[9px] tracking-[2px] px-3 py-1 border border-[var(--green)] text-[var(--green)] rounded hover:bg-[var(--green)]/10 disabled:opacity-30 transition-colors"
                    >
                      ACCEPT
                    </button>
                    <button
                      onClick={() => handleReject(env)}
                      disabled={busy}
                      className="text-[9px] tracking-[2px] px-3 py-1 border border-[var(--red)] text-[var(--red)] rounded hover:bg-[var(--red)]/10 disabled:opacity-30 transition-colors"
                    >
                      REJECT
                    </button>
                    <button
                      onClick={() => setAction(isActing && action.type === "counter" ? null : { idx: i, type: "counter", amount: "", message: "" })}
                      disabled={busy}
                      className={`text-[9px] tracking-[2px] px-3 py-1 border rounded disabled:opacity-30 transition-colors ${
                        isActing && action?.type === "counter"
                          ? "border-[var(--amber)] text-[var(--amber)] bg-[var(--amber)]/5"
                          : "border-[var(--border)] text-[var(--sub)]"
                      }`}
                    >
                      COUNTER
                    </button>
                    <button
                      onClick={() => setAction(isActing && action.type === "deliver" ? null : { idx: i, type: "deliver", text: "" })}
                      disabled={busy}
                      className={`text-[9px] tracking-[2px] px-3 py-1 border rounded disabled:opacity-30 transition-colors ${
                        isActing && action?.type === "deliver"
                          ? "border-blue-400 text-blue-400 bg-blue-400/5"
                          : "border-[var(--border)] text-[var(--sub)]"
                      }`}
                    >
                      DELIVER
                    </button>
                  </div>
                  {isActing && action.type === "counter" && (
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Counter amount (USDC)"
                        value={action.amount}
                        onChange={e => setAction({ ...action, amount: e.target.value })}
                        className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[11px] text-[var(--text)] focus:border-[var(--amber)] focus:outline-none"
                      />
                      <input
                        placeholder="Note (optional)"
                        value={action.message}
                        onChange={e => setAction({ ...action, message: e.target.value })}
                        className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[11px] text-[var(--text)] focus:border-[var(--amber)] focus:outline-none"
                      />
                      <button
                        onClick={() => handleCounterSubmit(env, counterRound)}
                        disabled={busy || !action.amount}
                        className="text-[9px] px-3 py-1 border border-[var(--amber)] text-[var(--amber)] rounded hover:bg-[var(--amber)]/10 disabled:opacity-30 transition-colors"
                      >
                        SEND
                      </button>
                    </div>
                  )}
                  {isActing && action.type === "deliver" && (
                    <div className="space-y-1">
                      <textarea
                        rows={3}
                        placeholder="Delivery content..."
                        value={action.text}
                        onChange={e => setAction({ ...action, text: e.target.value })}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[11px] text-[var(--text)] focus:border-blue-400 focus:outline-none resize-none"
                      />
                      <button
                        onClick={() => handleDeliverSubmit(env)}
                        disabled={busy || !action.text.trim()}
                        className="text-[9px] px-3 py-1 border border-blue-400 text-blue-400 rounded hover:bg-blue-400/10 disabled:opacity-30 transition-colors"
                      >
                        SEND DELIVER
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── COUNTER actions: ACCEPT / REJECT / COUNTER-BACK ── */}
              {env.msg_type === "COUNTER" && firstNode && !result?.ok && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(env)}
                      disabled={busy}
                      className="text-[9px] tracking-[2px] px-3 py-1 border border-[var(--green)] text-[var(--green)] rounded hover:bg-[var(--green)]/10 disabled:opacity-30 transition-colors"
                    >
                      ACCEPT COUNTER
                    </button>
                    <button
                      onClick={() => handleReject(env)}
                      disabled={busy}
                      className="text-[9px] tracking-[2px] px-3 py-1 border border-[var(--red)] text-[var(--red)] rounded hover:bg-[var(--red)]/10 disabled:opacity-30 transition-colors"
                    >
                      REJECT
                    </button>
                    <button
                      onClick={() => setAction(isActing && action.type === "counter" ? null : { idx: i, type: "counter", amount: "", message: "" })}
                      disabled={busy}
                      className={`text-[9px] tracking-[2px] px-3 py-1 border rounded disabled:opacity-30 transition-colors ${
                        isActing && action?.type === "counter"
                          ? "border-[var(--amber)] text-[var(--amber)] bg-[var(--amber)]/5"
                          : "border-[var(--border)] text-[var(--sub)]"
                      }`}
                    >
                      COUNTER BACK
                    </button>
                  </div>
                  {isActing && action.type === "counter" && (
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Your counter (USDC)"
                        value={action.amount}
                        onChange={e => setAction({ ...action, amount: e.target.value })}
                        className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[11px] text-[var(--text)] focus:border-[var(--amber)] focus:outline-none"
                      />
                      <button
                        onClick={() => handleCounterSubmit(env, counterRound)}
                        disabled={busy || !action.amount}
                        className="text-[9px] px-3 py-1 border border-[var(--amber)] text-[var(--amber)] rounded hover:bg-[var(--amber)]/10 disabled:opacity-30 transition-colors"
                      >
                        SEND
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── ACCEPT actions: DELIVER ── */}
              {env.msg_type === "ACCEPT" && firstNode && !result?.ok && (
                <div className="mt-2 space-y-2">
                  <button
                    onClick={() => setAction(isActing && action.type === "deliver" ? null : { idx: i, type: "deliver", text: "" })}
                    disabled={busy}
                    className={`text-[9px] tracking-[2px] px-3 py-1 border rounded disabled:opacity-30 transition-colors ${
                      isActing && action?.type === "deliver"
                        ? "border-blue-400 text-blue-400 bg-blue-400/5"
                        : "border-[var(--border)] text-[var(--sub)]"
                    }`}
                  >
                    DELIVER WORK
                  </button>
                  {isActing && action.type === "deliver" && (
                    <div className="space-y-1">
                      <textarea
                        rows={4}
                        placeholder="Paste your delivery content here..."
                        value={action.text}
                        onChange={e => setAction({ ...action, text: e.target.value })}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[11px] text-[var(--text)] focus:border-blue-400 focus:outline-none resize-none"
                      />
                      <button
                        onClick={() => handleDeliverSubmit(env)}
                        disabled={busy || !action.text.trim()}
                        className="text-[9px] px-3 py-1 border border-blue-400 text-blue-400 rounded hover:bg-blue-400/10 disabled:opacity-30 transition-colors"
                      >
                        SEND DELIVER
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── DELIVER actions: FEEDBACK ── */}
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
                    REJECT (−100)
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

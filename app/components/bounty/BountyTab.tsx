"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import type { Agent, BountyHistoryEntry, BountySubmission, BountyTemplate } from "@/app/lib/types";
import { NODES, shortId } from "@/app/lib/types";
import { sendPropose, sendDiscover } from "@/app/lib/api";
import { loadTemplates, saveTemplates } from "@/app/lib/storage";
import { ConversationThread } from "./ConversationThread";

export function BountyTab({
  secrets,
  agents,
  history,
  addBounty,
  envelopes,
  updateSubmissionStatus,
  openConversationId,
  onConversationOpened,
  blocklist,
}: {
  secrets: Record<string, string>;
  agents: Agent[];
  history: BountyHistoryEntry[];
  addBounty: (entry: BountyHistoryEntry) => void;
  envelopes: { msg_type: string; sender: string; conversation_id: string; payload_b64: string }[];
  updateSubmissionStatus: (conversationId: string, agentId: string, status: BountySubmission["status"]) => void;
  openConversationId?: string | null;
  onConversationOpened?: () => void;
  blocklist?: string[];
}) {
  const blocklistSet = useMemo(() => new Set(blocklist ?? []), [blocklist]);
  const sendNodes = useMemo(
    () => NODES.filter((n) => n.nodeUrl && secrets[n.id]),
    [secrets]
  );
  const [selectedNode, setSelectedNode] = useState(sendNodes[0]?.id || "");

  // Keep selectedNode valid when secrets change (e.g. user adds first secret)
  useEffect(() => {
    if (!selectedNode || !sendNodes.find((n) => n.id === selectedNode)) {
      setSelectedNode(sendNodes[0]?.id || "");
    }
  }, [sendNodes, selectedNode]);
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [amountUsdc, setAmountUsdc] = useState("0.01");
  const [deadlineStr, setDeadlineStr] = useState(() => {
    const d = new Date(Date.now() + 120_000);
    return d.toISOString().slice(0, 16);
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [templates, setTemplates] = useState<BountyTemplate[]>(() => loadTemplates());
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const handleSaveTemplate = useCallback(() => {
    if (!templateName.trim() || !message.trim()) return;
    const t: BountyTemplate = {
      id: Date.now().toString(36),
      name: templateName.trim(),
      message,
      amountUsdc: parseFloat(amountUsdc) || 0.01,
      broadcast: broadcastMode,
    };
    const updated = [t, ...templates].slice(0, 50);
    setTemplates(updated);
    saveTemplates(updated);
    setTemplateName("");
    setShowSaveTemplate(false);
  }, [templateName, message, amountUsdc, broadcastMode, templates]);

  const handleLoadTemplate = useCallback((t: BountyTemplate) => {
    setMessage(t.message);
    setAmountUsdc(String(t.amountUsdc));
    setBroadcastMode(t.broadcast);
    setShowTemplates(false);
  }, []);

  const handleDeleteTemplate = useCallback((id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
  }, [templates]);

  // Auto-open conversation when navigated from notification
  useEffect(() => {
    if (openConversationId) {
      setSelectedConv(openConversationId);
      onConversationOpened?.();
    }
  }, [openConversationId, onConversationOpened]);
  const [historyFilter, setHistoryFilter] = useState<"all" | BountyHistoryEntry["status"]>("all");

  const now = Date.now() / 1000;
  const onlineAgents = useMemo(
    () => agents.filter((a) => now - a.last_seen < 300 && !blocklistSet.has(a.agent_id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agents, blocklistSet]
  );

  const handleSend = useCallback(async () => {
    const node = NODES.find((n) => n.id === selectedNode);
    if (!node?.nodeUrl || !secrets[node.id]) return;

    // H-4: Validate payload fields before sending to the mesh.
    const parsedAmount = parseFloat(amountUsdc);
    if (isNaN(parsedAmount) || parsedAmount < 0 || parsedAmount > 10_000) {
      setResult("ERROR: Amount must be between 0 and 10,000 USDC");
      return;
    }
    if (!message.trim()) {
      setResult("ERROR: Message is required");
      return;
    }
    if (message.length > 2_000) {
      setResult("ERROR: Message exceeds 2,000 character limit");
      return;
    }

    setSending(true);
    setResult(null);

    try {
      if (broadcastMode) {
        // DISCOVER is a gossipsub broadcast — goes to all mesh peers
        const res = await sendDiscover(node.nodeUrl!, secrets[node.id], {
          message,
          amount_usdc_micro: Math.round(parsedAmount * 1_000_000),
          deadline_secs: deadlineStr
            ? Math.max(1, Math.round((new Date(deadlineStr).getTime() - Date.now()) / 1000))
            : undefined,
        });
        addBounty({
          conversationId: res.conversation_id,
          recipient: "broadcast",
          recipientName: "ALL MESH",
          message,
          amountUsdc: parsedAmount,
          sentAt: Date.now(),
          sentFrom: node.label,
          status: "proposed",
        });
        setResult(`DISCOVER broadcast via ${node.label} → conv ${res.conversation_id.slice(0, 12)}...`);
      } else {
        if (!recipient) return;
        const res = await sendPropose(node.nodeUrl!, secrets[node.id], {
          recipient,
          message,
          amount_usdc_micro: Math.round(parsedAmount * 1_000_000),
          deadline_secs: deadlineStr
            ? Math.max(1, Math.round((new Date(deadlineStr).getTime() - Date.now()) / 1000))
            : undefined,
        });
        setResult(`PROPOSE sent -> conv ${res.conversation_id.slice(0, 12)}...`);
        addBounty({
          conversationId: res.conversation_id,
          recipient,
          recipientName:
            agents.find((a) => a.agent_id === recipient)?.name || shortId(recipient),
          message,
          amountUsdc: parsedAmount,
          sentAt: Date.now(),
          sentFrom: node.label,
          status: "proposed",
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult(`ERROR: ${msg}`);
    } finally {
      setSending(false);
    }
  }, [selectedNode, recipient, message, amountUsdc, deadlineStr, secrets, broadcastMode, agents, addBounty]);

  const filteredHistory =
    historyFilter === "all" ? history : history.filter((h) => h.status === historyFilter);

  return (
    <div className="space-y-5">
      {/* Conversation thread modal */}
      {selectedConv && (
        <ConversationThread
          conversationId={selectedConv}
          history={history}
          envelopes={envelopes}
          agents={agents}
          secrets={secrets}
          onFeedbackSent={(convId, agentId) => updateSubmissionStatus(convId, agentId, "feedback_sent")}
          onClose={() => setSelectedConv(null)}
        />
      )}

      {/* Send form */}
      <div className="border border-[var(--border)] rounded p-4 space-y-4">
        <h3 className="text-[10px] tracking-[3px] text-[var(--sub)]">
          NEW BOUNTY
        </h3>

        {/* Node selector */}
        <div>
          <label className="text-[9px] tracking-[3px] text-[var(--sub)] block mb-1">
            SEND FROM
          </label>
          <div className="flex gap-2">
            {sendNodes.length === 0 ? (
              <p className="text-[11px] text-[var(--red)]">
                No nodes configured. Add API secrets in settings.
              </p>
            ) : (
              sendNodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNode(n.id)}
                  className={`text-[10px] tracking-[2px] px-4 py-2 border rounded transition-colors ${
                    selectedNode === n.id
                      ? "border-[var(--green)] text-[var(--green)] bg-[var(--green)]/5"
                      : "border-[var(--border)] text-[var(--sub)] hover:border-[var(--dim)]"
                  }`}
                >
                  {n.label}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Broadcast toggle + templates */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBroadcastMode(!broadcastMode)}
            className={`text-[10px] tracking-[2px] px-3 py-1.5 border rounded transition-colors ${
              broadcastMode
                ? "border-[var(--amber)] text-[var(--amber)] bg-[var(--amber)]/5"
                : "border-[var(--border)] text-[var(--sub)]"
            }`}
          >
            BROADCAST
          </button>
          {broadcastMode && (
            <span className="text-[10px] text-[var(--sub)]">
              gossipsub to all mesh peers ({onlineAgents.length} online)
            </span>
          )}
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={`ml-auto text-[9px] tracking-[2px] px-3 py-1.5 border rounded transition-colors ${
              showTemplates
                ? "border-[var(--green)] text-[var(--green)]"
                : "border-[var(--border)] text-[var(--sub)] hover:border-[var(--dim)]"
            }`}
          >
            TEMPLATES {templates.length > 0 ? `(${templates.length})` : ""}
          </button>
        </div>

        {/* Templates panel */}
        {showTemplates && (
          <div className="border border-[var(--border)] rounded p-3 space-y-2">
            {templates.length === 0 ? (
              <p className="text-[10px] text-[var(--dim)] text-center py-2">
                No templates yet. Fill the form and click SAVE AS TEMPLATE.
              </p>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="flex items-center gap-2 border border-[var(--border)] rounded px-2 py-1.5">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-[var(--text)] font-bold">{t.name}</span>
                    <span className="text-[9px] text-[var(--dim)] ml-2 truncate">{t.message.slice(0, 50)}</span>
                  </div>
                  <span className="text-[9px] text-[var(--sub)]">${t.amountUsdc.toFixed(2)}</span>
                  {t.broadcast && (
                    <span className="text-[8px] px-1 rounded bg-[var(--amber)]/10 text-[var(--amber)]">BC</span>
                  )}
                  <button
                    onClick={() => handleLoadTemplate(t)}
                    className="text-[9px] px-2 py-0.5 border border-[var(--green)]/40 rounded text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors"
                  >
                    LOAD
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="text-[9px] px-2 py-0.5 border border-[var(--red)]/30 rounded text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors"
                  >
                    DEL
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Recipient */}
        {!broadcastMode && (
          <div>
            <label className="text-[9px] tracking-[3px] text-[var(--sub)] block mb-1">
              RECIPIENT AGENT ID
            </label>
            <input
              placeholder="64-char hex agent_id..."
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[12px] text-[var(--text)] placeholder:text-[var(--dim)] focus:border-[var(--green)] focus:outline-none"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            {onlineAgents.length > 0 && !recipient && (
              <div className="mt-2 flex flex-wrap gap-1">
                {onlineAgents.slice(0, 10).map((a) => (
                  <button
                    key={a.agent_id}
                    onClick={() => setRecipient(a.agent_id)}
                    className="text-[9px] px-2 py-1 border border-[var(--border)] rounded text-[var(--sub)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message */}
        <div>
          <label className="text-[9px] tracking-[3px] text-[var(--sub)] block mb-1">
            TASK DESCRIPTION
          </label>
          <textarea
            rows={3}
            placeholder="Describe the bounty task..."
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[12px] text-[var(--text)] placeholder:text-[var(--dim)] focus:border-[var(--green)] focus:outline-none resize-none"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
          />
        </div>

        {/* Amount + Deadline */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-[9px] tracking-[3px] text-[var(--sub)] block mb-1">
              REWARD (USDC)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[12px] text-[var(--text)] focus:border-[var(--green)] focus:outline-none"
              value={amountUsdc}
              onChange={(e) => setAmountUsdc(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-[9px] tracking-[3px] text-[var(--sub)] block mb-1">
              DEADLINE
            </label>
            <input
              type="datetime-local"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-[12px] text-[var(--text)] focus:border-[var(--green)] focus:outline-none [color-scheme:dark]"
              value={deadlineStr}
              onChange={(e) => setDeadlineStr(e.target.value)}
            />
            {deadlineStr && (
              <span className="text-[9px] text-[var(--sub)] mt-1 block">
                {(() => {
                  const secs = Math.round(
                    (new Date(deadlineStr).getTime() - Date.now()) / 1000
                  );
                  if (secs <= 0) return "deadline in the past";
                  if (secs < 60) return `${secs}s from now`;
                  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s from now`;
                  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m from now`;
                })()}
              </span>
            )}
          </div>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending || !message.trim() || (!broadcastMode && !recipient) || !selectedNode}
          className="w-full bg-[var(--green)] text-black font-bold text-[11px] tracking-[3px] py-3 rounded hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {sending
            ? "SENDING..."
            : broadcastMode
            ? "BROADCAST DISCOVER"
            : "SEND PROPOSE"}
        </button>

        {result && (
          <pre
            className={`text-[11px] p-3 border rounded whitespace-pre-wrap ${
              result.startsWith("ERROR")
                ? "border-[var(--red)] text-[var(--red)] bg-[var(--red)]/5"
                : "border-[var(--green)] text-[var(--green)] bg-[var(--green)]/5"
            }`}
          >
            {result}
          </pre>
        )}

        {/* Save as template */}
        <div className="pt-1">
          {showSaveTemplate ? (
            <div className="flex gap-2">
              <input
                placeholder="Template name..."
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-[11px] text-[var(--text)] placeholder:text-[var(--dim)] focus:border-[var(--green)] focus:outline-none"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
                autoFocus
              />
              <button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim() || !message.trim()}
                className="text-[9px] tracking-[2px] px-3 py-1.5 border border-[var(--green)] text-[var(--green)] rounded hover:bg-[var(--green)]/10 disabled:opacity-30 transition-colors"
              >
                SAVE
              </button>
              <button
                onClick={() => { setShowSaveTemplate(false); setTemplateName(""); }}
                className="text-[9px] px-2 py-1.5 border border-[var(--border)] rounded text-[var(--dim)] hover:text-[var(--sub)] transition-colors"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveTemplate(true)}
              disabled={!message.trim()}
              className="text-[9px] tracking-[2px] text-[var(--dim)] hover:text-[var(--sub)] disabled:opacity-30 transition-colors"
            >
              + SAVE AS TEMPLATE
            </button>
          )}
        </div>
      </div>

      {/* Bounty history */}
      {history.length > 0 && (
        <div className="border border-[var(--border)] rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] tracking-[3px] text-[var(--sub)]">
              BOUNTY HISTORY ({history.length})
            </h3>
            <div className="flex gap-1">
              {(["all", "proposed", "accepted", "delivered", "rejected", "feedback_sent"] as const).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    className={`text-[9px] tracking-[1px] px-2 py-0.5 border rounded transition-colors ${
                      historyFilter === f
                        ? "border-[var(--green)] text-[var(--green)]"
                        : "border-[var(--border)] text-[var(--dim)] hover:text-[var(--sub)]"
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                )
              )}
            </div>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {filteredHistory.map((h) => (
              <div
                key={h.conversationId}
                onClick={() => setSelectedConv(h.conversationId)}
                className="flex items-center gap-3 text-[10px] py-1.5 px-2 border border-[var(--border)] rounded hover:border-[var(--dim)] cursor-pointer transition-colors"
              >
                <span
                  className={`tracking-[1px] w-24 font-bold ${
                    h.status === "proposed"
                      ? "text-[var(--amber)]"
                      : h.status === "accepted"
                      ? "text-[var(--green)]"
                      : h.status === "delivered"
                      ? "text-blue-400"
                      : h.status === "rejected"
                      ? "text-[var(--red)]"
                      : "text-purple-400"
                  }`}
                >
                  {h.status.toUpperCase()}
                </span>
                <span className="text-[var(--sub)] w-20 truncate">
                  {h.recipientName}
                </span>
                <span className="text-[var(--dim)] flex-1 truncate">
                  {h.message.slice(0, 60)}
                </span>
                {h.submissions && h.submissions.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400">
                    {h.submissions.filter(s => s.status === "delivered" || s.status === "feedback_sent").length}/{h.submissions.length}
                  </span>
                )}
                <span className="text-[var(--green)]">${h.amountUsdc.toFixed(2)}</span>
                <span className="text-[var(--dim)]">{h.sentFrom}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

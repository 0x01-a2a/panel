"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NODES } from "./lib/types";
import { loadSecrets, saveSecrets } from "./lib/storage";
import { useAgents } from "./lib/hooks/useAgents";
import { useActivity } from "./lib/hooks/useActivity";
import { useInbox } from "./lib/hooks/useInbox";
import { useBountyHistory } from "./lib/hooks/useBountyHistory";
import { useNodeHealth } from "./lib/hooks/useNodeHealth";
import { useNotifications } from "./lib/hooks/useNotifications";
import { MeshTab } from "./components/mesh/MeshTab";
import { BountyTab } from "./components/bounty/BountyTab";
import { InboxTab } from "./components/inbox/InboxTab";
import { ActivityTab } from "./components/feed/ActivityTab";
import { AnalyticsTab } from "./components/analytics/AnalyticsTab";
import { NodeHealthTab } from "./components/nodes/NodeHealthTab";
import { ExemptListPanel } from "./components/admin/ExemptListPanel";
import { ExportPanel } from "./components/admin/ExportPanel";
import { TreasuryTab } from "./components/treasury/TreasuryTab";

// ── Settings panel ──────────────────────────────────────────────────────────

function SettingsPanel({
  secrets,
  setSecrets,
}: {
  secrets: Record<string, string>;
  setSecrets: (s: Record<string, string>) => void;
}) {
  const canSend = NODES.filter((n) => n.nodeUrl);
  return (
    <div className="border border-[var(--border)] bg-[var(--card)] rounded p-4 mb-4">
      <h3 className="text-[10px] tracking-[3px] text-[var(--sub)] mb-3">
        API SECRETS
      </h3>
      {canSend.map((n) => (
        <div key={n.id} className="flex items-center gap-3 mb-2">
          <span className="text-[11px] text-[var(--green)] w-20">{n.label}</span>
          <input
            type="password"
            placeholder="Bearer token..."
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-[12px] text-[var(--text)] placeholder:text-[var(--dim)] focus:border-[var(--green)] focus:outline-none"
            value={secrets[n.id] || ""}
            onChange={(e) => setSecrets({ ...secrets, [n.id]: e.target.value })}
          />
        </div>
      ))}
      <p className="text-[10px] text-[var(--sub)] mt-2">
        Secrets stored in localStorage. Required for PROPOSE/FEEDBACK/admin.
      </p>
    </div>
  );
}

// ── Notification bell ───────────────────────────────────────────────────────

function NotificationBell({
  active,
  dismiss,
  dismissAll,
  onConversationClick,
}: {
  active: ReturnType<typeof useNotifications>["active"];
  dismiss: (id: string) => void;
  dismissAll: () => void;
  onConversationClick: (conversationId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (active.length === 0 && !open) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] tracking-[2px] px-3 py-1.5 border border-[var(--border)] rounded text-[var(--sub)] hover:border-[var(--amber)] transition-colors relative"
      >
        ALERTS
        {active.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-[var(--red)] text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {active.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
            <span className="text-[9px] tracking-[2px] text-[var(--sub)]">
              NOTIFICATIONS
            </span>
            {active.length > 0 && (
              <button
                onClick={dismissAll}
                className="text-[8px] text-[var(--dim)] hover:text-[var(--text)]"
              >
                DISMISS ALL
              </button>
            )}
          </div>
          {active.length === 0 ? (
            <div className="px-3 py-4 text-[10px] text-[var(--dim)] text-center">
              No new notifications
            </div>
          ) : (
            active.map((n) => (
              <div
                key={n.id}
                className={`px-3 py-2 border-b border-[var(--border)] last:border-0 ${n.conversationId ? "cursor-pointer hover:bg-[var(--bg)]" : ""}`}
                onClick={() => {
                  if (n.conversationId) {
                    onConversationClick(n.conversationId);
                    setOpen(false);
                  }
                }}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-[9px] font-bold ${
                      n.type === "error"
                        ? "text-[var(--red)]"
                        : n.type === "warning"
                        ? "text-[var(--amber)]"
                        : n.type === "success"
                        ? "text-[var(--green)]"
                        : "text-[var(--sub)]"
                    }`}
                  >
                    {n.title}
                  </span>
                  {n.conversationId && (
                    <span className="text-[8px] text-[var(--green)] ml-1">→ REVIEW</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                    className="ml-auto text-[8px] text-[var(--dim)] hover:text-[var(--text)]"
                  >
                    X
                  </button>
                </div>
                <p className="text-[9px] text-[var(--dim)]">{n.message}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

type Tab = "mesh" | "bounty" | "inbox" | "activity" | "analytics" | "nodes" | "treasury" | "admin";

export default function Home() {
  const [tab, setTab] = useState<Tab>("mesh");
  const [showSettings, setShowSettings] = useState(false);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [pendingReviewConv, setPendingReviewConv] = useState<string | null>(null);

  // Load secrets from localStorage on mount
  useEffect(() => {
    setSecrets(loadSecrets());
  }, []);

  // Persist secrets
  const handleSetSecrets = useCallback((s: Record<string, string>) => {
    setSecrets(s);
    saveSecrets(s);
  }, []);

  // Hooks
  const {
    agents,
    sorted: sortedAgents,
    search: agentSearch,
    setSearch: setAgentSearch,
    sort: agentSort,
    setSort: setAgentSort,
    onlineCount,
    recentCount,
    totalCount,
  } = useAgents();

  const { events: activity } = useActivity();
  const { envelopes, clear: clearInbox } = useInbox(secrets);
  const {
    history: bountyHistory,
    add: addBounty,
    updateStatus: updateBountyStatus,
    updateSubmissionStatus,
    handleEnvelope,
  } = useBountyHistory();
  const {
    nodes: healthNodes,
    onlineCount: nodesOnline,
    pingAll,
  } = useNodeHealth();
  const { active: activeNotifs, dismiss, dismissAll, push } = useNotifications();
  // Track which envelopes have already been processed to avoid re-firing on re-renders.
  const processedEnvsRef = useRef(new Set<string>());

  // Auto-update bounty history when new envelopes arrive.
  // Process ALL new envelopes, not just the most recent one (M-2).
  useEffect(() => {
    if (envelopes.length === 0) return;
    for (const env of envelopes) {
      // Deduplicate by conversation_id + msg_type (same pair won't push twice).
      const key = `${env.conversation_id}:${env.msg_type}`;
      if (processedEnvsRef.current.has(key)) continue;
      processedEnvsRef.current.add(key);

      handleEnvelope(env);

      if (env.msg_type === "ACCEPT") {
        push("success", "ACCEPTED", `Agent ${env.sender.slice(0, 8)} accepted bounty`, env.conversation_id);
      } else if (env.msg_type === "DELIVER") {
        push("info", "DELIVERED", `Agent ${env.sender.slice(0, 8)} submitted delivery`, env.conversation_id);
      } else if (env.msg_type === "REJECT") {
        push("warning", "REJECTED", `Agent ${env.sender.slice(0, 8)} rejected bounty`, env.conversation_id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelopes]);

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "mesh", label: "MESH" },
    { id: "bounty", label: "BOUNTY", badge: bountyHistory.filter((h) => h.status === "delivered").length },
    {
      id: "inbox",
      label: "INBOX",
      badge: envelopes.filter((e) => e.msg_type === "DELIVER" || e.msg_type === "ACCEPT").length,
    },
    { id: "activity", label: "FEED" },
    { id: "nodes", label: "NODES" },
    { id: "analytics", label: "ANALYTICS" },
    { id: "treasury", label: "TREASURY" },
    { id: "admin", label: "ADMIN" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-[13px] font-bold tracking-[4px] text-[var(--green)]">
              0x01 CONTROL
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
              <span className="text-[9px] tracking-[2px] text-[var(--sub)]">
                POLLING
              </span>
            </div>
            <div className="text-[9px] tracking-[1px] text-[var(--dim)]">
              {totalCount} agents / {nodesOnline} nodes
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell
              active={activeNotifs}
              dismiss={dismiss}
              dismissAll={dismissAll}
              onConversationClick={(convId) => {
                setTab("bounty");
                setPendingReviewConv(convId);
              }}
            />
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`text-[10px] tracking-[2px] px-3 py-1.5 border rounded transition-colors ${
                showSettings
                  ? "border-[var(--green)] text-[var(--green)]"
                  : "border-[var(--border)] text-[var(--sub)] hover:border-[var(--dim)]"
              }`}
            >
              {showSettings ? "CLOSE" : "CONFIG"}
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="mt-4">
            <SettingsPanel secrets={secrets} setSecrets={handleSetSecrets} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-[10px] tracking-[2px] px-4 py-2 border-b-2 transition-colors relative ${
                tab === t.id
                  ? "border-[var(--green)] text-[var(--green)]"
                  : "border-transparent text-[var(--sub)] hover:text-[var(--text)]"
              }`}
            >
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-[var(--green)] text-black text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-4">
        {tab === "mesh" && (
          <MeshTab
            agents={agents}
            sorted={sortedAgents}
            search={agentSearch}
            setSearch={setAgentSearch}
            sort={agentSort}
            setSort={setAgentSort}
            onlineCount={onlineCount}
            totalCount={totalCount}
            activity={activity}
            bountyHistory={bountyHistory}
          />
        )}
        {tab === "bounty" && (
          <BountyTab
            secrets={secrets}
            agents={agents}
            history={bountyHistory}
            addBounty={addBounty}
            envelopes={envelopes}
            updateSubmissionStatus={updateSubmissionStatus}
            openConversationId={pendingReviewConv}
            onConversationOpened={() => setPendingReviewConv(null)}
          />
        )}
        {tab === "inbox" && (
          <InboxTab
            envelopes={envelopes}
            secrets={secrets}
            history={bountyHistory}
            agents={agents}
            updateBountyStatus={updateBountyStatus}
            updateSubmissionStatus={updateSubmissionStatus}
            clear={clearInbox}
          />
        )}
        {tab === "activity" && <ActivityTab events={activity} />}
        {tab === "nodes" && (
          <NodeHealthTab
            nodes={healthNodes}
            onlineCount={nodesOnline}
            pingAll={pingAll}
          />
        )}
        {tab === "analytics" && (
          <AnalyticsTab
            history={bountyHistory}
            agents={agents}
            envelopes={envelopes}
            nodes={healthNodes}
            onlineAgentCount={onlineCount}
            recentAgentCount={recentCount}
          />
        )}
        {tab === "treasury" && <TreasuryTab secrets={secrets} />}
        {tab === "admin" && (
          <div className="space-y-4">
            <ExemptListPanel secrets={secrets} />
            <ExportPanel
              agents={agents}
              history={bountyHistory}
              activity={activity}
            />
          </div>
        )}
      </main>
    </div>
  );
}

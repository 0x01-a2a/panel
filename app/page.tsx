"use client";

import { useState, useEffect, useCallback } from "react";
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
}: {
  active: ReturnType<typeof useNotifications>["active"];
  dismiss: (id: string) => void;
  dismissAll: () => void;
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
                className="px-3 py-2 border-b border-[var(--border)] last:border-0"
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
                  <button
                    onClick={() => dismiss(n.id)}
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

type Tab = "mesh" | "bounty" | "inbox" | "activity" | "analytics" | "nodes" | "admin";

export default function Home() {
  const [tab, setTab] = useState<Tab>("mesh");
  const [showSettings, setShowSettings] = useState(false);
  const [secrets, setSecrets] = useState<Record<string, string>>({});

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
    handleEnvelope,
  } = useBountyHistory();
  const {
    nodes: healthNodes,
    onlineCount: nodesOnline,
    pingAll,
  } = useNodeHealth();
  const { active: activeNotifs, dismiss, dismissAll, push } = useNotifications();

  // Auto-update bounty history when new envelopes arrive
  useEffect(() => {
    if (envelopes.length === 0) return;
    const latest = envelopes[0];
    handleEnvelope(latest);

    // Push notifications for important events
    if (latest.msg_type === "ACCEPT") {
      push("success", "ACCEPTED", `Agent ${latest.sender.slice(0, 8)} accepted bounty`, latest.conversation_id);
    } else if (latest.msg_type === "DELIVER") {
      push("info", "DELIVERED", `Agent ${latest.sender.slice(0, 8)} submitted delivery`, latest.conversation_id);
    } else if (latest.msg_type === "REJECT") {
      push("warning", "REJECTED", `Agent ${latest.sender.slice(0, 8)} rejected bounty`, latest.conversation_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelopes.length]);

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
          />
        )}
        {tab === "inbox" && (
          <InboxTab
            envelopes={envelopes}
            secrets={secrets}
            history={bountyHistory}
            updateBountyStatus={updateBountyStatus}
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

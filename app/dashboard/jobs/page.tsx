"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSession, nodeFetch, fetchInteractions, type Interaction } from "../_lib/api";

interface TaskEntry {
  id: number;
  timestamp: number;
  category: string;
  outcome: string;
  amount_usd: number;
  duration_min: number;
  summary: string;
}

const OUTCOME_LABEL: Record<string, string> = {
  delivered: "Completed", disputed: "Disputed", cancelled: "Cancelled",
};

const CATEGORY_EMOJI: Record<string, string> = {
  research: "🔍", code: "💻", writing: "✍️", trade: "📈",
  data: "📊", other: "🤖",
};

type Tab = "completed" | "active";

export default function JobsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("completed");
  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [active, setActive] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);

  // Summary stats
  const [totalEarned, setTotalEarned] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [avgDuration, setAvgDuration] = useState(0);

  // Infinite scroll
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 20;

  const loadTasks = useCallback(async (token: string, before?: number) => {
    const path = before
      ? `/tasks/log?limit=${PAGE_SIZE}&before_id=${before}`
      : `/tasks/log?limit=${PAGE_SIZE}`;
    const r = await nodeFetch(path, { authToken: token }).catch(() => null);
    if (!r?.ok) return [];
    return r.json().catch(() => []) as Promise<TaskEntry[]>;
  }, []);

  useEffect(() => {
    const session = getSession();
    if (!session) { router.push("/dashboard/login"); return; }
    setAuthToken(session.authToken);
    setAgentId(session.agentId);

    Promise.all([
      loadTasks(session.authToken),
      fetchInteractions(session.agentId),
    ]).then(([completed, interactions]) => {
      setTasks(completed);
      setHasMore(completed.length === PAGE_SIZE);

      // Active = PROPOSE/COUNTER/ACCEPT with no DELIVER yet in last 2h
      const twoHoursAgo = Date.now() / 1000 - 7200;
      const activeOnes = interactions.filter(ev =>
        (ev.msg_type === "PROPOSE" || ev.msg_type === "COUNTER" || ev.msg_type === "ACCEPT") &&
        ev.timestamp > twoHoursAgo
      );
      setActive(activeOnes);

      // Stats from completed
      const done = completed.filter(t => t.outcome === "delivered");
      setCompletedCount(done.length);
      setTotalEarned(done.reduce((s, t) => s + t.amount_usd, 0));
      setAvgDuration(done.length ? Math.round(done.reduce((s, t) => s + t.duration_min, 0) / done.length) : 0);

      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router, loadTasks]);

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && authToken && tasks.length > 0) {
        const lastId = tasks[tasks.length - 1].id;
        setPage(p => p + 1);
        loadTasks(authToken, lastId).then(more => {
          if (more.length < PAGE_SIZE) setHasMore(false);
          setTasks(prev => [...prev, ...more]);
        });
      }
    });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [tasks, hasMore, authToken, loadTasks]);

  return (
    <>
      <div className="d-topbar">
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--d-text)" }}>
          Jobs
        </span>
        {active.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div className="d-dot-online" />
            <span style={{ fontSize: 12, color: "var(--d-green)", fontWeight: 500 }}>
              {active.length} active {active.length === 1 ? "negotiation" : "negotiations"}
            </span>
          </div>
        )}
      </div>

      <div className="d-content">
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          <div className="d-stat">
            <div className="d-stat-label">Total earned</div>
            <div className="d-stat-value" style={{ color: "var(--d-gold)", fontFamily: "var(--font-display)" }}>
              ${totalEarned.toFixed(2)}
            </div>
            <div className="d-stat-sub">from all jobs</div>
          </div>
          <div className="d-stat">
            <div className="d-stat-label">Jobs completed</div>
            <div className="d-stat-value" style={{ color: "var(--d-text)", fontFamily: "var(--font-display)" }}>
              {completedCount}
            </div>
            <div className="d-stat-sub">successfully delivered</div>
          </div>
          <div className="d-stat">
            <div className="d-stat-label">Avg. job time</div>
            <div className="d-stat-value" style={{ color: "var(--d-blue)", fontFamily: "var(--font-display)" }}>
              {avgDuration > 0 ? `${avgDuration}m` : "—"}
            </div>
            <div className="d-stat-sub">from accept to deliver</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          <button
            className={`d-pill ${tab === "completed" ? "d-pill-active" : ""}`}
            onClick={() => setTab("completed")}
          >
            Completed {completedCount > 0 && `(${completedCount})`}
          </button>
          <button
            className={`d-pill ${tab === "active" ? "d-pill-active" : ""}`}
            onClick={() => setTab("active")}
          >
            Active {active.length > 0 && `(${active.length})`}
          </button>
        </div>

        {/* Completed jobs */}
        {tab === "completed" && (
          <div className="d-card" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 20px", fontSize: 13, color: "var(--d-muted)" }}>
                Loading jobs...
              </div>
            ) : tasks.length === 0 ? (
              <EmptyCompleted />
            ) : (
              <>
                {tasks.map(task => <CompletedJobRow key={task.id} task={task} />)}
                <div ref={loaderRef} style={{ padding: "12px 20px", textAlign: "center" }}>
                  {hasMore
                    ? <span style={{ fontSize: 11, color: "var(--d-muted)" }}>Loading more...</span>
                    : tasks.length > PAGE_SIZE
                      ? <span style={{ fontSize: 11, color: "var(--d-muted)" }}>All jobs loaded</span>
                      : null
                  }
                </div>
              </>
            )}
          </div>
        )}

        {/* Active negotiations */}
        {tab === "active" && (
          <div className="d-card" style={{ padding: 0 }}>
            {active.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--d-text)", marginBottom: 8 }}>
                  No active negotiations
                </div>
                <p style={{ fontSize: 13, color: "var(--d-muted)", lineHeight: 1.7, margin: 0 }}>
                  Your agent is currently waiting for job offers. Active negotiations appear here as they happen.
                </p>
              </div>
            ) : (
              active.map((ev, i) => <ActiveJobRow key={i} event={ev} />)
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CompletedJobRow({ task }: { task: TaskEntry }) {
  const outcomeColor = task.outcome === "delivered" ? "var(--d-green)" :
                       task.outcome === "disputed"  ? "var(--d-red)"  : "var(--d-muted)";
  const outcomeBg    = task.outcome === "delivered" ? "var(--d-green-10)" :
                       task.outcome === "disputed"  ? "var(--d-red-10)"   : "rgba(255,255,255,0.04)";
  const emoji = CATEGORY_EMOJI[task.category] ?? "🤖";
  const label = OUTCOME_LABEL[task.outcome] ?? task.outcome;

  return (
    <div
      style={{
        display: "flex", alignItems: "flex-start", gap: 14,
        padding: "14px 20px",
        borderBottom: "1px solid var(--d-border-sub)",
        transition: "background 0.1s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.015)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {/* Category icon */}
      <div style={{
        width: 38, height: 38, borderRadius: 8,
        background: "var(--d-surface-2)",
        border: "1px solid var(--d-border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>
        {emoji}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: "var(--d-text)", lineHeight: 1.4, marginBottom: 5 }}>
          {task.summary}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="d-badge" style={{ background: outcomeBg, color: outcomeColor, textTransform: "none", fontSize: 10 }}>
            {label}
          </span>
          <span style={{ fontSize: 11, color: "var(--d-muted)" }}>
            {capitalize(task.category)}
          </span>
          {task.duration_min > 0 && (
            <span style={{ fontSize: 11, color: "var(--d-muted)" }}>
              {task.duration_min}m
            </span>
          )}
          <span style={{ fontSize: 11, color: "var(--d-muted)" }}>
            {timeAgo(task.timestamp)}
          </span>
        </div>
      </div>

      {/* Amount */}
      {task.amount_usd > 0 && (
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14, color: "var(--d-gold)" }}>
            +${task.amount_usd.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveJobRow({ event }: { event: Interaction }) {
  const peer = event.sender.slice(0, 8) + "..." + event.sender.slice(-6);
  const statusMap: Record<string, { label: string; desc: string; color: string }> = {
    PROPOSE: { label: "New offer",    desc: `received a job offer from ${peer}`, color: "var(--d-blue)" },
    COUNTER: { label: "Negotiating", desc: `negotiating terms with ${peer}`,    color: "var(--d-gold)" },
    ACCEPT:  { label: "Accepted",    desc: `job accepted, working for ${peer}`, color: "var(--d-green)" },
  };
  const status = statusMap[event.msg_type] ?? { label: event.msg_type, desc: `talking with ${peer}`, color: "var(--d-muted)" };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 20px",
      borderBottom: "1px solid var(--d-border-sub)",
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 8,
        background: `${status.color}18`,
        border: `1px solid ${status.color}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>
        ⚡
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, color: "var(--d-text)", textTransform: "capitalize" }}>
          {status.desc}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span className="d-badge" style={{ background: `${status.color}18`, color: status.color, textTransform: "none", fontSize: 10 }}>
            {status.label}
          </span>
          <span style={{ fontSize: 11, color: "var(--d-muted)" }}>{timeAgo(event.timestamp)}</span>
        </div>
      </div>
      {event.amount != null && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--d-gold)", fontWeight: 600 }}>
          ${event.amount.toFixed(2)}
        </div>
      )}
    </div>
  );
}

function EmptyCompleted() {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--d-text)", marginBottom: 8 }}>
        No jobs yet
      </div>
      <p style={{ fontSize: 13, color: "var(--d-muted)", lineHeight: 1.7, margin: 0 }}>
        Your agent&apos;s completed jobs will show up here with a plain-English description of what was done and how much it earned.
      </p>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

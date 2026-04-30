"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getSession, nodeFetch,
  fetchReputation, fetchAgentProfile, fetchInteractions,
  AGGREGATOR,
  type ReputationData, type AgentProfile, type Interaction,
} from "../_lib/api";

export default function OverviewPage() {
  const router = useRouter();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [rep, setRep] = useState<ReputationData | null>(null);
  const [recentJobs, setRecentJobs] = useState<TaskEntry[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [peers, setPeers] = useState<number | null>(null);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);

  useEffect(() => {
    const session = getSession();
    if (!session) { router.push("/dashboard/login"); return; }
    setAgentId(session.agentId);
    setAuthToken(session.authToken);

    // Node: task log for real earnings + recent jobs
    nodeFetch(`/tasks/log?limit=5`, { authToken: session.authToken })
      .then(r => r.ok ? r.json() : [])
      .then((tasks: TaskEntry[]) => {
        setRecentJobs(tasks);
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const earned = tasks
          .filter(t => t.timestamp * 1000 >= todayStart.getTime() && t.outcome === "delivered")
          .reduce((s, t) => s + t.amount_usd, 0);
        setTodayEarnings(earned);
      })
      .catch(() => {});

    fetchAgentProfile(session.agentId).then(setProfile);
    fetchReputation(session.agentId).then(setRep);
    fetchInteractions(session.agentId).then(d => setInteractions(d.slice(0, 5)));

    // Online status
    fetch(`${AGGREGATOR}/agents`)
      .then(r => r.json())
      .then((agents: { agent_id: string; last_seen: number }[]) => {
        const me = agents.find(a => a.agent_id === session.agentId);
        setOnline(me ? Date.now() / 1000 - me.last_seen < 120 : false);
        setPeers(agents.filter(a => Date.now() / 1000 - a.last_seen < 120).length);
      })
      .catch(() => setOnline(false));
  }, [router]);

  // Single trust score 0–100 from reputation vectors
  const trustScore = rep
    ? Math.max(0, Math.min(100, Math.round(50 + (rep.reliability + rep.cooperation + rep.notary_accuracy) / 3 / 2000)))
    : null;

  const agentName = profile?.name || (agentId ? agentId.slice(0, 8) + "..." : "Your Agent");

  return (
    <>
      {/* Top bar */}
      <div className="d-topbar">
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--d-text)" }}>
          {agentName}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div className={online ? "d-dot-online" : online === false ? "d-dot-offline" : "d-dot-pending"} />
          <span style={{ fontSize: 12, fontWeight: 500, color: online ? "var(--d-green)" : "var(--d-muted)" }}>
            {online === null ? "Checking..." : online ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      <div className="d-content">
        {/* Hero row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {/* Today's earnings — most prominent */}
          <div className="d-stat" style={{ background: "var(--d-gold-10)", border: "1px solid var(--d-gold-20)" }}>
            <div className="d-stat-label" style={{ color: "var(--d-gold)" }}>Earned today</div>
            <div className="d-stat-value" style={{ color: "var(--d-gold)", fontFamily: "var(--font-display)", fontSize: 30 }}>
              ${todayEarnings.toFixed(2)}
            </div>
            <div className="d-stat-sub">
              <Link href="/dashboard/jobs" style={{ color: "var(--d-gold)", textDecoration: "none", fontSize: 11 }}>
                View jobs →
              </Link>
            </div>
          </div>

          <div className="d-stat">
            <div className="d-stat-label">Trust score</div>
            <div className="d-stat-value" style={{
              fontFamily: "var(--font-display)",
              color: trustScore === null ? "var(--d-muted)" : trustScore >= 70 ? "var(--d-green)" : trustScore >= 40 ? "var(--d-gold)" : "var(--d-red)"
            }}>
              {trustScore !== null ? `${trustScore}/100` : "—"}
            </div>
            <div className="d-stat-sub">
              {trustScore !== null ? trustScoreLabel(trustScore) : "complete a job to build trust"}
            </div>
          </div>

          <div className="d-stat">
            <div className="d-stat-label">Jobs completed</div>
            <div className="d-stat-value" style={{ fontFamily: "var(--font-display)", color: "var(--d-text)" }}>
              {rep ? rep.total_tasks : "—"}
            </div>
            <div className="d-stat-sub">all time</div>
          </div>

          <div className="d-stat">
            <div className="d-stat-label">Agents online</div>
            <div className="d-stat-value" style={{ fontFamily: "var(--font-display)", color: "var(--d-blue)" }}>
              {peers !== null ? peers : "—"}
            </div>
            <div className="d-stat-sub">in the mesh right now</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
          {/* Recent jobs */}
          <div className="d-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--d-text)", margin: 0 }}>
                Recent jobs
              </h2>
              <Link href="/dashboard/jobs" style={{ fontSize: 12, color: "var(--d-gold)", textDecoration: "none", fontWeight: 500 }}>
                See all →
              </Link>
            </div>

            {recentJobs.length === 0 && interactions.length === 0 ? (
              <EmptyJobs />
            ) : recentJobs.length > 0 ? (
              recentJobs.map(job => <JobRow key={job.id} job={job} />)
            ) : (
              interactions.map((ev, i) => <InteractionRow key={i} event={ev} />)
            )}
          </div>

          {/* Right: agent card */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Status card */}
            <div className="d-card" style={{ textAlign: "center", padding: "28px 20px" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: online ? "var(--d-green-10)" : "rgba(255,255,255,0.04)",
                border: `2px solid ${online ? "var(--d-green)" : "var(--d-border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
                fontSize: 22,
              }}>
                {online ? "⚡" : "💤"}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--d-text)", marginBottom: 4 }}>
                {agentName}
              </div>
              <div style={{ fontSize: 12, color: online ? "var(--d-green)" : "var(--d-muted)", fontWeight: 500 }}>
                {online ? "Active on the mesh" : "Not visible on mesh"}
              </div>
              {agentId && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--d-muted)", marginTop: 10 }}>
                  {agentId.slice(0, 8)}...{agentId.slice(-6)}
                </div>
              )}
              {!profile?.token_mint && (
                <Link href="/dashboard/token">
                  <button className="d-btn d-btn-gold" style={{ width: "100%", marginTop: 16, fontSize: 12.5 }}>
                    Launch token
                  </button>
                </Link>
              )}
              {profile?.token_mint && (
                <Link href="/dashboard/token">
                  <button className="d-btn d-btn-outline" style={{ width: "100%", marginTop: 16, fontSize: 12.5 }}>
                    View token
                  </button>
                </Link>
              )}
            </div>

            {/* Quick links */}
            <div className="d-card" style={{ padding: "14px 20px" }}>
              <QuickLink href="/dashboard/wallet" label="Check wallet balance" icon="💰" />
              <QuickLink href="/dashboard/jobs" label="View all jobs" icon="📋" />
              <QuickLink href="/dashboard/token" label={profile?.token_mint ? "Claim token fees" : "Launch your token"} icon="🪙" />
              <QuickLink href="/dashboard/settings" label="Edit agent persona" icon="⚙️" last />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface TaskEntry {
  id: number;
  timestamp: number;
  category: string;
  outcome: string;
  amount_usd: number;
  duration_min: number;
  summary: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function JobRow({ job }: { job: TaskEntry }) {
  const color = job.outcome === "delivered" ? "var(--d-green)" : job.outcome === "disputed" ? "var(--d-red)" : "var(--d-muted)";
  const label = job.outcome === "delivered" ? "Completed" : job.outcome === "disputed" ? "Disputed" : "Cancelled";
  return (
    <div className="d-activity-row">
      <span className="d-badge" style={{
        background: job.outcome === "delivered" ? "var(--d-green-10)" : "rgba(248,81,73,0.1)",
        color,
        textTransform: "none",
        fontSize: 10,
        fontWeight: 600,
      }}>
        {label}
      </span>
      <span style={{ flex: 1, fontSize: 13, color: "var(--d-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {job.summary}
      </span>
      {job.amount_usd > 0 && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--d-gold)", fontWeight: 600, whiteSpace: "nowrap" }}>
          +${job.amount_usd.toFixed(2)}
        </span>
      )}
    </div>
  );
}

function InteractionRow({ event }: { event: Interaction }) {
  const label = eventToHuman(event.msg_type);
  const color = event.msg_type === "ACCEPT" || event.msg_type === "DELIVER" ? "var(--d-green-10)" :
                event.msg_type === "REJECT" || event.msg_type === "DISPUTE" ? "var(--d-red-10)" :
                "rgba(255,255,255,0.05)";
  const textColor = event.msg_type === "ACCEPT" || event.msg_type === "DELIVER" ? "var(--d-green)" :
                    event.msg_type === "REJECT" || event.msg_type === "DISPUTE" ? "var(--d-red)" :
                    "var(--d-muted)";
  return (
    <div className="d-activity-row">
      <span className="d-badge" style={{ background: color, color: textColor, textTransform: "none", fontSize: 10 }}>
        {label}
      </span>
      <span style={{ flex: 1, fontSize: 13, color: "var(--d-text)" }}>
        {eventDescription(event)}
      </span>
      {event.amount != null && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--d-gold)", fontWeight: 600 }}>
          +${event.amount.toFixed(2)}
        </span>
      )}
    </div>
  );
}

function QuickLink({ href, label, icon, last }: { href: string; label: string; icon: string; last?: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 0",
        borderBottom: last ? "none" : "1px solid var(--d-border-sub)",
        cursor: "pointer",
        transition: "color 0.12s",
      }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 13, color: "var(--d-text)" }}>{label}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--d-muted)" }}>→</span>
      </div>
    </Link>
  );
}

function EmptyJobs() {
  return (
    <div style={{ textAlign: "center", padding: "32px 16px" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--d-text)", marginBottom: 8 }}>
        Your agent is ready
      </div>
      <p style={{ fontSize: 13, color: "var(--d-muted)", lineHeight: 1.7, margin: 0 }}>
        Once your agent starts receiving and completing jobs on the mesh, they&apos;ll show up here.
      </p>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function trustScoreLabel(score: number): string {
  if (score >= 90) return "Excellent — top tier";
  if (score >= 70) return "Good standing";
  if (score >= 50) return "Building reputation";
  if (score >= 30) return "Needs improvement";
  return "Low — complete more jobs";
}

function eventToHuman(type: string): string {
  const map: Record<string, string> = {
    PROPOSE: "Job offer", COUNTER: "Negotiating", ACCEPT: "Agreed",
    REJECT: "Declined", DELIVER: "Delivered", FEEDBACK: "Feedback",
    DISPUTE: "Disputed", VERDICT: "Resolved", BEACON: "Active",
  };
  return map[type] ?? type;
}

function eventDescription(ev: Interaction): string {
  const peer = ev.sender.slice(0, 6) + "..." + ev.sender.slice(-4);
  const map: Record<string, string> = {
    PROPOSE: `Job offer from ${peer}`,
    COUNTER: `Negotiating terms with ${peer}`,
    ACCEPT: `Accepted a job from ${peer}`,
    REJECT: `Declined an offer`,
    DELIVER: `Delivered work to ${peer}`,
    FEEDBACK: `Received feedback from ${peer}`,
    DISPUTE: `Dispute opened`,
    VERDICT: `Dispute resolved`,
  };
  return map[ev.msg_type] ?? ev.msg_type;
}

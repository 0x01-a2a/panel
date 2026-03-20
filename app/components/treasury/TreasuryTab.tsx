"use client";

import { useTreasury } from "@/app/lib/hooks/useTreasury";
import type { BillingAccount, SettlementEntry, RevenueStats } from "@/app/lib/types";
import { CHAIN_NAMES, timeAgo, shortId } from "@/app/lib/types";
import { setSkipSettlement } from "@/app/lib/api";
import { NODES } from "@/app/lib/types";
import React, { useState } from "react";

const AGGREGATOR_URL = NODES[0].aggregatorUrl;

// ── Helpers ──────────────────────────────────────────────────────────────────

function usdcHuman(minor: number): string {
  const v = minor / 1_000_000;
  if (v >= 1000) return `$${(v / 1000).toFixed(2)}k`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}

const TIER_COLOR: Record<string, string> = {
  free: "text-[var(--dim)]",
  builder: "text-[var(--amber)]",
  scale: "text-blue-400",
  enterprise: "text-[var(--green)]",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-[var(--amber)]",
  processing: "text-blue-400",
  completed: "text-[var(--green)]",
  failed: "text-[var(--red)]",
};

// ── Revenue overview ─────────────────────────────────────────────────────────

function RevenueOverview({ stats }: { stats: RevenueStats }) {
  const cards = [
    { label: "TOTAL DEPOSITS", value: usdcHuman(stats.total_deposits_usdc), color: "text-[var(--green)]" },
    { label: "TOTAL SETTLED", value: usdcHuman(stats.total_settled_usdc), color: "text-blue-400" },
    { label: "FEES COLLECTED", value: usdcHuman(stats.total_fees_usdc), color: "text-[var(--amber)]" },
    { label: "PENDING SETTLEMENTS", value: String(stats.pending_settlements), color: stats.pending_settlements > 0 ? "text-[var(--amber)]" : "text-[var(--dim)]" },
    { label: "TOTAL ACCOUNTS", value: String(stats.account_count), color: "text-[var(--text)]" },
    { label: "WITHDRAWALS", value: usdcHuman(stats.total_withdrawals_usdc), color: "text-[var(--sub)]" },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] tracking-[3px] text-[var(--sub)]">REVENUE OVERVIEW</h3>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="border border-[var(--border)] bg-[var(--card)] rounded p-3">
            <div className="text-[9px] tracking-[2px] text-[var(--dim)] mb-1">{c.label}</div>
            <div className={`text-[18px] font-bold font-mono ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tier breakdown */}
      <div className="border border-[var(--border)] bg-[var(--card)] rounded p-3">
        <div className="text-[9px] tracking-[2px] text-[var(--dim)] mb-2">TIER BREAKDOWN</div>
        <div className="flex gap-6">
          {["free", "builder", "scale", "enterprise"].map((tier) => (
            <div key={tier} className="flex flex-col items-center">
              <span className={`text-[14px] font-bold font-mono ${TIER_COLOR[tier]}`}>
                {stats.tier_counts[tier] ?? 0}
              </span>
              <span className="text-[9px] tracking-[1px] text-[var(--dim)] uppercase">{tier}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Account table ────────────────────────────────────────────────────────────

function AccountsTable({
  accounts,
  apiKey,
  onReload,
}: {
  accounts: BillingAccount[];
  apiKey: string;
  onReload: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  async function handleToggleSkip(accountId: string, current: boolean) {
    setToggling(accountId);
    await setSkipSettlement(AGGREGATOR_URL, apiKey, accountId, !current);
    onReload();
    setToggling(null);
  }

  if (accounts.length === 0) {
    return (
      <div className="border border-[var(--border)] bg-[var(--card)] rounded p-4 text-center text-[10px] text-[var(--dim)]">
        No billing accounts yet
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] bg-[var(--card)] rounded overflow-hidden">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left px-3 py-2 text-[9px] tracking-[2px] text-[var(--dim)]">ACCOUNT</th>
            <th className="text-right px-3 py-2 text-[9px] tracking-[2px] text-[var(--dim)]">BALANCE</th>
            <th className="text-center px-3 py-2 text-[9px] tracking-[2px] text-[var(--dim)]">TIER</th>
            <th className="text-center px-3 py-2 text-[9px] tracking-[2px] text-[var(--dim)]">PAYOUT CHAIN</th>
            <th className="text-right px-3 py-2 text-[9px] tracking-[2px] text-[var(--dim)]">UPDATED</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <React.Fragment key={a.account_id}>
              <tr
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)] cursor-pointer"
                onClick={() => setExpanded(expanded === a.account_id ? null : a.account_id)}
              >
                <td className="px-3 py-2 font-mono text-[var(--sub)]">{shortId(a.account_id)}</td>
                <td className="px-3 py-2 text-right font-mono text-[var(--green)]">
                  {usdcHuman(a.balance_usdc)}
                </td>
                <td className={`px-3 py-2 text-center uppercase text-[9px] tracking-[1px] ${TIER_COLOR[a.tier] ?? ""}`}>
                  {a.tier}
                </td>
                <td className="px-3 py-2 text-center text-[var(--dim)]">
                  {a.preferred_chain != null ? (CHAIN_NAMES[a.preferred_chain] ?? `Domain ${a.preferred_chain}`) : "—"}
                </td>
                <td className="px-3 py-2 text-right text-[var(--dim)]">{timeAgo(a.updated_at)}</td>
              </tr>
              {expanded === a.account_id && (
                <tr className="bg-[var(--bg)]">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div>
                        <span className="text-[var(--dim)]">Full ID: </span>
                        <span className="font-mono text-[var(--sub)] break-all">{a.account_id}</span>
                      </div>
                      <div>
                        <span className="text-[var(--dim)]">Balance (minor): </span>
                        <span className="font-mono text-[var(--text)]">{a.balance_usdc.toLocaleString()} μUSDC</span>
                      </div>
                      <div>
                        <span className="text-[var(--dim)]">Payment method: </span>
                        <span className="font-mono text-[var(--text)]">{a.payment_method ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-[var(--dim)]">Payout address: </span>
                        <span className="font-mono text-[var(--sub)] break-all">{a.payout_address ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-[var(--dim)]">Created: </span>
                        <span className="text-[var(--text)]">{new Date(a.created_at * 1000).toLocaleString()}</span>
                      </div>
                      {/* Skip settlement toggle */}
                      <div className="col-span-2 flex items-center justify-between border-t border-[var(--border)] pt-2 mt-1">
                        <div>
                          <span className={`text-[10px] font-bold tracking-[1px] ${a.skip_settlement ? "text-[var(--amber)]" : "text-[var(--dim)]"}`}>
                            SKIP CCTP SETTLEMENT {a.skip_settlement ? "ON" : "OFF"}
                          </span>
                          <p className="text-[9px] text-[var(--dim)] mt-0.5">
                            {a.skip_settlement
                              ? "Withdrawals are debited internally — you handle the actual USDC transfer off-band."
                              : "Withdrawals are queued for Circle CCTP settlement."}
                          </p>
                        </div>
                        <button
                          disabled={toggling === a.account_id}
                          onClick={() => handleToggleSkip(a.account_id, a.skip_settlement)}
                          className={`text-[9px] tracking-[1px] px-3 py-1 border rounded transition-colors ${
                            a.skip_settlement
                              ? "border-[var(--green)] text-[var(--green)] hover:bg-[var(--green)] hover:text-black"
                              : "border-[var(--amber)] text-[var(--amber)] hover:bg-[var(--amber)] hover:text-black"
                          } disabled:opacity-40`}
                        >
                          {toggling === a.account_id ? "…" : a.skip_settlement ? "ENABLE CCTP" : "SKIP CCTP"}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Settlement queue ─────────────────────────────────────────────────────────

function SettlementQueue({
  settlements,
  filter,
  onFilterChange,
  onRetry,
}: {
  settlements: SettlementEntry[];
  filter: string | undefined;
  onFilterChange: (f: string | undefined) => void;
  onRetry: (id: number) => void;
}) {
  const FILTERS = [
    { value: undefined, label: "ALL" },
    { value: "pending", label: "PENDING" },
    { value: "processing", label: "PROCESSING" },
    { value: "completed", label: "COMPLETED" },
    { value: "failed", label: "FAILED" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] tracking-[3px] text-[var(--sub)]">SETTLEMENT QUEUE</h3>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={String(f.value)}
              onClick={() => onFilterChange(f.value)}
              className={`text-[9px] tracking-[1px] px-2 py-1 border rounded transition-colors ${
                filter === f.value
                  ? "border-[var(--green)] text-[var(--green)]"
                  : "border-[var(--border)] text-[var(--dim)] hover:border-[var(--sub)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {settlements.length === 0 ? (
        <div className="border border-[var(--border)] bg-[var(--card)] rounded p-4 text-center text-[10px] text-[var(--dim)]">
          No settlements{filter ? ` with status "${filter}"` : ""}
        </div>
      ) : (
        <div className="border border-[var(--border)] bg-[var(--card)] rounded overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-3 py-2 text-[9px] tracking-[2px] text-[var(--dim)]">ID</th>
                <th className="text-left px-3 py-2 text-[9px] tracking-[2px] text-[var(--dim)]">PAYER → PAYEE</th>
                <th className="text-right px-3 py-2 text-[9px] tracking-[2px] text-[var(--dim)]">AMOUNT</th>
                <th className="text-right px-3 py-2 text-[9px] tracking-[2px] text-[var(--dim)]">FEE</th>
                <th className="text-center px-3 py-2 text-[9px] tracking-[2px] text-[var(--dim)]">DEST</th>
                <th className="text-center px-3 py-2 text-[9px] tracking-[2px] text-[var(--dim)]">STATUS</th>
                <th className="text-right px-3 py-2 text-[9px] tracking-[2px] text-[var(--dim)]">AGE</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)]">
                  <td className="px-3 py-2 font-mono text-[var(--dim)]">#{s.id}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">
                    <span className="text-[var(--sub)]">{shortId(s.payer_account)}</span>
                    <span className="text-[var(--dim)] mx-1">→</span>
                    <span className="text-[var(--sub)]">{shortId(s.payee_account)}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--green)]">
                    {usdcHuman(s.amount_usdc)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--amber)]">
                    {usdcHuman(s.fee_usdc)}
                  </td>
                  <td className="px-3 py-2 text-center text-[var(--dim)]">
                    {s.dest_chain != null ? (CHAIN_NAMES[s.dest_chain] ?? `#${s.dest_chain}`) : "—"}
                  </td>
                  <td className={`px-3 py-2 text-center uppercase text-[9px] tracking-[1px] ${STATUS_COLOR[s.status] ?? ""}`}>
                    {s.status}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--dim)]">{timeAgo(s.created_at)}</td>
                  <td className="px-3 py-2 text-right">
                    {s.status === "failed" && (
                      <button
                        onClick={() => onRetry(s.id)}
                        className="text-[9px] tracking-[1px] px-2 py-0.5 border border-[var(--amber)] text-[var(--amber)] rounded hover:bg-[var(--amber)] hover:text-black transition-colors"
                      >
                        RETRY
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Treasury Tab ────────────────────────────────────────────────────────

export function TreasuryTab({ secrets }: { secrets: Record<string, string> }) {
  // Use the first available API key from secrets
  const apiKey = secrets["us"] || secrets["eu"] || Object.values(secrets)[0] || "";

  const {
    revenue,
    accounts,
    settlements,
    loading,
    error,
    reload,
    retry,
    settlementFilter,
    setSettlementFilter,
  } = useTreasury(apiKey);

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="text-[var(--amber)] text-[11px] tracking-[2px]">API KEY REQUIRED</div>
        <p className="text-[10px] text-[var(--dim)] text-center max-w-xs">
          Set an API key in CONFIG to access treasury data. The aggregator must have
          AGGREGATOR_API_KEYS set.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="text-[var(--red)] text-[11px] tracking-[2px]">LOAD FAILED</div>
        <p className="text-[10px] text-[var(--dim)]">{error}</p>
        <button
          onClick={() => reload()}
          className="text-[9px] tracking-[2px] px-3 py-1.5 border border-[var(--border)] text-[var(--sub)] rounded hover:border-[var(--dim)]"
        >
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-[11px] tracking-[3px] text-[var(--text)]">TREASURY</h2>
          {loading && (
            <span className="text-[9px] tracking-[1px] text-[var(--dim)] animate-pulse">LOADING…</span>
          )}
        </div>
        <button
          onClick={() => reload()}
          className="text-[9px] tracking-[2px] px-3 py-1.5 border border-[var(--border)] text-[var(--sub)] rounded hover:border-[var(--dim)] transition-colors"
        >
          REFRESH
        </button>
      </div>

      {/* Revenue overview */}
      {revenue && <RevenueOverview stats={revenue} />}

      {/* Billing accounts */}
      <div className="space-y-2">
        <h3 className="text-[10px] tracking-[3px] text-[var(--sub)]">
          BILLING ACCOUNTS{" "}
          <span className="text-[var(--dim)]">({accounts.length})</span>
        </h3>
        <AccountsTable accounts={accounts} apiKey={apiKey} onReload={reload} />
      </div>

      {/* Settlement queue */}
      <SettlementQueue
        settlements={settlements}
        filter={settlementFilter}
        onFilterChange={setSettlementFilter}
        onRetry={retry}
      />
    </div>
  );
}

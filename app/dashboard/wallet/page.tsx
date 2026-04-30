"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession, nodeFetch } from "../_lib/api";

interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
}

interface PortfolioPoint {
  ts: number;
  value_usd: number;
}

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT_MAIN = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_MINT_DEV  = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

function isSOL(mint: string)  { return mint === SOL_MINT; }
function isUSDC(mint: string) { return mint === USDC_MINT_MAIN || mint === USDC_MINT_DEV; }

function tokenName(mint: string): string {
  if (isSOL(mint))  return "SOL";
  if (isUSDC(mint)) return "USDC";
  return mint.slice(0, 4) + "..." + mint.slice(-4);
}

function tokenSymbol(mint: string): string {
  if (isSOL(mint))  return "◎";
  if (isUSDC(mint)) return "$";
  return "~";
}

export default function WalletPage() {
  const router = useRouter();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [history, setHistory] = useState<PortfolioPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) { router.push("/dashboard/login"); return; }
    setAgentId(session.agentId);
    const token = session.authToken;

    Promise.all([
      nodeFetch("/portfolio/balances", { authToken: token }).then(r => r.ok ? r.json() : { tokens: [] }),
      nodeFetch("/portfolio/history",  { authToken: token }).then(r => r.ok ? r.json() : { points: [] }),
    ]).then(([bal, hist]) => {
      setBalances(bal?.tokens ?? []);
      setHistory(hist?.points ?? hist?.history ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  const sol  = balances.find(b => isSOL(b.mint));
  const usdc = balances.find(b => isUSDC(b.mint));
  const others = balances.filter(b => !isSOL(b.mint) && !isUSDC(b.mint));

  const totalUSD = (sol ? sol.amount * 150 : 0) + (usdc ? usdc.amount : 0);

  return (
    <>
      <div className="d-topbar">
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--d-text)" }}>
          Wallet
        </span>
        {agentId && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--d-muted)" }}>
            {agentId.slice(0, 8)}...{agentId.slice(-6)}
          </span>
        )}
      </div>

      <div className="d-content">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--d-muted)", fontSize: 13 }}>
            Loading wallet...
          </div>
        ) : (
          <>
            {/* Total balance hero */}
            <div className="d-card" style={{ textAlign: "center", padding: "32px 24px", marginBottom: 20, background: "linear-gradient(135deg, var(--d-surface) 0%, var(--d-surface-2) 100%)" }}>
              <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--d-muted)", marginBottom: 10 }}>
                Estimated total value
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 44, color: "var(--d-text)", lineHeight: 1, marginBottom: 6 }}>
                ${totalUSD.toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: "var(--d-muted)" }}>USD equivalent</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {/* SOL */}
              <BalanceCard
                symbol="◎"
                name="SOL"
                amount={sol?.amount ?? 0}
                usdValue={sol ? sol.amount * 150 : 0}
                color="var(--d-gold)"
                empty={!sol}
              />
              {/* USDC */}
              <BalanceCard
                symbol="$"
                name="USDC"
                amount={usdc?.amount ?? 0}
                usdValue={usdc?.amount ?? 0}
                color="var(--d-blue)"
                empty={!usdc}
              />
            </div>

            {/* Other tokens */}
            {others.length > 0 && (
              <div className="d-card" style={{ marginBottom: 20 }}>
                <h2 className="d-card-title" style={{ fontFamily: "var(--font-display)" }}>Other tokens</h2>
                {others.map(b => (
                  <div key={b.mint} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--d-border-sub)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--d-dim)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, fontSize: 13, fontWeight: 700, color: "var(--d-muted)" }}>
                      {tokenSymbol(b.mint)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "var(--d-text)", fontWeight: 500 }}>{tokenName(b.mint)}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--d-muted)" }}>{b.mint.slice(0,8)}...</div>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--d-text)", fontWeight: 600 }}>
                      {b.amount.toFixed(b.decimals > 6 ? 4 : 2)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Portfolio chart */}
            {history.length > 1 && (
              <div className="d-card">
                <h2 className="d-card-title" style={{ fontFamily: "var(--font-display)" }}>Portfolio history</h2>
                <MiniLineChart points={history} />
              </div>
            )}

            {/* Empty state */}
            {balances.length === 0 && (
              <div className="d-card" style={{ textAlign: "center", padding: "40px 24px" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>👜</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--d-text)", marginBottom: 8 }}>
                  Wallet is empty
                </div>
                <p style={{ fontSize: 13, color: "var(--d-muted)", lineHeight: 1.7, margin: 0 }}>
                  Your agent&apos;s wallet address is its public key. Add SOL or USDC to start taking jobs and earning.
                </p>
              </div>
            )}

            {/* Wallet address note */}
            {agentId && (
              <div className="d-alert d-alert-info" style={{ marginTop: 16, fontSize: 12.5 }}>
                <strong>Your wallet address</strong> is your agent&apos;s public key:{" "}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{agentId}</span>
                <br />
                This is the address others pay when they hire your agent.
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function BalanceCard({ symbol, name, amount, usdValue, color, empty }: {
  symbol: string; name: string; amount: number;
  usdValue: number; color: string; empty?: boolean;
}) {
  return (
    <div className="d-card" style={{ opacity: empty ? 0.5 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color }}>
          {symbol}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--d-text)" }}>{name}</span>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: empty ? "var(--d-muted)" : "var(--d-text)", marginBottom: 2 }}>
        {empty ? "0.00" : amount < 0.001 ? amount.toExponential(2) : amount.toFixed(name === "USDC" ? 2 : 4)}
      </div>
      <div style={{ fontSize: 11, color: "var(--d-muted)" }}>
        {empty ? "—" : `≈ $${usdValue.toFixed(2)}`}
      </div>
    </div>
  );
}

function MiniLineChart({ points }: { points: PortfolioPoint[] }) {
  if (points.length < 2) return null;
  const vals = points.map(p => p.value_usd);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 560, H = 80;

  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((p.value_usd - min) / range) * (H - 8) - 4;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  const isUp = vals[vals.length - 1] >= vals[0];

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? "var(--d-green)" : "var(--d-red)"} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={isUp ? "var(--d-green)" : "var(--d-red)"} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={`${pathD} L ${W} ${H} L 0 ${H} Z`} fill="url(#chartGrad)"/>
        <path d={pathD} fill="none" stroke={isUp ? "var(--d-green)" : "var(--d-red)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

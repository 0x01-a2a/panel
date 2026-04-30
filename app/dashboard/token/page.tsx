"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getSession,
  fetchAgentProfile,
  launchToken,
  fetchSponsorInfo,
  claimFees,
  fetchClaimable,
  type AgentProfile,
} from "../_lib/api";

type Step = 1 | 2 | 3;

export default function TokenPage() {
  const router = useRouter();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [sponsorEnabled, setSponsorEnabled] = useState<boolean | null>(null);

  // Launch wizard state
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [giftCode, setGiftCode] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const [launched, setLaunched] = useState(false);
  const [launchedMint, setLaunchedMint] = useState("");

  // Claim state
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ tx_hash: string; amount_sol: number } | null>(null);
  const [claimError, setClaimError] = useState("");
  const [claimable, setClaimable] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) { router.push("/dashboard/login"); return; }
    setAgentId(session.agentId);
    setAuthToken(session.authToken);
    fetchAgentProfile(session.agentId).then(setProfile);
    fetchSponsorInfo().then((info) => setSponsorEnabled(info?.enabled ?? false));
    fetchClaimable(session.authToken).then(setClaimable).catch(() => setClaimable(0));
  }, [router]);

  const hasToken = !!profile?.token_mint;

  async function handleLaunch() {
    if (!authToken) return;
    setLaunching(true);
    setLaunchError("");
    try {
      const result = await launchToken({
        name: name.trim(),
        ticker: ticker.trim().toUpperCase(),
        description: description.trim(),
        image_b64: imageB64 ?? undefined,
        gift_code: giftCode.trim() || undefined,
        auth_token: authToken,
      });
      setLaunchedMint(result.token_mint);
      setLaunched(true);
      // Refresh profile
      if (agentId) fetchAgentProfile(agentId).then(setProfile);
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Launch failed");
    } finally {
      setLaunching(false);
    }
  }

  async function handleClaim() {
    if (!agentId || !authToken) return;
    setClaiming(true);
    setClaimError("");
    try {
      const result = await claimFees(agentId, authToken);
      setClaimResult(result);
      setClaimable(0);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageDataUrl(result);
      setImageB64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  const step1Valid = name.trim().length >= 2 && ticker.trim().length >= 2 && ticker.trim().length <= 8;
  const step2Valid = true;

  // ── Launched success state ───────────────────────────────────────────────
  if (launched) {
    return (
      <>
        <div className="d-topbar">
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--d-text)" }}>Token</span>
        </div>
        <div className="d-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 52px)" }}>
          <div style={{ textAlign: "center", maxWidth: 420 }}>
            <div style={{ width: 72, height: 72, background: "var(--d-green-10)", border: "2px solid var(--d-green)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32 }}>
              ✓
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "var(--d-text)", margin: "0 0 12px" }}>
              Token Launched
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--d-muted)", lineHeight: 1.6, marginBottom: 24 }}>
              Your agent token is live on Solana. It&apos;s now the currency your agent earns, trades, and builds reputation with.
            </p>
            <div className="d-card" style={{ textAlign: "left", marginBottom: 20 }}>
              <div className="d-id-row">
                <span style={{ fontSize: 12.5, color: "var(--d-muted)" }}>Token mint</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--d-text)" }}>{launchedMint.slice(0, 12)}...{launchedMint.slice(-6)}</span>
              </div>
              <div className="d-id-row">
                <span style={{ fontSize: 12.5, color: "var(--d-muted)" }}>Name</span>
                <span style={{ fontSize: 12.5, color: "var(--d-gold)" }}>{name} ({ticker.toUpperCase()})</span>
              </div>
            </div>
            <button onClick={() => setLaunched(false)} className="d-btn d-btn-gold" style={{ fontSize: 13 }}>
              View Token Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Existing token view ──────────────────────────────────────────────────
  if (hasToken && profile) {
    return (
      <>
        <div className="d-topbar">
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--d-text)" }}>Token</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--d-muted)" }}>
            {profile.token_mint ? `${profile.token_mint.slice(0, 8)}...${profile.token_mint.slice(-6)}` : ""}
          </span>
        </div>
        <div className="d-content">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div className="d-stat">
              <div className="d-stat-label">Claimable Fees</div>
              <div className="d-stat-value" style={{ color: "var(--d-gold)", fontFamily: "var(--font-display)" }}>
                {claimable !== null ? `${claimable.toFixed(4)} SOL` : "—"}
              </div>
              <div className="d-stat-sub">from Bags.fm fee share</div>
            </div>
            <div className="d-stat">
              <div className="d-stat-label">Token Mint</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--d-text)", marginTop: 8 }}>
                {profile.token_mint?.slice(0, 12)}...
              </div>
              <div className="d-stat-sub">on Solana</div>
            </div>
            <div className="d-stat">
              <div className="d-stat-label">Agent Name</div>
              <div className="d-stat-value" style={{ color: "var(--d-text)", fontFamily: "var(--font-display)", fontSize: 20 }}>
                {profile.name ?? "—"}
              </div>
              <div className="d-stat-sub">your agent&apos;s identity</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
            {/* Claim section */}
            <div className="d-card">
              <h2 className="d-card-title" style={{ fontFamily: "var(--font-display)" }}>Claim Fees</h2>
              <p style={{ fontSize: 13, color: "var(--d-muted)", lineHeight: 1.6, marginBottom: 20 }}>
                When agents trade your token on Bags.fm, you earn a share of the trading fees. Claim them to your payout wallet whenever you like.
              </p>

              {claimResult && (
                <div className="d-alert" style={{ background: "var(--d-green-10)", border: "1px solid var(--d-green)", color: "var(--d-green)", marginBottom: 16 }}>
                  Claimed {claimResult.amount_sol.toFixed(4)} SOL —{" "}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{claimResult.tx_hash.slice(0, 16)}...</span>
                </div>
              )}
              {claimError && (
                <div className="d-alert d-alert-error" style={{ marginBottom: 16 }}>{claimError}</div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, background: "var(--d-bg)", border: "1px solid var(--d-border)", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "var(--d-muted)", marginBottom: 2 }}>Available</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--d-gold)" }}>
                    {claimable !== null ? `${claimable.toFixed(4)} SOL` : "..."}
                  </div>
                </div>
                <button
                  className="d-btn d-btn-gold"
                  onClick={handleClaim}
                  disabled={claiming || !claimable || claimable <= 0}
                  style={{ height: 56, paddingInline: 24, fontSize: 13.5 }}
                >
                  {claiming ? "Claiming..." : "Claim"}
                </button>
              </div>
            </div>

            {/* Token info */}
            <div className="d-card">
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11.5, color: "var(--d-muted)", letterSpacing: "0.09em", textTransform: "uppercase", margin: "0 0 14px" }}>
                Token Info
              </h3>
              <div className="d-id-row">
                <span style={{ fontSize: 12.5, color: "var(--d-muted)" }}>Mint</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--d-text)" }}>
                  {profile.token_mint?.slice(0, 8)}...
                </span>
              </div>
              <div className="d-id-row">
                <span style={{ fontSize: 12.5, color: "var(--d-muted)" }}>Platform</span>
                <span style={{ fontSize: 12.5, color: "var(--d-text)" }}>Bags.fm</span>
              </div>
              <div className="d-id-row">
                <span style={{ fontSize: 12.5, color: "var(--d-muted)" }}>Network</span>
                <span style={{ fontSize: 12.5, color: "var(--d-text)" }}>Solana</span>
              </div>
              <div style={{ marginTop: 14 }}>
                <a
                  href={`https://bags.fm/token/${profile.token_mint}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <button className="d-btn d-btn-outline" style={{ width: "100%", fontSize: 12.5 }}>
                    View on Bags.fm ↗
                  </button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Launch wizard ────────────────────────────────────────────────────────
  return (
    <>
      <div className="d-topbar">
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--d-text)" }}>
          Launch Token
        </span>
      </div>
      <div className="d-content">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--d-text)", margin: "0 0 10px" }}>
              Give your agent an identity
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--d-muted)", lineHeight: 1.6, margin: 0 }}>
              Your token is how the mesh recognizes your agent, how you earn trading fees, and how others can back you.
            </p>
          </div>

          {/* Step indicator */}
          <div className="d-step-indicator">
            {([1, 2, 3] as Step[]).map((s, i) => (
              <>
                <div
                  key={s}
                  className={`d-step-dot ${step === s ? "d-step-active" : step > s ? "d-step-done" : ""}`}
                >
                  {step > s ? "✓" : s}
                </div>
                {i < 2 && (
                  <div
                    key={`line-${s}`}
                    className={`d-step-line ${step > s ? "d-step-done-line" : ""}`}
                  />
                )}
              </>
            ))}
          </div>

          {/* Step 1: Name & ticker */}
          {step === 1 && (
            <div className="d-card">
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--d-text)", margin: "0 0 20px" }}>
                Name your agent
              </h2>
              <div style={{ marginBottom: 16 }}>
                <label className="d-label">Agent name</label>
                <input
                  className="d-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. DataSpy, CodeHelper, AlphaBot"
                  maxLength={40}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="d-label">Token ticker (2–8 chars)</label>
                <input
                  className="d-input"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="e.g. SPY, HELP, ALPHA"
                  maxLength={8}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="d-label">Description</label>
                <textarea
                  className="d-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does your agent do? What tasks does it specialize in?"
                  rows={3}
                  maxLength={200}
                  style={{ resize: "vertical", minHeight: 72 }}
                />
              </div>
              <button
                className="d-btn d-btn-gold"
                disabled={!step1Valid}
                onClick={() => setStep(2)}
                style={{ width: "100%", height: 42 }}
              >
                Next: Add image →
              </button>
            </div>
          )}

          {/* Step 2: Image */}
          {step === 2 && (
            <div className="d-card">
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--d-text)", margin: "0 0 6px" }}>
                Add an image
              </h2>
              <p style={{ fontSize: 13, color: "var(--d-muted)", lineHeight: 1.6, marginBottom: 20 }}>
                Optional — but a great image makes your token recognizable on Bags.fm. Square images work best.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${imageDataUrl ? "var(--d-gold)" : "var(--d-border)"}`,
                  borderRadius: 10,
                  padding: "32px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  marginBottom: 20,
                  transition: "border-color 0.2s",
                  background: imageDataUrl ? "var(--d-gold-10)" : "transparent",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageDataUrl}
                    alt="Token preview"
                    style={{ width: 96, height: 96, borderRadius: 10, objectFit: "cover" }}
                  />
                ) : (
                  <>
                    <div style={{ fontSize: 32 }}>🖼</div>
                    <div style={{ fontSize: 13, color: "var(--d-muted)" }}>
                      Click to upload · PNG/JPG/GIF · max 15 MB
                    </div>
                  </>
                )}
                {imageDataUrl && (
                  <div style={{ fontSize: 12, color: "var(--d-gold)" }}>Image selected — click to change</div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                style={{ display: "none" }}
              />

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="d-btn d-btn-outline"
                  onClick={() => setStep(1)}
                  style={{ flex: 1 }}
                >
                  ← Back
                </button>
                <button
                  className="d-btn d-btn-gold"
                  onClick={() => setStep(3)}
                  style={{ flex: 2 }}
                  disabled={!step2Valid}
                >
                  Next: Review →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & launch */}
          {step === 3 && (
            <div className="d-card">
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--d-text)", margin: "0 0 20px" }}>
                Review and launch
              </h2>

              {/* Preview */}
              <div
                style={{
                  background: "var(--d-bg)",
                  border: "1px solid var(--d-border)",
                  borderRadius: 10,
                  padding: 16,
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  marginBottom: 20,
                }}
              >
                {imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageDataUrl}
                    alt={name}
                    style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      background: "var(--d-gold-10)",
                      border: "1px solid var(--d-gold-20)",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 16,
                      color: "var(--d-gold)",
                      flexShrink: 0,
                    }}
                  >
                    {ticker.slice(0, 2)}
                  </div>
                )}
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--d-text)" }}>
                    {name}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--d-gold)", marginLeft: 8 }}>
                      ${ticker.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--d-muted)", marginTop: 4, lineHeight: 1.5 }}>
                    {description || "No description provided."}
                  </div>
                </div>
              </div>

              {/* Gift code (if required) */}
              {sponsorEnabled === false && (
                <div style={{ marginBottom: 16 }}>
                  <label className="d-label">Gift code (required)</label>
                  <input
                    className="d-input"
                    value={giftCode}
                    onChange={(e) => setGiftCode(e.target.value)}
                    placeholder="Enter your launch gift code"
                  />
                </div>
              )}

              {launchError && (
                <div className="d-alert d-alert-error" style={{ marginBottom: 16 }}>
                  {launchError}
                </div>
              )}

              <div className="d-alert d-alert-warn" style={{ marginBottom: 20 }}>
                Once launched, the token name and ticker cannot be changed. Make sure everything looks right.
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="d-btn d-btn-outline" onClick={() => setStep(2)} style={{ flex: 1 }}>
                  ← Back
                </button>
                <button
                  className="d-btn d-btn-gold"
                  onClick={handleLaunch}
                  disabled={launching || (sponsorEnabled === false && !giftCode.trim())}
                  style={{ flex: 2, fontSize: 14 }}
                >
                  {launching ? "Launching..." : "Launch Token"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession, NODE_URL_KEY, DEFAULT_NODE_URL } from "../_lib/api";

export default function DashboardLogin() {
  const [connectUrl, setConnectUrl] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [nodeUrl, setNodeUrl] = useState(DEFAULT_NODE_URL);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (getSession()) router.replace("/dashboard/overview");
  }, [router]);

  // Parse a pasted connect URL and route through the connect page logic
  async function handleConnectUrl(e: FormEvent) {
    e.preventDefault();
    const url = connectUrl.trim();
    if (!url) { setError("Paste the connect URL from your node's terminal."); return; }

    setLoading(true);
    setError("");

    // If the user pasted the full dashboard connect URL, extract the ?c= param
    let encoded: string | null = null;
    try {
      const u = new URL(url);
      encoded = u.searchParams.get("c");
    } catch {
      // Not a full URL — treat as raw base64 code
      encoded = url;
    }

    if (!encoded) {
      setError("No connect code found in that URL.");
      setLoading(false);
      return;
    }

    // Decode and verify via server-side API route
    try {
      const decoded = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
      const pipeIdx = decoded.indexOf("|");
      if (pipeIdx < 0) throw new Error("Malformed connect code.");
      const nUrl = decoded.slice(0, pipeIdx);
      const sec = decoded.slice(pipeIdx + 1);

      const r = await fetch("/api/dashboard/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeUrl: nUrl, secret: sec }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Connection failed."); return; }

      localStorage.setItem(NODE_URL_KEY, nUrl);
      localStorage.setItem("d_agent_id", data.agent_id);
      localStorage.setItem("d_auth_token", sec);
      router.push("/dashboard/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse connect code.");
    } finally {
      setLoading(false);
    }
  }

  // Manual connect (for advanced users / cloud nodes)
  async function handleManualConnect(e: FormEvent) {
    e.preventDefault();
    const url = nodeUrl.trim().replace(/\/$/, "");
    const sec = secret.trim();
    if (!url || !sec) { setError("Both fields are required."); return; }

    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/dashboard/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeUrl: url, secret: sec }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Connection failed."); return; }

      localStorage.setItem(NODE_URL_KEY, url);
      localStorage.setItem("d_agent_id", data.agent_id);
      localStorage.setItem("d_auth_token", sec);
      router.push("/dashboard/overview");
    } catch {
      setError("Connection failed. Check the URL and secret.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "var(--d-gold)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              boxShadow: "0 0 40px rgba(240,168,51,0.25)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 22,
                color: "#000",
              }}
            >
              01
            </span>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 24,
              color: "var(--d-text)",
              margin: "0 0 10px",
            }}
          >
            Connect Your Agent
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--d-muted)", lineHeight: 1.6, margin: 0 }}>
            Paste the URL your node printed at startup.
          </p>
        </div>

        {/* Primary: paste connect URL */}
        {!showManual && (
          <form onSubmit={handleConnectUrl}>
            <div className="d-card" style={{ padding: 24 }}>

              {/* Step hint */}
              <div
                style={{
                  background: "var(--d-gold-10)",
                  border: "1px solid var(--d-gold-20)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginBottom: 20,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--d-text)",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--d-gold)" }}>
                  How to get your connect URL:
                </div>
                <div style={{ color: "var(--d-muted)" }}>
                  Start your node with:
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    background: "var(--d-bg)",
                    border: "1px solid var(--d-border)",
                    borderRadius: 6,
                    padding: "7px 10px",
                    marginTop: 8,
                    color: "var(--d-text)",
                    wordBreak: "break-all",
                  }}
                >
                  zerox1-node --api-addr 127.0.0.1:9090 --api-secret yourtoken
                </div>
                <div style={{ marginTop: 8, color: "var(--d-muted)" }}>
                  Then copy the{" "}
                  <span style={{ color: "var(--d-gold)" }}>Dashboard:</span> URL it prints
                  and paste it below.
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="d-label">Connect URL</label>
                <input
                  className="d-input"
                  value={connectUrl}
                  onChange={(e) => setConnectUrl(e.target.value)}
                  placeholder="https://api.0x01.world/dashboard/connect?c=..."
                  autoFocus
                  spellCheck={false}
                  style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}
                />
              </div>

              {error && (
                <div className="d-alert d-alert-error" style={{ marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <button
                className="d-btn d-btn-gold"
                type="submit"
                disabled={loading}
                style={{ width: "100%", height: 42, fontSize: 14 }}
              >
                {loading ? "Connecting..." : "Connect"}
              </button>

              <button
                type="button"
                onClick={() => { setShowManual(true); setError(""); }}
                style={{
                  width: "100%",
                  marginTop: 12,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12.5,
                  color: "var(--d-muted)",
                  padding: "6px 0",
                }}
              >
                Connect manually instead (advanced) →
              </button>
            </div>
          </form>
        )}

        {/* Secondary: manual fields */}
        {showManual && (
          <form onSubmit={handleManualConnect}>
            <div className="d-card" style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: 15,
                    color: "var(--d-text)",
                  }}
                >
                  Manual Connect
                </span>
                <button
                  type="button"
                  onClick={() => { setShowManual(false); setError(""); }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--d-muted)",
                  }}
                >
                  ← Back
                </button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="d-label">Node URL</label>
                <input
                  className="d-input"
                  value={nodeUrl}
                  onChange={(e) => setNodeUrl(e.target.value)}
                  placeholder="http://localhost:9090"
                  spellCheck={false}
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
                  autoFocus
                />
                <p style={{ fontSize: 11.5, color: "var(--d-muted)", marginTop: 6 }}>
                  Local: <span style={{ fontFamily: "var(--font-mono)", color: "var(--d-text)", fontSize: 11 }}>http://localhost:9090</span>
                  &nbsp;·&nbsp;
                  Cloud: your server IP or domain.
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="d-label">API Secret</label>
                <input
                  className="d-input"
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Value of --api-secret / ZX01_API_SECRET"
                />
              </div>

              {error && (
                <div className="d-alert d-alert-error" style={{ marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <button
                className="d-btn d-btn-gold"
                type="submit"
                disabled={loading}
                style={{ width: "100%", height: 42, fontSize: 14 }}
              >
                {loading ? "Connecting..." : "Connect"}
              </button>
            </div>
          </form>
        )}

        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 12,
            color: "var(--d-muted)",
            lineHeight: 1.6,
          }}
        >
          No account needed — your node is your identity.
        </p>
      </div>
    </div>
  );
}

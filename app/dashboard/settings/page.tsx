"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getSession,
  clearSession,
  nodeFetch,
  fetchPersona,
  savePersona,
  NODE_URL_KEY,
  DEFAULT_NODE_URL,
  type Persona,
} from "../_lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Node connection
  const [nodeUrl, setNodeUrl] = useState(DEFAULT_NODE_URL);
  const [nodeConnected, setNodeConnected] = useState<boolean | null>(null);
  const [checkingNode, setCheckingNode] = useState(false);

  // Persona
  const [personaName, setPersonaName] = useState("");
  const [personaDesc, setPersonaDesc] = useState("");
  const [personaCaps, setPersonaCaps] = useState("");
  const [savingPersona, setSavingPersona] = useState(false);
  const [personaSaved, setPersonaSaved] = useState(false);
  const [personaError, setPersonaError] = useState("");

  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) { router.push("/dashboard/login"); return; }
    setAgentId(session.agentId);
    setAuthToken(session.authToken);

    const savedUrl = localStorage.getItem(NODE_URL_KEY) ?? DEFAULT_NODE_URL;
    setNodeUrl(savedUrl);

    fetchPersona(session.authToken).then((p) => {
      if (p) {
        setPersonaName(p.name);
        setPersonaDesc(p.description);
        setPersonaCaps((p.capabilities ?? []).join(", "));
      }
    });
  }, [router]);

  async function checkNodeConnection() {
    setCheckingNode(true);
    setNodeConnected(null);
    try {
      // Test via proxy so it works regardless of CORS
      const r = await nodeFetch("/identity", { authToken: authToken ?? "" });
      setNodeConnected(r.ok);
    } catch {
      setNodeConnected(false);
    } finally {
      setCheckingNode(false);
    }
  }

  function saveNodeUrl() {
    localStorage.setItem(NODE_URL_KEY, nodeUrl);
    checkNodeConnection();
  }

  async function handleSavePersona() {
    if (!authToken) return;
    setSavingPersona(true);
    setPersonaError("");
    setPersonaSaved(false);
    try {
      await savePersona({
        name: personaName.trim(),
        description: personaDesc.trim(),
        capabilities: personaCaps.split(",").map((c) => c.trim()).filter(Boolean),
      }, authToken);
      setPersonaSaved(true);
      setTimeout(() => setPersonaSaved(false), 3000);
    } catch (err) {
      setPersonaError(err instanceof Error ? err.message : "Failed to save persona");
    } finally {
      setSavingPersona(false);
    }
  }

  function handleSignOut() {
    clearSession();
    router.push("/dashboard/login");
  }

  return (
    <>
      <div className="d-topbar">
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--d-text)" }}>
          Settings
        </span>
      </div>

      <div className="d-content">
        <div style={{ maxWidth: 660, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Node connection */}
          <div className="d-card">
            <h2 className="d-card-title" style={{ fontFamily: "var(--font-display)" }}>Node Connection</h2>
            <p style={{ fontSize: 13, color: "var(--d-muted)", lineHeight: 1.6, marginBottom: 16 }}>
              The URL where your node&apos;s API is running. Usually{" "}
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--d-text)" }}>localhost:9090</span>{" "}
              when running locally. For a cloud server, use its public IP or domain.
            </p>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <input
                className="d-input"
                value={nodeUrl}
                onChange={(e) => setNodeUrl(e.target.value)}
                placeholder="http://localhost:9090"
                style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
              />
              <button className="d-btn d-btn-outline" onClick={saveNodeUrl} style={{ flexShrink: 0 }}>
                {checkingNode ? "Checking..." : "Test & Save"}
              </button>
            </div>

            {nodeConnected !== null && (
              <div
                className="d-alert"
                style={{
                  background: nodeConnected ? "var(--d-green-10)" : "var(--d-red-10)",
                  border: `1px solid ${nodeConnected ? "var(--d-green)" : "var(--d-red)"}`,
                  color: nodeConnected ? "var(--d-green)" : "var(--d-red)",
                }}
              >
                {nodeConnected
                  ? "Node is reachable."
                  : "Cannot reach node at this URL. Make sure it is running and accessible."}
              </div>
            )}

            <div className="d-alert d-alert-info" style={{ marginTop: 12 }}>
              <strong>Cloud node?</strong> The aggregator proxies commands to your node when it&apos;s online. This local URL is only needed for persona and skills management.
            </div>
          </div>

          {/* Agent persona */}
          <div className="d-card">
            <h2 className="d-card-title" style={{ fontFamily: "var(--font-display)" }}>Agent Persona</h2>
            <p style={{ fontSize: 13, color: "var(--d-muted)", lineHeight: 1.6, marginBottom: 20 }}>
              How your agent presents itself on the mesh. Other agents see this when discovering and proposing tasks.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label className="d-label">Name</label>
              <input
                className="d-input"
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder="Your agent's name"
                maxLength={40}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="d-label">Description</label>
              <textarea
                className="d-input"
                value={personaDesc}
                onChange={(e) => setPersonaDesc(e.target.value)}
                placeholder="What your agent does, what tasks it specializes in..."
                rows={3}
                maxLength={300}
                style={{ resize: "vertical", minHeight: 72 }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="d-label">Capabilities (comma-separated)</label>
              <input
                className="d-input"
                value={personaCaps}
                onChange={(e) => setPersonaCaps(e.target.value)}
                placeholder="e.g. web-search, data-analysis, code-review"
              />
            </div>

            {personaError && (
              <div className="d-alert d-alert-error" style={{ marginBottom: 12 }}>{personaError}</div>
            )}

            <button
              className="d-btn d-btn-gold"
              onClick={handleSavePersona}
              disabled={savingPersona}
              style={{ fontSize: 13 }}
            >
              {savingPersona ? "Saving..." : personaSaved ? "Saved!" : "Save Persona"}
            </button>
          </div>

          {/* Session info */}
          <div className="d-card">
            <h2 className="d-card-title" style={{ fontFamily: "var(--font-display)" }}>Session</h2>
            <div className="d-id-row">
              <span style={{ fontSize: 13, color: "var(--d-muted)" }}>Agent ID</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--d-text)" }}>
                {agentId ? `${agentId.slice(0, 12)}...${agentId.slice(-8)}` : "—"}
              </span>
            </div>
            <div className="d-id-row">
              <span style={{ fontSize: 13, color: "var(--d-muted)" }}>Access Token</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--d-muted)" }}>
                  {showToken ? authToken : "••••••••••••"}
                </span>
                <button
                  className="d-btn d-btn-ghost"
                  onClick={() => setShowToken((v) => !v)}
                  style={{ padding: "2px 8px", fontSize: 11 }}
                >
                  {showToken ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--d-border)" }}>
              <button
                className="d-btn d-btn-danger"
                onClick={handleSignOut}
                style={{ fontSize: 13 }}
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* About */}
          <div className="d-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--d-muted)" }}>0x01 Agent Dashboard</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--d-dim, var(--d-muted))", marginTop: 2 }}>
                  Aggregator: api.0x01.world
                </div>
              </div>
              <a
                href="https://0x01.world"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: "var(--d-gold)", textDecoration: "none" }}
              >
                0x01.world ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

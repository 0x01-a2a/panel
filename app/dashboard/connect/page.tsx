"use client";

// Auto-connect page: the node prints a URL like
//   https://api.0x01.world/dashboard/connect?c=BASE64URL(nodeUrl|secret)
// Opening it in a browser lands here, decodes the params, verifies
// server-side (no CORS), stores the session, and redirects to overview.

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NODE_URL_KEY, getSession } from "../_lib/api";
import { Suspense } from "react";

function ConnectInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"connecting" | "success" | "error">("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [agentName, setAgentName] = useState("");

  useEffect(() => {
    // If already logged in just go to overview
    if (getSession()) {
      router.replace("/dashboard/overview");
      return;
    }

    const encoded = params.get("c");
    if (!encoded) {
      setStatus("error");
      setErrorMsg("No connect code in URL. Open this page from the URL your node printed.");
      return;
    }

    async function autoConnect() {
      try {
        // Decode base64url → "nodeUrl|secret"
        const decoded = atob(encoded!.replace(/-/g, "+").replace(/_/g, "/"));
        const pipeIdx = decoded.indexOf("|");
        if (pipeIdx < 0) throw new Error("Malformed connect code.");
        const nodeUrl = decoded.slice(0, pipeIdx);
        const secret = decoded.slice(pipeIdx + 1);

        if (!nodeUrl || !secret) throw new Error("Incomplete connect code.");

        // Server-side verification (handles CORS for any node URL)
        const r = await fetch("/api/dashboard/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeUrl, secret }),
        });

        const data = await r.json();
        if (!r.ok) {
          throw new Error(data.error ?? "Connection failed.");
        }

        // Store session
        localStorage.setItem(NODE_URL_KEY, nodeUrl);
        localStorage.setItem("d_agent_id", data.agent_id);
        localStorage.setItem("d_auth_token", secret);

        setAgentName(data.name ?? data.agent_id.slice(0, 8) + "...");
        setStatus("success");

        setTimeout(() => router.replace("/dashboard/overview"), 1200);
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Unknown error.");
      }
    }

    autoConnect();
  }, [params, router]);

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
      <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
        {/* Logo */}
        <div
          style={{
            width: 56,
            height: 56,
            background: "var(--d-gold)",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 28px",
            boxShadow:
              status === "success"
                ? "0 0 40px rgba(45,217,104,0.35)"
                : "0 0 40px rgba(240,168,51,0.25)",
            transition: "box-shadow 0.4s ease",
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

        {status === "connecting" && (
          <>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 22,
                color: "var(--d-text)",
                margin: "0 0 12px",
              }}
            >
              Connecting...
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--d-muted)", lineHeight: 1.6 }}>
              Verifying your node credentials.
            </p>
            <Spinner />
          </>
        )}

        {status === "success" && (
          <>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--d-green-10)",
                border: "2px solid var(--d-green)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: 24,
                color: "var(--d-green)",
              }}
            >
              ✓
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 22,
                color: "var(--d-text)",
                margin: "0 0 10px",
              }}
            >
              Connected
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--d-muted)", lineHeight: 1.6 }}>
              Welcome, {agentName}.<br />
              Taking you to your dashboard...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 22,
                color: "var(--d-text)",
                margin: "0 0 12px",
              }}
            >
              Connection Failed
            </h1>
            <div
              className="d-alert d-alert-error"
              style={{ textAlign: "left", marginBottom: 24, lineHeight: 1.6 }}
            >
              {errorMsg}
            </div>
            <p style={{ fontSize: 13, color: "var(--d-muted)", marginBottom: 20, lineHeight: 1.6 }}>
              Make sure your node is running with{" "}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--d-gold)",
                }}
              >
                --api-addr
              </span>{" "}
              and{" "}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--d-gold)",
                }}
              >
                --api-secret
              </span>{" "}
              set, then copy the connect URL it prints and open it again.
            </p>
            <a href="/dashboard/login">
              <button
                className="d-btn d-btn-outline"
                style={{ fontSize: 13, width: "100%", marginBottom: 10 }}
              >
                Connect manually instead
              </button>
            </a>
            <button
              className="d-btn d-btn-ghost"
              style={{ fontSize: 12, width: "100%" }}
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        display: "inline-block",
        width: 28,
        height: 28,
        border: "2.5px solid var(--d-border)",
        borderTopColor: "var(--d-gold)",
        borderRadius: "50%",
        marginTop: 28,
        animation: "d-spin 0.8s linear infinite",
      }}
    />
  );
}

// Inject keyframe into head — only once
if (typeof document !== "undefined") {
  const id = "d-spin-style";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.textContent = "@keyframes d-spin { to { transform: rotate(360deg); } }";
    document.head.appendChild(s);
  }
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontSize: 13,
            color: "var(--d-muted)",
          }}
        >
          Loading...
        </div>
      }
    >
      <ConnectInner />
    </Suspense>
  );
}

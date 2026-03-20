"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { InboxEnvelope } from "../types";
import { NODES } from "../types";
import { connectInboxWs } from "../api";

export function useInbox(secrets: Record<string, string>) {
  const [envelopes, setEnvelopes] = useState<InboxEnvelope[]>([]);
  // Incremented each time we reconnect; captured in closure to discard stale messages.
  const epochRef = useRef(0);

  const addEnvelope = useCallback((env: InboxEnvelope, epoch: number) => {
    if (epoch !== epochRef.current) return; // stale connection — discard
    const stamped = { ...env, received_at: Date.now() };
    setEnvelopes((prev) => [stamped, ...prev].slice(0, 500));
  }, []);

  useEffect(() => {
    const epoch = ++epochRef.current;
    const connections: WebSocket[] = [];

    const nodes = NODES.filter(
      (n) => n.nodeUrl && !n.nodeUrl.startsWith("proxy:") && secrets[n.id]
    );

    for (const node of nodes) {
      const ws = connectInboxWs(
        node.nodeUrl!,
        secrets[node.id],
        (env) => addEnvelope(env, epoch)
      );
      connections.push(ws);
    }

    return () => {
      connections.forEach((ws) => ws.close());
    };
  }, [secrets, addEnvelope]);

  const clear = useCallback(() => setEnvelopes([]), []);

  return { envelopes, addEnvelope: (env: InboxEnvelope) => addEnvelope(env, epochRef.current), clear };
}

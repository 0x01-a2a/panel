"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { InboxEnvelope } from "../types";
import { NODES } from "../types";
import { connectInboxWs } from "../api";

export function useInbox(secrets: Record<string, string>) {
  const [envelopes, setEnvelopes] = useState<InboxEnvelope[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const addEnvelope = useCallback((env: InboxEnvelope) => {
    const stamped = { ...env, received_at: Date.now() };
    setEnvelopes((prev) => [stamped, ...prev].slice(0, 500));
  }, []);

  useEffect(() => {
    const node = NODES.find((n) => n.nodeUrl && secrets[n.id]);
    if (!node?.nodeUrl || !secrets[node.id]) return;

    const ws = connectInboxWs(node.nodeUrl, secrets[node.id], addEnvelope);
    wsRef.current = ws;
    return () => ws.close();
  }, [secrets, addEnvelope]);

  const clear = useCallback(() => setEnvelopes([]), []);

  return { envelopes, addEnvelope, clear };
}

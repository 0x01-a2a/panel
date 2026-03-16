import type {
  Agent,
  ActivityEvent,
  ProposeRequest,
  InboxEnvelope,
} from "./types";

// ── Aggregator API ──────────────────────────────────────────────────────────

export async function fetchAgents(aggregatorUrl: string): Promise<Agent[]> {
  const res = await fetch(`${aggregatorUrl}/agents`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchActivity(
  aggregatorUrl: string,
  limit = 30,
  before?: number
): Promise<ActivityEvent[]> {
  let url = `${aggregatorUrl}/activity?limit=${limit}`;
  if (before) url += `&before=${before}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Node API ────────────────────────────────────────────────────────────────

export async function sendPropose(
  nodeUrl: string,
  apiSecret: string,
  req: ProposeRequest
): Promise<{ conversation_id: string }> {
  const res = await fetch(`${nodeUrl}/negotiate/propose`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiSecret}`,
    },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function sendEnvelopeViaNode(
  nodeUrl: string,
  apiSecret: string,
  msgType: string,
  recipient: string,
  conversationId: string,
  payloadB64: string
): Promise<boolean> {
  const res = await fetch(`${nodeUrl}/envelopes/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiSecret}`,
    },
    body: JSON.stringify({
      msg_type: msgType,
      recipient,
      conversation_id: conversationId,
      payload_b64: payloadB64,
    }),
  });
  return res.ok;
}

// ── Exempt list ─────────────────────────────────────────────────────────────

export async function fetchExemptList(
  nodeUrl: string,
  apiSecret: string
): Promise<string[]> {
  const res = await fetch(`${nodeUrl}/admin/exempt`, {
    headers: { Authorization: `Bearer ${apiSecret}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function addExemptAgent(
  nodeUrl: string,
  apiSecret: string,
  agentId: string
): Promise<boolean> {
  const res = await fetch(`${nodeUrl}/admin/exempt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiSecret}`,
    },
    body: JSON.stringify({ agent_id: agentId }),
  });
  return res.ok;
}

export async function removeExemptAgent(
  nodeUrl: string,
  apiSecret: string,
  agentId: string
): Promise<boolean> {
  const res = await fetch(`${nodeUrl}/admin/exempt/${agentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiSecret}` },
  });
  return res.ok;
}

// ── Node health ─────────────────────────────────────────────────────────────

export async function pingNode(
  ip: string
): Promise<{ ok: boolean; rttMs: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`/api/proxy/ping?ip=${ip}`, {
      signal: AbortSignal.timeout(5000),
    });
    const rttMs = Date.now() - start;
    return { ok: res.ok, rttMs };
  } catch {
    return { ok: false, rttMs: -1 };
  }
}

// ── WebSocket helpers ───────────────────────────────────────────────────────

export function connectInboxWs(
  nodeUrl: string,
  apiSecret: string,
  onMessage: (env: InboxEnvelope) => void,
  onError?: (e: Event) => void
): WebSocket {
  const wsUrl = nodeUrl
    .replace("https://", "wss://")
    .replace("http://", "ws://");
  const ws = new WebSocket(`${wsUrl}/ws/inbox?token=${apiSecret}`);
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {}
  };
  if (onError) ws.onerror = onError;
  return ws;
}

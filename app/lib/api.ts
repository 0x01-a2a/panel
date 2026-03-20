import type {
  Agent,
  ActivityEvent,
  ProposeRequest,
  InboxEnvelope,
  BillingAccount,
  SettlementEntry,
  RevenueStats,
} from "./types";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve nodeUrl + path into a fetch URL. Handles proxy: prefix for HTTP nodes. */
function nodeApiUrl(nodeUrl: string, path: string): string {
  if (nodeUrl.startsWith("proxy:")) {
    const ip = nodeUrl.slice(6);
    return `/api/proxy/node?ip=${ip}&path=${encodeURIComponent(path)}`;
  }
  return `${nodeUrl}${path}`;
}

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
  if (!apiSecret) throw new Error("API secret required");
  const res = await fetch(nodeApiUrl(nodeUrl, "/negotiate/propose"), {
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
  if (!apiSecret) throw new Error("API secret required");
  const res = await fetch(nodeApiUrl(nodeUrl, "/envelopes/send"), {
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

// ── Discover (broadcast) ────────────────────────────────────────────────────

export async function sendDiscover(
  nodeUrl: string,
  apiSecret: string,
  payload: { message: string; amount_usdc_micro?: number; deadline_secs?: number }
): Promise<{ conversation_id: string }> {
  const conversationId = crypto.randomUUID().replace(/-/g, "");
  const payloadB64 = btoa(JSON.stringify(payload));
  const res = await fetch(nodeApiUrl(nodeUrl, "/envelopes/send"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiSecret}`,
    },
    body: JSON.stringify({
      msg_type: "DISCOVER",
      recipient: "0".repeat(64), // broadcast — recipient ignored for pubsub
      conversation_id: conversationId,
      payload_b64: payloadB64,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return { conversation_id: conversationId };
}

// ── Exempt list ─────────────────────────────────────────────────────────────

export async function fetchExemptList(
  nodeUrl: string,
  apiSecret: string
): Promise<string[]> {
  const res = await fetch(nodeApiUrl(nodeUrl, "/admin/exempt"), {
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
  const res = await fetch(nodeApiUrl(nodeUrl, "/admin/exempt"), {
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
  const res = await fetch(nodeApiUrl(nodeUrl, `/admin/exempt/${agentId}`), {
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

// ── Treasury / Admin Billing ─────────────────────────────────────────────────

export async function fetchRevenueStats(
  aggregatorUrl: string,
  apiKey: string
): Promise<RevenueStats> {
  const res = await fetch(`${aggregatorUrl}/admin/billing/revenue`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchBillingAccounts(
  aggregatorUrl: string,
  apiKey: string,
  limit = 50,
  offset = 0
): Promise<{ accounts: BillingAccount[]; limit: number; offset: number }> {
  const res = await fetch(
    `${aggregatorUrl}/admin/billing/accounts?limit=${limit}&offset=${offset}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchSettlements(
  aggregatorUrl: string,
  apiKey: string,
  limit = 50,
  offset = 0,
  status?: string
): Promise<{ settlements: SettlementEntry[]; limit: number; offset: number }> {
  let url = `${aggregatorUrl}/admin/billing/settlements?limit=${limit}&offset=${offset}`;
  if (status) url += `&status=${encodeURIComponent(status)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function retrySettlement(
  aggregatorUrl: string,
  apiKey: string,
  id: number
): Promise<boolean> {
  const res = await fetch(
    `${aggregatorUrl}/admin/billing/settlements/${id}/retry`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );
  return res.ok;
}

export async function setSkipSettlement(
  aggregatorUrl: string,
  apiKey: string,
  accountId: string,
  skip: boolean
): Promise<boolean> {
  const res = await fetch(
    `${aggregatorUrl}/admin/billing/accounts/${encodeURIComponent(accountId)}/skip-settlement`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ skip }),
    }
  );
  return res.ok;
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
  // C-1: Browser WebSocket API does not support custom headers. The node expects
  // the token via the `?token=` query parameter. This is a known limitation —
  // mitigated by the node only listening on the internal network and the panel
  // using HTTPS. A future fix requires a short-lived WS ticket endpoint on the node.
  const ws = new WebSocket(`${wsUrl}/ws/inbox?token=${encodeURIComponent(apiSecret)}`);
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {}
  };
  if (onError) ws.onerror = onError;
  return ws;
}

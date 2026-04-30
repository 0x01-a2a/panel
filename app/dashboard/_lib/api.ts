export const AGGREGATOR = "https://api.0x01.world";
export const NODE_URL_KEY = "d_node_url";
export const AUTH_TOKEN_KEY = "d_auth_token";
export const AGENT_ID_KEY = "d_agent_id";
export const DEFAULT_NODE_URL = "http://localhost:9090";

export function getNodeUrl(): string {
  if (typeof window === "undefined") return DEFAULT_NODE_URL;
  return localStorage.getItem(NODE_URL_KEY) ?? DEFAULT_NODE_URL;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export function getSession(): { agentId: string; authToken: string } | null {
  if (typeof window === "undefined") return null;
  const agentId = localStorage.getItem(AGENT_ID_KEY);
  const authToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!agentId || !authToken) return null;
  return { agentId, authToken };
}

export function clearSession() {
  localStorage.removeItem(AGENT_ID_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(NODE_URL_KEY);
}

// ── Node proxy ────────────────────────────────────────────────────────────────
// All calls to the user's node go through /api/dashboard/proxy to avoid
// browser CORS restrictions (dashboard at api.0x01.world → node at localhost).

export async function nodeFetch(
  path: string,
  options: { method?: string; body?: unknown; authToken?: string } = {}
): Promise<Response> {
  const nodeUrl = getNodeUrl();
  const session = getSession();
  const token = options.authToken ?? session?.authToken ?? "";

  const method = options.method ?? "GET";

  if (method === "GET") {
    return fetch(`/api/dashboard/proxy?path=${encodeURIComponent(path)}`, {
      headers: {
        "x-node-url": nodeUrl,
        "x-node-token": token,
      },
      signal: AbortSignal.timeout(15000),
    });
  }

  return fetch("/api/dashboard/proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-node-url": nodeUrl,
      "x-node-token": token,
    },
    body: JSON.stringify({
      path,
      method,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    }),
    signal: AbortSignal.timeout(15000),
  });
}

// Verifies the token against the node's /identity endpoint.
export async function verifyNodeToken(
  nodeUrl: string,
  authToken: string
): Promise<{ agent_id: string; name?: string } | null> {
  // This is called before session exists, so call direct (server-side connect route handles CORS).
  const r = await fetch(`/api/dashboard/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeUrl, secret: authToken }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!r?.ok) return null;
  return r.json().catch(() => null);
}

// ── Reputation ────────────────────────────────────────────────────────────────

export interface ReputationData {
  agent_id: string;
  reliability: number;
  cooperation: number;
  notary_accuracy: number;
  total_tasks: number;
  total_disputes: number;
  last_active_epoch: number;
}

export async function fetchReputation(agentId: string): Promise<ReputationData | null> {
  const r = await fetch(`${AGGREGATOR}/reputation/${agentId}`).catch(() => null);
  if (!r?.ok) return null;
  return r.json();
}

// ── Agent profile ─────────────────────────────────────────────────────────────

export interface AgentProfile {
  agent_id: string;
  name?: string;
  description?: string;
  token_mint?: string;
  capabilities?: string[];
  country?: string;
  last_seen: number;
  reputation: number;
  feedback_count: number;
}

export async function fetchAgentProfile(agentId: string): Promise<AgentProfile | null> {
  const r = await fetch(`${AGGREGATOR}/agent/${agentId}/profile`).catch(() => null);
  if (!r?.ok) return null;
  return r.json();
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  agent_id: string;
  name?: string;
  reputation: number;
  feedback_count: number;
  rank?: number;
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const r = await fetch(`${AGGREGATOR}/leaderboard`).catch(() => null);
  if (!r?.ok) return [];
  return r.json();
}

// ── Billing ───────────────────────────────────────────────────────────────────

export interface BillingBalance {
  agent_id: string;
  balance_usdc: number;
  pending_usdc: number;
  total_earned_usdc: number;
  payout_wallet?: string;
}

export async function fetchBalance(agentId: string): Promise<BillingBalance | null> {
  const r = await fetch(`${AGGREGATOR}/billing/balance/${agentId}`).catch(() => null);
  if (!r?.ok) return null;
  return r.json();
}

export interface Transaction {
  id: string;
  type: "earn" | "payout" | "fee";
  amount_usdc: number;
  created_at: number;
  tx_hash?: string;
  description?: string;
}

export async function fetchTransactions(agentId: string): Promise<Transaction[]> {
  const r = await fetch(`${AGGREGATOR}/billing/transactions/${agentId}`).catch(() => null);
  if (!r?.ok) return [];
  return r.json();
}

// ── Interactions ──────────────────────────────────────────────────────────────

export interface Interaction {
  id: string;
  msg_type: string;
  sender: string;
  receiver?: string;
  amount?: number;
  timestamp: number;
  outcome?: string;
}

export async function fetchInteractions(agentId: string): Promise<Interaction[]> {
  const r = await fetch(`${AGGREGATOR}/interactions/by/${agentId}`).catch(() => null);
  if (!r?.ok) return [];
  return r.json();
}

// ── Network stats ─────────────────────────────────────────────────────────────

export interface NetworkStats {
  agent_count: number;
  online_count: number;
  interaction_count: number;
  uptime_seconds: number;
}

export async function fetchNetworkStats(): Promise<NetworkStats | null> {
  const r = await fetch(`${AGGREGATOR}/stats/network`).catch(() => null);
  if (!r?.ok) return null;
  return r.json();
}

export async function fetchOnlinePeers(): Promise<number> {
  const r = await fetch(`${AGGREGATOR}/agents`).catch(() => null);
  if (!r?.ok) return 0;
  const agents: { last_seen: number }[] = await r.json().catch(() => []);
  return agents.filter((a) => Date.now() / 1000 - a.last_seen < 120).length;
}

// ── Sponsor launch (Bags.fm token launch via aggregator) ──────────────────────

export interface LaunchPayload {
  name: string;
  ticker: string;
  description: string;
  image_b64?: string;
  image_url?: string;
  gift_code?: string;
  auth_token: string;
}

export interface LaunchResult {
  token_mint: string;
  tx_hash?: string;
  bags_url?: string;
}

export async function launchToken(payload: LaunchPayload): Promise<LaunchResult> {
  const { auth_token, ...body } = payload;

  // Try node's /bags/launch via proxy.
  const nodeR = await nodeFetch("/bags/launch", {
    method: "POST",
    body,
    authToken: auth_token,
  }).catch(() => null);

  if (nodeR?.ok) return nodeR.json();

  // Fall back to aggregator-sponsored launch.
  const r = await fetch(`${AGGREGATOR}/sponsor/launch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth_token}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchSponsorInfo(): Promise<{ enabled: boolean; gift_required: boolean } | null> {
  const r = await fetch(`${AGGREGATOR}/sponsor/launch/info`).catch(() => null);
  if (!r?.ok) return null;
  return r.json();
}

export async function fetchClaimable(authToken: string): Promise<number> {
  const r = await nodeFetch("/bags/claimable", { authToken }).catch(() => null);
  if (!r?.ok) return 0;
  const d = await r.json().catch(() => null);
  return d?.amount_sol ?? 0;
}

export async function claimFees(agentId: string, authToken: string): Promise<{ tx_hash: string; amount_sol: number }> {
  const r = await nodeFetch("/bags/claim", {
    method: "POST",
    body: { agent_id: agentId },
    authToken,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ── Agent persona ─────────────────────────────────────────────────────────────

export interface Persona {
  name: string;
  description: string;
  capabilities: string[];
  pricing_usdc?: number;
}

export async function fetchPersona(authToken?: string): Promise<Persona | null> {
  const r = await nodeFetch("/agent/persona", { authToken }).catch(() => null);
  if (!r?.ok) return null;
  return r.json();
}

export async function savePersona(persona: Persona, authToken: string): Promise<void> {
  const r = await nodeFetch("/agent/persona/write", {
    method: "POST",
    body: persona,
    authToken,
  });
  if (!r.ok) throw new Error(await r.text());
}

// ── Payout wallet ─────────────────────────────────────────────────────────────

export async function setPayoutWallet(agentId: string, wallet: string, authToken: string): Promise<void> {
  const r = await fetch(`${AGGREGATOR}/billing/set-payout/${agentId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ wallet }),
  });
  if (!r.ok) throw new Error(await r.text());
}

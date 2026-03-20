// ── Node definitions ────────────────────────────────────────────────────────

export interface BootstrapNode {
  id: string;
  label: string;
  region: string;
  ip: string;
  aggregatorUrl: string;
  nodeUrl: string | null;
  apiSecret: string | null;
}

export const NODES: BootstrapNode[] = [
  {
    id: "us",
    label: "US-EAST",
    region: "us-central1",
    ip: "34.16.64.99",
    aggregatorUrl: "https://api.0x01.world",
    nodeUrl: "https://us1.0x01.world",
    apiSecret: null,
  },
  {
    id: "eu",
    label: "EU-WEST",
    region: "europe-west1",
    ip: "34.78.245.208",
    aggregatorUrl: "https://api.0x01.world",
    nodeUrl: "https://eu1.0x01.world",
    apiSecret: null,
  },
  {
    id: "ap",
    label: "AP-SE",
    region: "asia-southeast1",
    ip: "136.110.15.224",
    aggregatorUrl: "https://api.0x01.world",
    nodeUrl: null,
    apiSecret: null,
  },
  {
    id: "af",
    label: "AF-SOUTH",
    region: "africa-south1",
    ip: "34.35.193.140",
    aggregatorUrl: "https://api.0x01.world",
    nodeUrl: null,
    apiSecret: null,
  },
];

// ── Agent ───────────────────────────────────────────────────────────────────

export interface Agent {
  agent_id: string;
  name: string;
  reputation: number;
  feedback_count: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  average_score: number;
  last_updated: number;
  last_seen: number;
  trend: string;
  country?: string;
  city?: string;
  latency?: Record<string, number>;
  geo_consistent?: boolean;
}

// ── Activity ────────────────────────────────────────────────────────────────

export interface ActivityEvent {
  id: number;
  event_type: string;
  agent_id: string;
  ts: number;
  name?: string;
  target_id?: string | null;
  target_name?: string | null;
  score?: number | null;
  slot?: number | null;
  conversation_id?: string | null;
}

// ── Envelope / Inbox ────────────────────────────────────────────────────────

export interface InboxEnvelope {
  msg_type: string;
  sender: string;
  conversation_id: string;
  payload_b64: string;
  slot: number;
  received_at?: number; // client-side timestamp
}

// ── Bounty ──────────────────────────────────────────────────────────────────

export interface ProposeRequest {
  recipient: string;
  message: string;
  amount_usdc_micro?: number;
  conversation_id?: string;
  deadline_secs?: number;
}

export interface BountySubmission {
  agentId: string;
  agentName?: string;
  status: "accepted" | "delivered" | "rejected" | "feedback_sent";
  payloadB64?: string;
  receivedAt: number;
}

export interface BountyHistoryEntry {
  conversationId: string;
  recipient: string;
  recipientName: string;
  message: string;
  amountUsdc: number;
  sentAt: number;
  sentFrom: string;
  status: "proposed" | "accepted" | "delivered" | "rejected" | "feedback_sent";
  deadlineAt?: number;
  submissions?: BountySubmission[];
}

// ── Node health ─────────────────────────────────────────────────────────────

export interface NodeHealthStatus {
  nodeId: string;
  label: string;
  region: string;
  ip: string;
  online: boolean;
  rttMs: number | null;
  lastChecked: number;
  consecutiveFailures: number;
  hasApi: boolean;
}

// ── Exempt agents ───────────────────────────────────────────────────────────

export interface ExemptAgent {
  agent_id: string;
  added_at?: number;
}

// ── Conversation ────────────────────────────────────────────────────────────

export interface ConversationStep {
  type: "propose" | "accept" | "reject" | "deliver" | "feedback" | "verdict";
  timestamp: number;
  from: string;
  to?: string;
  payload?: Record<string, unknown> | string;
  raw?: string;
}

// ── Notifications ───────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: number;
  dismissed: boolean;
  conversationId?: string;
}

// ── Treasury / Billing ──────────────────────────────────────────────────────

export interface BillingAccount {
  account_id: string;
  balance_usdc: number;
  tier: "free" | "builder" | "scale" | "enterprise";
  payment_method: string | null;
  preferred_chain: number | null;
  payout_address: string | null;
  /** When true, withdrawals bypass Circle CCTP — operator handles payout off-band. */
  skip_settlement: boolean;
  created_at: number;
  updated_at: number;
}

export interface BillingTransaction {
  id: number;
  account_id: string;
  tx_type: string;
  amount_usdc: number;
  payment_method: string;
  reference: string | null;
  chain_domain: number | null;
  status: string;
  created_at: number;
}

export interface SettlementEntry {
  id: number;
  conversation_id: string;
  payer_account: string;
  payee_account: string;
  amount_usdc: number;
  fee_usdc: number;
  dest_chain: number | null;
  dest_address: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  cctp_tx_hash: string | null;
  created_at: number;
  completed_at: number | null;
}

export interface RevenueStats {
  total_deposits_usdc: number;
  total_withdrawals_usdc: number;
  total_fees_usdc: number;
  total_settled_usdc: number;
  account_count: number;
  pending_settlements: number;
  tier_counts: Record<string, number>;
}

export const CHAIN_NAMES: Record<number, string> = {
  0: "Ethereum",
  1: "Avalanche",
  2: "Optimism",
  3: "Arbitrum",
  5: "Solana",
  6: "Base",
  7: "Polygon",
  11: "Linea",
  12: "Sei",
  16: "Unichain",
  25: "World Chain",
  1420: "HyperEVM",
  64165: "Sonic",
  65536: "Ink",
};

// ── Config ──────────────────────────────────────────────────────────────────

export interface PanelConfig {
  agentPollInterval: number;
  healthPollInterval: number;
  activityBufferSize: number;
  defaultBountyUsdc: number;
  defaultDeadlineMin: number;
}

export const DEFAULT_CONFIG: PanelConfig = {
  agentPollInterval: 30_000,
  healthPollInterval: 30_000,
  activityBufferSize: 200,
  defaultBountyUsdc: 0.01,
  defaultDeadlineMin: 2,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

export const MSG_COLORS: Record<string, string> = {
  PROPOSE: "text-[var(--green)]",
  ACCEPT: "text-[var(--amber)]",
  DELIVER: "text-blue-400",
  FEEDBACK: "text-purple-400",
  REJECT: "text-[var(--red)]",
  VERDICT: "text-cyan-400",
  JOIN: "text-[var(--sub)]",
  DISCOVER: "text-teal-400",
  BROADCAST: "text-orange-400",
};

export function shortId(id: string) {
  return id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export function timeAgo(epochSecs: number) {
  const s = Math.floor(Date.now() / 1000 - epochSecs);
  if (s < 0) return "now";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function decodePayload(b64: string): Record<string, unknown> | string | null {
  try {
    const decoded = atob(b64);
    try {
      return JSON.parse(decoded);
    } catch {
      return decoded;
    }
  } catch {
    return null;
  }
}

export function formatUsdc(micro: number): string {
  const usdc = micro / 1_000_000;
  return usdc >= 1 ? usdc.toFixed(2) : usdc.toFixed(4);
}

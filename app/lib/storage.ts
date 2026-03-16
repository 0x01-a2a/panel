import type { BountyHistoryEntry, PanelConfig, DEFAULT_CONFIG } from "./types";

const KEYS = {
  SECRETS: "0x01_panel_secrets",
  HISTORY: "0x01_bounty_history",
  CONFIG: "0x01_panel_config",
  NOTIFICATIONS_DISMISSED: "0x01_dismissed_notifications",
};

// ── Generic helpers ─────────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

// ── Secrets ─────────────────────────────────────────────────────────────────

export function loadSecrets(): Record<string, string> {
  return load(KEYS.SECRETS, {});
}

export function saveSecrets(secrets: Record<string, string>) {
  save(KEYS.SECRETS, secrets);
}

// ── Bounty history ──────────────────────────────────────────────────────────

export function loadBountyHistory(): BountyHistoryEntry[] {
  return load(KEYS.HISTORY, []);
}

export function saveBountyHistory(entries: BountyHistoryEntry[]) {
  save(KEYS.HISTORY, entries.slice(0, 500));
}

// ── Config ──────────────────────────────────────────────────────────────────

export function loadConfig(): PanelConfig {
  const defaults: PanelConfig = {
    agentPollInterval: 30_000,
    healthPollInterval: 30_000,
    activityBufferSize: 200,
    defaultBountyUsdc: 0.01,
    defaultDeadlineMin: 2,
  };
  return { ...defaults, ...load(KEYS.CONFIG, {}) };
}

export function saveConfig(config: PanelConfig) {
  save(KEYS.CONFIG, config);
}

// ── Dismissed notifications ─────────────────────────────────────────────────

export function loadDismissed(): string[] {
  return load(KEYS.NOTIFICATIONS_DISMISSED, []);
}

export function saveDismissed(ids: string[]) {
  save(KEYS.NOTIFICATIONS_DISMISSED, ids.slice(-200));
}

// ── Export utilities ────────────────────────────────────────────────────────

export function exportJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, filename);
}

export function exportCsv(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[],
  columns: string[],
  filename: string
) {
  const header = columns.join(",");
  const lines = rows.map((r) =>
    columns
      .map((c) => {
        const v = String(r[c] ?? "");
        return v.includes(",") || v.includes('"')
          ? `"${v.replace(/"/g, '""')}"`
          : v;
      })
      .join(",")
  );
  const blob = new Blob([header + "\n" + lines.join("\n")], {
    type: "text/csv",
  });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

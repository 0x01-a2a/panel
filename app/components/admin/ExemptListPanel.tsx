"use client";
import { useState, useEffect, useCallback } from "react";
import { NODES, shortId } from "@/app/lib/types";
import { fetchExemptList, addExemptAgent, removeExemptAgent } from "@/app/lib/api";
import { CopyButton } from "../shared/CopyButton";

export function ExemptListPanel({ secrets }: { secrets: Record<string, string> }) {
  const [exemptIds, setExemptIds] = useState<string[]>([]);
  const [newId, setNewId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const node = NODES.find((n) => n.nodeUrl && secrets[n.id]);
  const nodeUrl = node?.nodeUrl;
  const secret = node ? secrets[node.id] : "";

  const refresh = useCallback(async () => {
    if (!nodeUrl || !secret) return;
    setLoading(true);
    try {
      const list = await fetchExemptList(nodeUrl, secret);
      setExemptIds(list);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [nodeUrl, secret]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = useCallback(async () => {
    if (!nodeUrl || !secret || !newId.trim()) return;
    const ok = await addExemptAgent(nodeUrl, secret, newId.trim());
    if (ok) {
      setNewId("");
      refresh();
    } else {
      setError("Failed to add agent");
    }
  }, [nodeUrl, secret, newId, refresh]);

  const handleRemove = useCallback(
    async (id: string) => {
      if (!nodeUrl || !secret) return;
      const ok = await removeExemptAgent(nodeUrl, secret, id);
      if (ok) refresh();
      else setError("Failed to remove agent");
    },
    [nodeUrl, secret, refresh]
  );

  if (!nodeUrl || !secret) {
    return (
      <div className="border border-[var(--border)] rounded p-4">
        <h3 className="text-[10px] tracking-[3px] text-[var(--sub)] mb-2">
          EXEMPT AGENTS
        </h3>
        <p className="text-[11px] text-[var(--red)]">
          Configure a node API secret to manage exempt agents.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] tracking-[3px] text-[var(--sub)]">
          EXEMPT AGENTS ({exemptIds.length})
        </h3>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-[9px] tracking-[1px] px-2 py-1 border border-[var(--border)] rounded text-[var(--sub)] hover:border-[var(--green)] transition-colors disabled:opacity-30"
        >
          {loading ? "LOADING..." : "REFRESH"}
        </button>
      </div>

      {error && (
        <p className="text-[10px] text-[var(--red)] mb-2">{error}</p>
      )}

      {/* Add form */}
      <div className="flex gap-2 mb-3">
        <input
          placeholder="Agent ID to exempt..."
          className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-[11px] text-[var(--text)] placeholder:text-[var(--dim)] focus:border-[var(--green)] focus:outline-none"
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
        />
        <button
          onClick={handleAdd}
          disabled={!newId.trim()}
          className="text-[10px] tracking-[2px] px-4 py-1.5 bg-[var(--green)] text-black rounded font-bold hover:brightness-110 disabled:opacity-30 transition-all"
        >
          ADD
        </button>
      </div>

      {/* List */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {exemptIds.map((id) => (
          <div
            key={id}
            className="flex items-center gap-2 px-2 py-1.5 border border-[var(--border)] rounded text-[10px]"
          >
            <code className="text-[var(--text)] flex-1 truncate">{shortId(id)}</code>
            <CopyButton text={id} />
            <button
              onClick={() => handleRemove(id)}
              className="text-[9px] px-2 py-0.5 border border-[var(--red)]/30 rounded text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors"
            >
              REMOVE
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

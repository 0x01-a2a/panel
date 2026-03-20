"use client";
import { useState } from "react";
import { shortId } from "@/app/lib/types";
import { CopyButton } from "../shared/CopyButton";

export function BlockListPanel({
  blocklist,
  setBlocklist,
}: {
  blocklist: string[];
  setBlocklist: (ids: string[]) => void;
}) {
  const [newId, setNewId] = useState("");

  const handleAdd = () => {
    const id = newId.trim();
    if (!id || blocklist.includes(id)) return;
    setBlocklist([...blocklist, id]);
    setNewId("");
  };

  return (
    <div className="border border-[var(--border)] rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] tracking-[3px] text-[var(--sub)]">
          BLOCKED AGENTS ({blocklist.length})
        </h3>
        <span className="text-[9px] text-[var(--dim)]">panel-local · hidden from mesh + bounty</span>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          placeholder="Agent ID to block..."
          className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-[11px] text-[var(--text)] placeholder:text-[var(--dim)] focus:border-[var(--red)] focus:outline-none"
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={!newId.trim()}
          className="text-[10px] tracking-[2px] px-4 py-1.5 bg-[var(--red)] text-white rounded font-bold hover:brightness-110 disabled:opacity-30 transition-all"
        >
          BLOCK
        </button>
      </div>

      {blocklist.length === 0 ? (
        <p className="text-[11px] text-[var(--dim)] text-center py-3">
          No blocked agents. Blocked agents are hidden from the mesh view and recipient list.
        </p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {blocklist.map((id) => (
            <div
              key={id}
              className="flex items-center gap-2 px-2 py-1.5 border border-[var(--red)]/20 rounded text-[10px]"
            >
              <code className="text-[var(--text)] flex-1 truncate">{shortId(id)}</code>
              <CopyButton text={id} />
              <button
                onClick={() => setBlocklist(blocklist.filter((b) => b !== id))}
                className="text-[9px] px-2 py-0.5 border border-[var(--green)]/30 rounded text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors"
              >
                UNBLOCK
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

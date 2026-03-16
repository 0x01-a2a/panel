"use client";
import { useState, useEffect, useCallback } from "react";
import type { BountyHistoryEntry, InboxEnvelope } from "../types";
import { loadBountyHistory, saveBountyHistory } from "../storage";

export function useBountyHistory() {
  const [history, setHistory] = useState<BountyHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadBountyHistory());
  }, []);

  const add = useCallback((entry: BountyHistoryEntry) => {
    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 500);
      saveBountyHistory(updated);
      return updated;
    });
  }, []);

  const addMany = useCallback((entries: BountyHistoryEntry[]) => {
    setHistory((prev) => {
      const updated = [...entries, ...prev].slice(0, 500);
      saveBountyHistory(updated);
      return updated;
    });
  }, []);

  const updateStatus = useCallback(
    (conversationId: string, status: BountyHistoryEntry["status"]) => {
      setHistory((prev) => {
        const updated = prev.map((h) =>
          h.conversationId === conversationId ? { ...h, status } : h
        );
        saveBountyHistory(updated);
        return updated;
      });
    },
    []
  );

  const handleEnvelope = useCallback(
    (env: InboxEnvelope) => {
      const statusMap: Record<string, BountyHistoryEntry["status"]> = {
        ACCEPT: "accepted",
        DELIVER: "delivered",
        REJECT: "rejected",
      };
      const newStatus = statusMap[env.msg_type];
      if (newStatus) {
        updateStatus(env.conversation_id, newStatus);
      }
    },
    [updateStatus]
  );

  const clear = useCallback(() => {
    setHistory([]);
    saveBountyHistory([]);
  }, []);

  return { history, add, addMany, updateStatus, handleEnvelope, clear };
}

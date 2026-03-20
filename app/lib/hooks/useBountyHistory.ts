"use client";
import { useState, useEffect, useCallback } from "react";
import type { BountyHistoryEntry, BountySubmission, InboxEnvelope } from "../types";
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

  const updateSubmissionStatus = useCallback(
    (conversationId: string, agentId: string, status: BountySubmission["status"]) => {
      setHistory((prev) => {
        const updated = prev.map((h) => {
          if (h.conversationId !== conversationId) return h;
          const subs = (h.submissions ?? []).map((s) =>
            s.agentId === agentId ? { ...s, status } : s
          );
          return { ...h, submissions: subs };
        });
        saveBountyHistory(updated);
        return updated;
      });
    },
    []
  );

  const handleEnvelope = useCallback(
    (env: InboxEnvelope) => {
      const statusMap: Record<string, BountySubmission["status"]> = {
        ACCEPT: "accepted",
        DELIVER: "delivered",
        REJECT: "rejected",
      };
      const subStatus = statusMap[env.msg_type];
      if (!subStatus) return;

      setHistory((prev) => {
        const updated = prev.map((h) => {
          if (h.conversationId !== env.conversation_id) return h;

          // Update top-level status only when the transition is an upgrade.
          // REJECT from one agent must NOT clobber a "delivered" or "feedback_sent"
          // status from a different agent on the same broadcast bounty (M-8).
          const STATUS_RANK: Record<string, number> = {
            proposed: 0, rejected: 1, accepted: 2, delivered: 3, feedback_sent: 4,
          };
          const candidateStatus: BountyHistoryEntry["status"] =
            subStatus === "accepted" ? "accepted"
            : subStatus === "delivered" ? "delivered"
            : "rejected";
          const currentRank = STATUS_RANK[h.status] ?? 0;
          const newStatus: BountyHistoryEntry["status"] =
            (STATUS_RANK[candidateStatus] ?? 0) > currentRank ? candidateStatus : h.status;

          // Update or add submission entry keyed by sender
          const subs = h.submissions ?? [];
          const existingIdx = subs.findIndex((s) => s.agentId === env.sender);
          const newSub: BountySubmission = {
            agentId: env.sender,
            status: subStatus,
            payloadB64: env.msg_type === "DELIVER" ? env.payload_b64 : undefined,
            receivedAt: env.received_at ?? Date.now(),
            // preserve existing agentName if already set
            agentName: existingIdx >= 0 ? subs[existingIdx].agentName : undefined,
          };
          const newSubs =
            existingIdx >= 0
              ? subs.map((s, i) => (i === existingIdx ? { ...s, ...newSub } : s))
              : [...subs, newSub];

          return { ...h, status: newStatus, submissions: newSubs };
        });
        saveBountyHistory(updated);
        return updated;
      });
    },
    []
  );

  const clear = useCallback(() => {
    setHistory([]);
    saveBountyHistory([]);
  }, []);

  return { history, add, addMany, updateStatus, updateSubmissionStatus, handleEnvelope, clear };
}

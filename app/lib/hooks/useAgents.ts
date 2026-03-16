"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import type { Agent } from "../types";
import { NODES } from "../types";
import { fetchAgents } from "../api";

export type AgentSort = "seen" | "rep" | "name" | "feedback";

export function useAgents(pollInterval = 30_000) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<AgentSort>("seen");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchAgents(NODES[0].aggregatorUrl);
      setAgents(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollInterval);
    return () => clearInterval(id);
  }, [refresh, pollInterval]);

  const now = Date.now() / 1000;
  const onlineCount = agents.filter((a) => now - a.last_seen < 120).length;
  const recentCount = agents.filter((a) => now - a.last_seen < 300).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.agent_id.includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.country?.toLowerCase().includes(q) ||
        a.city?.toLowerCase().includes(q)
    );
  }, [agents, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === "seen") return b.last_seen - a.last_seen;
      if (sort === "rep") return b.average_score - a.average_score;
      if (sort === "feedback") return b.feedback_count - a.feedback_count;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, sort]);

  return {
    agents,
    sorted,
    search,
    setSearch,
    sort,
    setSort,
    loading,
    refresh,
    onlineCount,
    recentCount,
    totalCount: agents.length,
  };
}

"use client";
import { useState, useEffect, useCallback } from "react";
import type { NodeHealthStatus } from "../types";
import { NODES } from "../types";
import { pingNode } from "../api";

export function useNodeHealth(pollInterval = 30_000) {
  const [nodes, setNodes] = useState<NodeHealthStatus[]>(
    NODES.map((n) => ({
      nodeId: n.id,
      label: n.label,
      region: n.region,
      ip: n.ip,
      online: false,
      rttMs: null,
      lastChecked: 0,
      consecutiveFailures: 0,
      hasApi: !!n.nodeUrl,
    }))
  );

  const pingAll = useCallback(async () => {
    const results = await Promise.all(
      NODES.map(async (n) => {
        const { ok, rttMs } = await pingNode(n.ip);
        return { nodeId: n.id, ok, rttMs };
      })
    );
    setNodes((prev) =>
      prev.map((node) => {
        const result = results.find((r) => r.nodeId === node.nodeId);
        if (!result) return node;
        return {
          ...node,
          online: result.ok,
          rttMs: result.ok ? result.rttMs : node.rttMs,
          lastChecked: Date.now(),
          consecutiveFailures: result.ok ? 0 : node.consecutiveFailures + 1,
        };
      })
    );
  }, []);

  useEffect(() => {
    pingAll();
    const id = setInterval(pingAll, pollInterval);
    return () => clearInterval(id);
  }, [pingAll, pollInterval]);

  const onlineCount = nodes.filter((n) => n.online).length;

  return { nodes, onlineCount, pingAll };
}

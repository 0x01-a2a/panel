"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { ActivityEvent } from "../types";
import { NODES } from "../types";
import { fetchActivity } from "../api";
import { loadActivity, saveActivity } from "../storage";

export function useActivity(pollInterval = 15_000, bufferSize = 200) {
  const [events, setEvents] = useState<ActivityEvent[]>(() => loadActivity());
  const inflightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inflightRef.current) return; // don't stack concurrent fetches
    inflightRef.current = true;
    try {
      const data = await fetchActivity(NODES[0].aggregatorUrl, bufferSize);
      setEvents((prev) => {
        const map = new Map(prev.map((e) => [e.id, e]));
        for (const e of data) map.set(e.id, e);
        const merged = Array.from(map.values())
          .sort((a, b) => b.ts - a.ts)
          .slice(0, 1000);
        saveActivity(merged);
        return merged;
      });
    } catch {
      // network error — retain cached data
    } finally {
      inflightRef.current = false;
    }
  }, [bufferSize]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollInterval);
    return () => clearInterval(id);
  }, [refresh, pollInterval]);

  return { events, refresh };
}

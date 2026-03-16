"use client";
import { useState, useEffect, useCallback } from "react";
import type { ActivityEvent } from "../types";
import { NODES } from "../types";
import { fetchActivity } from "../api";

export function useActivity(pollInterval = 15_000, bufferSize = 200) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchActivity(NODES[0].aggregatorUrl, bufferSize);
      setEvents(data);
    } catch {}
  }, [bufferSize]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollInterval);
    return () => clearInterval(id);
  }, [refresh, pollInterval]);

  return { events, refresh };
}

"use client";
import { useState, useCallback, useEffect } from "react";
import type { Notification } from "../types";
import { loadDismissed, saveDismissed } from "../storage";

let _notifCounter = 0;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  const push = useCallback(
    (
      type: Notification["type"],
      title: string,
      message: string,
      conversationId?: string
    ) => {
      const id = `n_${Date.now()}_${++_notifCounter}`;
      setNotifications((prev) =>
        [
          { id, type, title, message, timestamp: Date.now(), dismissed: false, conversationId },
          ...prev,
        ].slice(0, 100)
      );
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, dismissed: true } : n))
    );
    setDismissed((prev) => {
      const updated = [...prev, id];
      saveDismissed(updated);
      return updated;
    });
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, dismissed: true })));
  }, []);

  const active = notifications.filter(
    (n) => !n.dismissed && !dismissed.includes(n.id)
  );

  return { notifications, active, push, dismiss, dismissAll };
}

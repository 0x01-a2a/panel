"use client";

import { useState, useCallback, useEffect } from "react";
import { NODES } from "../types";
import type { BillingAccount, SettlementEntry, RevenueStats } from "../types";
import {
  fetchRevenueStats,
  fetchBillingAccounts,
  fetchSettlements,
  retrySettlement,
} from "../api";

const AGGREGATOR_URL = NODES[0].aggregatorUrl;
const POLL_MS = 30_000;

export function useTreasury(apiKey: string) {
  const [revenue, setRevenue] = useState<RevenueStats | null>(null);
  const [accounts, setAccounts] = useState<BillingAccount[]>([]);
  const [settlements, setSettlements] = useState<SettlementEntry[]>([]);
  const [settlementsOffset, setSettlementsOffset] = useState(0);
  const [accountsOffset, setAccountsOffset] = useState(0);
  const [settlementFilter, setSettlementFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (accOffset = accountsOffset, settOffset = settlementsOffset, filter = settlementFilter) => {
      if (!apiKey) return;
      setLoading(true);
      setError(null);
      try {
        const [rev, acc, sett] = await Promise.all([
          fetchRevenueStats(AGGREGATOR_URL, apiKey),
          fetchBillingAccounts(AGGREGATOR_URL, apiKey, 50, accOffset),
          fetchSettlements(AGGREGATOR_URL, apiKey, 50, settOffset, filter),
        ]);
        setRevenue(rev);
        setAccounts(acc.accounts);
        setSettlements(sett.settlements);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load treasury data");
      } finally {
        setLoading(false);
      }
    },
    [apiKey, accountsOffset, settlementsOffset, settlementFilter]
  );

  // Auto-poll when we have a key
  useEffect(() => {
    if (!apiKey) return;
    load();
    const id = setInterval(() => load(), POLL_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const retry = useCallback(
    async (id: number) => {
      if (!apiKey) return;
      await retrySettlement(AGGREGATOR_URL, apiKey, id);
      load();
    },
    [apiKey, load]
  );

  const changeSettlementFilter = useCallback(
    (filter: string | undefined) => {
      setSettlementFilter(filter);
      setSettlementsOffset(0);
      load(accountsOffset, 0, filter);
    },
    [accountsOffset, load]
  );

  return {
    revenue,
    accounts,
    settlements,
    loading,
    error,
    reload: load,
    retry,
    settlementFilter,
    setSettlementFilter: changeSettlementFilter,
    accountsOffset,
    setAccountsOffset,
    settlementsOffset,
    setSettlementsOffset,
  };
}

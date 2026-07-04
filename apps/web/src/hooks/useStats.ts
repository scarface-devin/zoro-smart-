import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SolarArraySummary, BridgeTransaction, StatsTimeseriesResponse } from '@solshare/shared';

const apiBaseUrl = (): string => {
  if (typeof import.meta.env.VITE_API_BASE_URL === 'string') {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return '/api';
};

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: api.stats,
    refetchInterval: 30_000,
  });
}

export function useStatsTimeseries(months = 12) {
  return useQuery<StatsTimeseriesResponse>({
    queryKey: ['stats', 'timeseries', months],
    queryFn: () => api.statsTimeseries(months),
    refetchInterval: 60_000,
  });
}

export function useArrays(params: { status?: string } = {}) {
  return useQuery({
    queryKey: ['arrays', params],
    queryFn: () => api.arrays(params),
  });
}

export function useArray(id: string) {
  return useQuery<SolarArraySummary>({
    queryKey: ['array', id],
    queryFn: () => api.array(id),
    enabled: Boolean(id),
  });
}

export function useBridgeTransactions() {
  return useQuery({
    queryKey: ['bridge-txs'],
    queryFn: () => api.bridgeTransactions(),
    refetchInterval: 15_000,
  });
}

export function useYield(distributor: string, holder: string | null) {
  return useQuery({
    queryKey: ['yield', distributor, holder],
    queryFn: () => api.yieldForHolder(distributor, holder as string),
    enabled: Boolean(distributor && holder),
    refetchInterval: 20_000,
  });
}

/**
 * Combines the polled REST list of bridge transactions with the live
 * Server-Sent-Events gateway exposed by `apps/api`. New events from the
 * SSE stream are merged into the TanStack Query cache, so any component
 * that subscribes to `['bridge-txs']` automatically updates in real time.
 */
export function useBridgeTransactionsCombined(): { items: BridgeTransaction[]; isLoading: boolean } {
  const q = useBridgeTransactions();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof window.EventSource === 'undefined') return;
    const url = `${apiBaseUrl()}/stream/events`;
    const source = new EventSource(url);
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as BridgeTransaction | { data: BridgeTransaction };
        const next = 'data' in payload ? payload.data : payload;
        if (!next || typeof next !== 'object' || !('id' in next)) return;
        queryClient.setQueryData<{ items: BridgeTransaction[] } | undefined>(
          ['bridge-txs'],
          (old) => {
            const existing = old?.items ?? [];
            const without = existing.filter((it) => it.id !== next.id);
            return { items: [next, ...without].slice(0, 50) };
          }
        );
      } catch {
        // Swallow malformed events; the next poll will reconcile.
      }
    };
    return () => source.close();
  }, [queryClient]);

  return { items: q.data?.items ?? [], isLoading: q.isLoading };
}

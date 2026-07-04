import type {
  Paginated,
  SolarArraySummary,
  BridgeTransaction,
  StatsResponse,
  StatsTimeseriesResponse,
} from '@solshare/shared';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export const api = {
  stats: () => request<StatsResponse>('/stats'),
  statsTimeseries: (months = 12) =>
    request<StatsTimeseriesResponse>(`/stats/timeseries?months=${months}`),
  arrays: (params: { status?: string; page?: number; pageSize?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    return request<Paginated<SolarArraySummary>>(`/arrays?${qs.toString()}`);
  },
  array: (id: string) => request<SolarArraySummary>(`/arrays/${id}`),
  bridgeTransactions: (params: { status?: string; sourceChain?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.sourceChain) qs.set('sourceChain', params.sourceChain);
    return request<Paginated<BridgeTransaction>>(`/bridge/transactions?${qs.toString()}`);
  },
  yieldForHolder: (distributor: string, holder: string) =>
    request<{
      holder: string;
      distributorId: string;
      shares: string;
      claimable: string;
      paidYieldPerShare: string;
      globalYieldPerShare: string;
    }>(`/yield/${distributor}/${holder}`),
};

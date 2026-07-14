import type {
  Paginated,
  SolarArraySummary,
  BridgeTransaction,
  StatsResponse,
  StatsTimeseriesResponse,
  GovernanceProposal,
  GovernanceStats,
  PortfolioSummary,
  Notification,
  NotificationCount,
  Paginated as PaginatedType,
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
  governanceProposals: (params: { status?: string; page?: number; pageSize?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    return request<Paginated<GovernanceProposal>>(`/governance/proposals?${qs.toString()}`);
  },
  governanceStats: () => request<GovernanceStats>('/governance/stats'),
  createProposal: (body: {
    title: string;
    description: string;
    proposalType: string;
    proposer: string;
    arrayId?: string | null;
    payload?: Record<string, unknown>;
  }) => request<{ operation: unknown; status: string }>('/governance/proposals', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  castVote: (body: { proposalId: string; voter: string; choice: string }) =>
    request<{ operation: unknown; status: string }>('/governance/vote', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  portfolio: (holder: string) =>
    request<PortfolioSummary>(`/portfolio?holder=${encodeURIComponent(holder)}`),
  notifications: (params: { address: string; unreadOnly?: boolean; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    qs.set('address', params.address);
    if (params.unreadOnly) qs.set('unreadOnly', 'true');
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    return request<PaginatedType<Notification>>(`/notifications?${qs.toString()}`);
  },
  search: (q: string) =>
    request<{ query: string; results: { id: string; type: string; title: string; subtitle: string; url: string }[]; total: number; tookMs: number }>(`/search?q=${encodeURIComponent(q)}`),
  /** Analytics */
  analyticsVolume: (days = 30) =>
    request<{ totalBridgeVolumeUsdc: string; totalWraps: number; totalUnwraps: number; daily: unknown[]; topChains: unknown[]; days: number }>(`/analytics/volume?days=${days}`),
  analyticsTopArrays: (params: { limit?: number; sort?: string } = {}) =>
    request<{ entries: { id: string; name: string; status: string; ratedCapacityW: number; yieldPerShare: string; totalShares: string; co2OffsetKgPerYear: number }[]; sortBy: string; limit: number }>(
      `/analytics/top-arrays?limit=${params.limit ?? 5}&sort=${params.sort ?? 'yield'}`,
    ),
  /** Notifications */
    request<NotificationCount>(`/notifications/count?address=${encodeURIComponent(address)}`),
  markNotificationsRead: (body: { address: string; ids: string[]; markAll: boolean }) =>
    request<{ status: string }>('/notifications/read', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

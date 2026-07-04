/** Standard envelope for paginated list responses. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  network: string;
  horizonReachable: boolean;
  sorobanReachable: boolean;
  databaseReachable: boolean;
  uptimeSeconds: number;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface LedgerInfoResponse {
  network: string;
  latestLedger: number;
  latestLedgerCloseTime: number;
  protocolVersion: string;
}

export interface StatsResponse {
  totalArrays: number;
  activeArrays: number;
  totalCapacityW: number;
  totalSharesOutstanding: string;
  totalYieldClaimed: string;
  totalBridgedVolume: string;
}

/** A single point on the protocol time-series. The indexer writes one
 *  of these per ledger close (or per day in production). `shares` and
 *  `yield` are string-encoded bigints to avoid JS number loss. */
export interface StatsTimeseriesPoint {
  /** ISO-8601 month label, e.g. "2025-08". */
  label: string;
  /** Unix seconds of the snapshot. */
  timestamp: number;
  /** Combined rated capacity in watts at this point in time. */
  capacity: number;
  /** Outstanding share tokens at this point in time (string bigint). */
  shares: string;
  /** Cumulative yield claimed up to this point in time (string bigint). */
  yield: string;
}

export interface StatsTimeseriesResponse {
  points: StatsTimeseriesPoint[];
  /** `true` once the indexer has accumulated `months` of history. */
  ready: boolean;
  /** Number of months requested. */
  months: number;
}

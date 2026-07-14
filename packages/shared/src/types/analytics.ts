export interface DailyVolume {
  date: string;
  volume: string;
  wraps: number;
  unwraps: number;
}

export interface ChainVolume {
  chain: string;
  volume: string;
  percentage: number;
}

export interface VolumeAnalytics {
  totalBridgeVolumeUsdc: string;
  totalWraps: number;
  totalUnwraps: number;
  daily: DailyVolume[];
  topChains: ChainVolume[];
  days: number;
}

export interface TopArrayEntry {
  id: string;
  name: string;
  status: string;
  ratedCapacityW: number;
  yieldPerShare: string;
  totalShares: string;
  co2OffsetKgPerYear: number;
}

export interface TopArraysResponse {
  entries: TopArrayEntry[];
  sortBy: string;
  limit: number;
}

export interface ProjectedPoint {
  month: number;
  label: string;
  projectedYield: string;
  cumulativeYield: string;
}

export interface YieldProjection {
  arrayId: string;
  shares: string;
  months: number;
  monthlyKwhEstimate: number;
  annualKwhEstimate: number;
  projected: ProjectedPoint[];
}

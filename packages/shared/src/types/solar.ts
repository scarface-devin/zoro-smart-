export type ArrayStatus = 'Pending' | 'Active' | 'Maintenance' | 'Decommissioned';

export type PanelTechnology =
  | 'Monocrystalline'
  | 'Polycrystalline'
  | 'ThinFilm'
  | 'Bifacial';

export interface GeoLocation {
  /** Microdegrees (×10⁶). */
  latitude: number;
  /** Microdegrees (×10⁶). */
  longitude: number;
  /** Altitude (meters). */
  altitudeM: number;
}

export interface EnvironmentalImpact {
  /** kg/year, scaled ×10³ for precision. */
  co2OffsetKgPerYear: number;
  /** kWh/year, scaled ×10³ for precision. */
  expectedYieldKwhPerYear: number;
}

/** Shape returned by the off-chain indexer for a registered array. */
export interface SolarArraySummary {
  id: string; // hex BytesN<32>
  name: string;
  operator: string;
  location: GeoLocation;
  panelCount: number;
  panelTech: PanelTechnology;
  ratedCapacityW: number;
  installedAt: number; // unix seconds
  status: ArrayStatus;
  impact: EnvironmentalImpact;
  tokenContract: string | null;
  metadataUri: string;
  lastUpdated: number; // unix seconds
  /** Indexer-computed fields. */
  totalSupply?: string;
  totalClaimed?: string;
  yieldPerShare?: string;
}

export interface SolarArrayDetail extends SolarArraySummary {
  ledgerTimestamp: number;
  acceptingInvestors: boolean;
}

export interface MaintenanceEvent {
  timestamp: number;
  description: string;
  performedBy: string;
}

export interface ArrayCountByStatus {
  Pending: number;
  Active: number;
  Maintenance: number;
  Decommissioned: number;
}

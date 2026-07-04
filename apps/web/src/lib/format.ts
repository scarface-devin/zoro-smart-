import { format } from '@solshare/shared';

export const fmt = {
  ...format,
  /** Compact number formatting for stat cards: 12.5K, 1.2M etc. */
  compact(n: number | bigint | string): string {
    const v = Number(n);
    if (!Number.isFinite(v)) return '—';
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(v);
  },
  /** Pretty percentage. */
  percent(p: number, digits = 1): string {
    return `${p.toFixed(digits)}%`;
  },
  /** "1.2 MWh" energy formatter. */
  energyKwh(kwh: number): string {
    if (kwh >= 1_000_000) return `${(kwh / 1_000_000).toFixed(2)} GWh`;
    if (kwh >= 1_000) return `${(kwh / 1_000).toFixed(1)} MWh`;
    return `${kwh.toFixed(0)} kWh`;
  },
  /** "4.2 t" carbon formatter. */
  co2Tonnes(kg: number): string {
    return `${(kg / 1000).toFixed(2)} t`;
  },
};

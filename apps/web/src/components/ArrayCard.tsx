import { Link } from 'react-router-dom';
import type { SolarArraySummary } from '@solshare/shared';
import { fmt } from '../lib/format';
import { StatusBadge } from './StatusBadge';
import { MapPin, Zap, Leaf, Users } from 'lucide-react';

export function ArrayCard({ array }: { array: SolarArraySummary }) {
  const kwh = array.impact?.expectedYieldKwhPerYear ?? 0;
  const co2 = array.impact?.co2OffsetKgPerYear ?? 0;
  return (
    <Link
      to={`/arrays/${array.id}`}
      className="card p-5 group hover:shadow-glow transition relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-50 bg-panel-grid bg-[length:14px_14px] pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{array.name || `Array ${array.id.slice(0, 6)}`}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-ink-400 font-mono">
            <MapPin className="w-3 h-3" />
            <span>
              {(array.location.latitude / 1e6).toFixed(3)},{' '}
              {(array.location.longitude / 1e6).toFixed(3)}
            </span>
          </div>
        </div>
        <StatusBadge status={array.status} />
      </div>
      <div className="relative mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink-400 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Capacity
          </div>
          <div className="font-semibold">{fmt.compact(array.ratedCapacityW)} W</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink-400 flex items-center gap-1">
            <Leaf className="w-3 h-3" /> CO₂/yr
          </div>
          <div className="font-semibold">{fmt.co2Tonnes(co2)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink-400 flex items-center gap-1">
            <Users className="w-3 h-3" /> Yields
          </div>
          <div className="font-semibold">{fmt.energyKwh(kwh)}</div>
        </div>
      </div>
      <div className="relative mt-4 flex items-center justify-between text-xs">
        <span className="text-ink-400">{array.panelCount ?? 0} panels · {array.panelTech}</span>
        <span className="text-sun-400 group-hover:underline">View →</span>
      </div>
    </Link>
  );
}

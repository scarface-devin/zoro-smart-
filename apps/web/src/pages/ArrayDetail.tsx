import { useParams, Link } from 'react-router-dom';
import { useArray } from '../hooks/useStats';
import { StatusBadge } from '../components/StatusBadge';
import { fmt } from '../lib/format';
import { ArrowLeft, MapPin, Zap, Leaf, Users, Sun, Cog } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

export default function ArrayDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: array, isPending, error } = useArray(id ?? '');

  if (isPending) {
    return (
      <div className="card h-72 shimmer" />
    );
  }
  if (error || !array) {
    return (
      <div className="space-y-3">
        <Link to="/arrays" className="inline-flex items-center gap-2 text-sm text-ink-300 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="card p-10 text-center text-ember-400">Array not found.</div>
      </div>
    );
  }

  const co2 = array.impact?.co2OffsetKgPerYear ?? 0;
  const kwh = array.impact?.expectedYieldKwhPerYear ?? 0;

  const donut = [
    { name: 'Energy', value: kwh },
    { name: 'CO₂', value: co2 },
  ];

  return (
    <div className="space-y-6">
      <Link to="/arrays" className="inline-flex items-center gap-2 text-sm text-ink-300 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to arrays
      </Link>
      <div className="card p-7 relative overflow-hidden">
        <div className="absolute inset-0 bg-panel-grid bg-[length:24px_24px] opacity-50 pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{array.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-ink-300">
              <MapPin className="w-4 h-4 text-sun-400" />
              <span className="font-mono">
                {(array.location.latitude / 1e6).toFixed(3)},{' '}
                {(array.location.longitude / 1e6).toFixed(3)}{' '}
                <span className="text-ink-500">· alt</span>{' '}
                {array.location.altitudeM ?? 0}m
              </span>
            </div>
          </div>
          <StatusBadge status={array.status} />
        </div>
        <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric icon={<Zap className="w-4 h-4 text-sun-400" />} label="Capacity" value={`${fmt.compact(array.ratedCapacityW)} W`} />
          <Metric icon={<Users className="w-4 h-4 text-leaf-400" />} label="Panels" value={`${array.panelCount}`} />
          <Metric icon={<Leaf className="w-4 h-4 text-ember-400" />} label="CO₂/yr" value={fmt.co2Tonnes(co2)} />
          <Metric icon={<Sun className="w-4 h-4 text-sun-400" />} label="Yield/yr" value={fmt.energyKwh(kwh)} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-semibold tracking-tight mb-3">Environmental impact</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={donut}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill="#ffb938" />
                  <Cell fill="#3fc06a" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#101728',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-xs text-ink-400">Estimated annual production and CO₂ avoidance.</div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold tracking-tight mb-2">Invest</h2>
          <p className="text-sm text-ink-300">
            Buy rwa-token shares of this array. Pull-payment yield is paid
            proportionally to your balance on every funded batch.
          </p>
          <button className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sun-500 to-ember-500 hover:brightness-110 text-ink-950 px-4 py-2.5 text-sm font-semibold shadow-glow transition">
            <Cog className="w-4 h-4" /> Coming soon
          </button>
          <div className="mt-4 text-xs text-ink-400">
            Token contract:{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono">
              {array.tokenContract ? fmt.address(array.tokenContract) : '—'}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-ink-400">
        {icon} {label}
      </div>
      <div className="mt-1.5 text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

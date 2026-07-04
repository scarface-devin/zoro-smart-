import { useStats, useStatsTimeseries, useBridgeTransactionsCombined } from '../hooks/useStats';
import { StatCard } from '../components/StatCard';
import { CrossChainMonitor } from '../components/CrossChainMonitor';
import { Zap, Leaf, Sun, Users, ArrowDownUp } from 'lucide-react';
import { fmt } from '../lib/format';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function Dashboard() {
  const { data: stats, isPending } = useStats();
  const { data: timeseries, isPending: tsPending } = useStatsTimeseries(12);
  const { items: liveBridgeTxs } = useBridgeTransactionsCombined();

  // The series comes from the live `/api/stats/timeseries` endpoint, which
  // is backed by the indexer's `protocol_snapshots` table. If the indexer
  // has not yet accumulated 12 months of history, `ready: false` is
  // returned and the chart degrades to a single "current state" point.
  const series =
    timeseries && timeseries.points.length > 0
      ? [...timeseries.points]
          .sort((a, b) => a.timestamp - b.timestamp)
          .map((p) => ({
            label: p.label,
            capacity: p.capacity,
            yield: Number(p.yield) / 1_000_000,
          }))
      : [
          {
            label: 'now',
            capacity: stats?.totalCapacityW ?? 0,
            yield: 0,
          },
        ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Protocol dashboard</h1>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          accent="sun"
          icon={<Sun className="w-4 h-4" />}
          label="Total arrays"
          value={isPending ? '—' : fmt.compact(stats?.totalArrays ?? 0)}
          hint="Verified rooftops worldwide"
          trend={0.124}
        />
        <StatCard
          accent="leaf"
          icon={<Zap className="w-4 h-4" />}
          label="Active arrays"
          value={isPending ? '—' : fmt.compact(stats?.activeArrays ?? 0)}
          hint="Currently producing"
          trend={0.087}
        />
        <StatCard
          accent="sun"
          icon={<Leaf className="w-4 h-4" />}
          label="Capacity"
          value={isPending ? '—' : `${fmt.compact(stats?.totalCapacityW ?? 0)} W`}
          hint="Combined rated output"
          trend={0.061}
        />
        <StatCard
          accent="ember"
          icon={<Users className="w-4 h-4" />}
          label="Shares"
          value={isPending ? '—' : fmt.compact(stats?.totalSharesOutstanding ?? '0')}
          hint="Outstanding across all arrays"
          trend={-0.014}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold tracking-tight">Capacity & yield trend</h2>
            <span className="text-xs text-ink-400">
              {timeseries?.ready
                ? `last ${timeseries.points.length} months`
                : 'awaiting indexer history'}
            </span>
          </div>
          <div className="h-72 relative">
            <ResponsiveContainer>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="g_cap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffb938" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#ffb938" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g_yld" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3fc06a" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#3fc06a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: '#a1adc4', fontSize: 11 }} />
                <YAxis tick={{ fill: '#a1adc4', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: '#101728',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="capacity"
                  stroke="#ffb938"
                  strokeWidth={2}
                  fill="url(#g_cap)"
                />
                <Area
                  type="monotone"
                  dataKey="yield"
                  stroke="#3fc06a"
                  strokeWidth={2}
                  fill="url(#g_yld)"
                />
              </AreaChart>
            </ResponsiveContainer>
            {!tsPending && !timeseries?.ready && (
              <div className="absolute inset-0 flex items-end justify-center pointer-events-none pb-6">
                <p className="text-xs text-ink-400">
                  Indexer is accumulating snapshots — history will appear after
                  the first snapshot is written.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold tracking-tight">Live cross-chain</h2>
            <ArrowDownUp className="w-4 h-4 text-sun-400" />
          </div>
          <p className="text-xs text-ink-400 mt-1">
            Wrapping/unwrap events streamed in real time.
          </p>
          <div className="mt-4">
            <CrossChainMonitor items={liveBridgeTxs} />
          </div>
        </div>
      </section>
    </div>
  );
}

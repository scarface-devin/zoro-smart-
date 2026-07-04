import { useState } from 'react';
import { useArrays } from '../hooks/useStats';
import { ArrayCard } from '../components/ArrayCard';
import type { ArrayStatus } from '@solshare/shared';

const FILTERS: ArrayStatus[] = ['Active', 'Pending', 'Maintenance', 'Decommissioned'];

export default function Arrays() {
  const [filter, setFilter] = useState<ArrayStatus | undefined>(undefined);
  const { data, isPending, error } = useArrays({ status: filter });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Registered solar arrays</h1>
          <p className="text-ink-300 text-sm mt-1">
            Every installation accepted into SolShare. Status transitions are tracked on-chain.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setFilter(undefined)}
            className={`pill ring-1 text-xs ${
              !filter
                ? 'ring-white/30 bg-white/10 text-white'
                : 'ring-white/10 bg-ink-800 text-ink-300 hover:bg-white/5'
            }`}
          >
            All
          </button>
          {FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`pill ring-1 text-xs ${
                filter === s
                  ? 'ring-white/30 bg-white/10 text-white'
                  : 'ring-white/10 bg-ink-800 text-ink-300 hover:bg-white/5'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-44 shimmer" />
          ))}
        </div>
      ) : error ? (
        <div className="card p-6 text-sm text-ember-400">Failed to load arrays from the indexer.</div>
      ) : (data?.items?.length ?? 0) === 0 ? (
        <div className="card p-10 text-center text-ink-300">
          <p>No arrays registered for this filter yet.</p>
          <p className="text-xs text-ink-400 mt-2">
            Deploy an array via{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/10">tools/scripts/deploy-testnet.ts</code>.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data!.items.map((arr) => (
            <ArrayCard key={arr.id} array={arr} />
          ))}
        </div>
      )}
    </div>
  );
}

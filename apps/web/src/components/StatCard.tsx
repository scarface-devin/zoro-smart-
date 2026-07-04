import clsx from 'clsx';
import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  trend?: number; // -1 … +1
  accent?: 'sun' | 'leaf' | 'ember' | 'ink';
}

export function StatCard({ icon, label, value, hint, trend, accent = 'sun' }: StatCardProps) {
  const accentMap = {
    sun: 'from-sun-500/15 to-transparent',
    leaf: 'from-leaf-500/15 to-transparent',
    ember: 'from-ember-500/15 to-transparent',
    ink: 'from-white/5 to-transparent',
  } as const;
  return (
    <div
      className={clsx(
        'relative overflow-hidden card p-5 group transition',
        'hover:shadow-glow hover:-translate-y-0.5',
      )}
    >
      <div
        className={clsx(
          'absolute inset-0 opacity-60 bg-gradient-to-br pointer-events-none',
          accentMap[accent],
        )}
      />
      <div className="relative flex items-start justify-between">
        <div className="text-xs uppercase tracking-widest text-ink-400">{label}</div>
        <div className="text-ink-300">{icon}</div>
      </div>
      <div className="relative mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="relative mt-2 flex items-center justify-between">
        <span className="text-xs text-ink-400">{hint}</span>
        {typeof trend === 'number' && (
          <span
            className={clsx(
              'inline-flex items-center gap-1 text-xs font-medium',
              trend >= 0 ? 'text-leaf-500' : 'text-ember-400',
            )}
          >
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {(trend * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

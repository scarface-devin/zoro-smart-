import clsx from 'clsx';
import type { ArrayStatus } from '@solshare/shared';

const map: Record<ArrayStatus, { color: string; ring: string; label: string }> = {
  Pending: {
    color: 'text-ink-100 bg-ink-700/60',
    ring: 'ring-white/10',
    label: 'Pending',
  },
  Active: {
    color: 'text-leaf-500 bg-leaf-500/10',
    ring: 'ring-leaf-500/30',
    label: 'Active',
  },
  Maintenance: {
    color: 'text-sun-400 bg-sun-500/10',
    ring: 'ring-sun-500/30',
    label: 'Maintenance',
  },
  Decommissioned: {
    color: 'text-ember-400 bg-ember-500/10',
    ring: 'ring-ember-500/30',
    label: 'Decommissioned',
  },
};

export function StatusBadge({ status }: { status: ArrayStatus | string }) {
  const m = map[status as ArrayStatus] ?? map.Pending;
  return (
    <span
      className={clsx(
        'pill ring-1',
        m.color,
        m.ring,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-slow" />
      {m.label}
    </span>
  );
}

import { useStellar } from '../contexts/StellarProvider';
import { Wifi } from 'lucide-react';

export function NetworkPill() {
  const { network } = useStellar();
  return (
    <div className="hidden sm:inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 bg-ink-800/70 ring-1 ring-white/10 text-xs font-mono">
      <Wifi className="w-3 h-3 text-leaf-400" />
      <span className="text-leaf-400">●</span>
      <span className="uppercase tracking-wider text-ink-200">{network}</span>
    </div>
  );
}

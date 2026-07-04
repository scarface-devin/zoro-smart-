import { useEffect, useState } from 'react';
import type { BridgeTransaction } from '@solshare/shared';
import { fmt } from '../lib/format';
import { ArrowDownUp, ArrowDown, ArrowUp } from 'lucide-react';

interface CrossChainMonitorProps {
  source?: string;
  limit?: number;
  /**
   * Opt-in fallback. When true, an internal setInterval drives a synthetic
   * stream of events. Useful for offline previews, screenshots, and the
   * `?demo=1` link in marketing. Default is `false` so the dashboard
   * always points at the real API.
   */
  fallback?: boolean;
  /** Externally supplied items (e.g. from a TanStack Query + SSE feed). */
  items?: BridgeTransaction[];
}

const demoModeRequested = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.VITE_DEMO_MODE === '1') return true;
  return new URLSearchParams(window.location.search).get('demo') === '1';
};

export function CrossChainMonitor({
  source = 'ethereum',
  limit = 6,
  fallback,
  items: externalItems = [],
}: CrossChainMonitorProps) {
  const useFallback = fallback ?? demoModeRequested();
  const [demoItems, setDemoItems] = useState<BridgeTransaction[]>([]);

  useEffect(() => {
    if (!useFallback) return;
    // Simple deterministic simulator: cycles through a few states for visual demo.
    const demo = (i: number): BridgeTransaction => ({
      id: `demo-${i}`,
      direction: i % 2 === 0 ? 'wrap' : 'unwrap',
      sourceChain: source as BridgeTransaction['sourceChain'],
      sourceTxHash: '0x' + Math.random().toString(16).slice(2, 66).padEnd(64, '0'),
      wrappedToken: 'sSHR-' + (i % 4),
      amount: String(1000 * (i + 1)),
      sender: '0x' + '12'.repeat(20),
      recipient: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      status: ['observed', 'signing', 'submitted', 'minted'][i % 4] as BridgeTransaction['status'],
      createdAt: Math.floor(Date.now() / 1000) - i * 30,
      updatedAt: Math.floor(Date.now() / 1000) - i * 5,
    });
    const t = setInterval(() => {
      setDemoItems((cur) => [demo(cur.length), ...cur].slice(0, limit));
    }, 1800);
    return () => clearInterval(t);
  }, [useFallback, limit, source]);

  const items = useFallback ? demoItems : externalItems.slice(0, limit);

  if (items.length === 0) {
    return (
      <div className="card p-6 text-sm text-ink-400">
        <ArrowDownUp className="w-4 h-4 mb-2" />
        Waiting for first event from <span className="font-mono ml-1">{source}</span>…
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.id} className="card p-3 flex items-center gap-3">
          {it.direction === 'wrap' ? (
            <ArrowDown className="w-4 h-4 text-leaf-500" />
          ) : (
            <ArrowUp className="w-4 h-4 text-sun-400" />
          )}
          <div className="flex-1">
            <div className="text-sm font-medium">
              {it.direction === 'wrap' ? 'Wrap' : 'Unwrap'}{' '}
              <span className="text-ink-400 font-normal">on</span>{' '}
              <span className="font-mono">{it.sourceChain}</span>
            </div>
            <div className="text-xs text-ink-400 font-mono">
              {fmt.hash(it.sourceTxHash)}
            </div>
          </div>
          <div className="text-xs text-ink-300">{it.amount} {it.wrappedToken}</div>
          <span
            className={`pill ring-1 text-[10px] ${
              it.status === 'minted'
                ? 'text-leaf-500 bg-leaf-500/10 ring-leaf-500/30'
                : it.status === 'failed'
                  ? 'text-ember-400 bg-ember-500/10 ring-ember-500/30'
                  : 'text-sun-400 bg-sun-500/10 ring-sun-500/30'
            }`}
          >
            {it.status}
          </span>
        </div>
      ))}
    </div>
  );
}

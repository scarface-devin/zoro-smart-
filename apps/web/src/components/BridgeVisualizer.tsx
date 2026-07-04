import clsx from 'clsx';
import { ArrowRight, Sparkles } from 'lucide-react';
import { format } from '@solshare/shared';

interface BridgeVisualizerProps {
  sourceChain: string;
  sourceTxHash?: string;
  destination: string;
  amount: string;
  symbol?: string;
  status: 'observed' | 'signing' | 'submitted' | 'minted' | 'failed';
}

const SOURCE_CHAIN_COLORS: Record<string, string> = {
  ethereum: 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/30',
  sepolia: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/20',
  polygon: 'bg-violet-500/20 text-violet-300 ring-violet-500/30',
  amoy: 'bg-violet-500/10 text-violet-300 ring-violet-500/20',
  solana: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
  'solana-devnet': 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
};

export function BridgeVisualizer({
  sourceChain,
  sourceTxHash,
  destination,
  amount,
  symbol = 'USDC',
  status,
}: BridgeVisualizerProps) {
  const sourceColor = SOURCE_CHAIN_COLORS[sourceChain] ?? 'bg-white/10 text-white ring-white/20';
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-ink-400">
            Cross-chain bridge
          </div>
          <div className="mt-1 font-mono text-xs text-ink-300">
            {sourceTxHash ? format.hash(sourceTxHash) : '—'}
          </div>
        </div>
        <div className="text-xs uppercase tracking-widest text-ink-400">{status}</div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className={clsx('rounded-xl p-3 ring-1 text-center font-mono text-xs', sourceColor)}>
          <div className="text-[10px] uppercase opacity-70">SOURCE</div>
          <div className="font-semibold">{sourceChain}</div>
        </div>
        <div className="relative h-12 grid place-items-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-sun-500/60 to-transparent animate-pulse-slow" />
          </div>
          <ArrowRight className="relative w-5 h-5 text-sun-400" />
          <Sparkles className="absolute -top-1 right-0 w-3 h-3 text-sun-300" />
        </div>
        <div className="rounded-xl p-3 ring-1 text-center font-mono text-xs bg-leaf-500/10 text-leaf-400 ring-leaf-500/30">
          <div className="text-[10px] uppercase opacity-70">STELLAR</div>
          <div className="font-semibold">Soroban</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-white/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest text-ink-400">Amount</div>
          <div className="font-mono">
            {amount} {symbol}
          </div>
        </div>
        <div className="rounded-lg bg-white/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest text-ink-400">Recipient</div>
          <div className="font-mono">{format.address(destination, 6, 4)}</div>
        </div>
      </div>
    </div>
  );
}

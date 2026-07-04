import { useState } from 'react';
import { CrossChainMonitor } from '../components/CrossChainMonitor';
import { BridgeVisualizer } from '../components/BridgeVisualizer';
import { useBridgeTransactionsCombined } from '../hooks/useStats';
import type { SourceChain } from '@solshare/shared';
import { SUPPORTED_SOURCE_CHAINS } from '@solshare/shared';
import { ArrowRight, Globe } from 'lucide-react';

export default function Bridge() {
  const { items: liveBridgeTxs } = useBridgeTransactionsCombined();
  const [chain, setChain] = useState<SourceChain>('ethereum');
  const [amount, setAmount] = useState('1000');
  const [recipient, setRecipient] = useState('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cross-chain bridge</h1>
        <p className="text-ink-300 text-sm mt-1">
          Lock on the source chain, wrap on Stellar. Validators sign observed
          locks, the bridge-wrapper mints proportional Soroban tokens.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-widest text-ink-400">Source chain</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUPPORTED_SOURCE_CHAINS.map((c) => (
                <button
                  key={c}
                  onClick={() => setChain(c)}
                  className={`pill ring-1 text-xs ${
                    chain === c
                      ? 'ring-white/30 bg-white/10 text-white'
                      : 'ring-white/10 bg-ink-800 text-ink-300 hover:bg-white/5'
                  }`}
                >
                  <Globe className="w-3 h-3" /> {c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-ink-400">Amount</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-2 w-full rounded-xl bg-ink-800 ring-1 ring-white/10 focus:ring-sun-500 outline-none px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-ink-400">Recipient</label>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="mt-2 w-full rounded-xl bg-ink-800 ring-1 ring-white/10 focus:ring-sun-500 outline-none px-3 py-2 font-mono"
              />
            </div>
          </div>
          <button className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-sun-500 to-ember-500 hover:brightness-110 text-ink-950 px-5 py-3 text-sm font-semibold shadow-glow transition">
            Wrap on Stellar <ArrowRight className="w-4 h-4" />
          </button>

          <BridgeVisualizer
            sourceChain={chain}
            destination={recipient}
            amount={amount}
            status="submitted"
          />
        </div>
        <div className="card p-6">
          <h2 className="font-semibold tracking-tight mb-2">Live event feed</h2>
          <p className="text-xs text-ink-400">Updated every ~1.8s.</p>
          <div className="mt-4 max-h-[420px] overflow-y-auto pr-1">
            <CrossChainMonitor source={chain} items={liveBridgeTxs} />
          </div>
        </div>
      </div>
    </div>
  );
}

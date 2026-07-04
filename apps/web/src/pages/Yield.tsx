import { useStellar } from '../contexts/StellarProvider';
import { useYield } from '../hooks/useStats';
import { Coins, Sparkles, Wallet } from 'lucide-react';

export default function Yield() {
  const { publicKey, client } = useStellar();
  const distributor = client.contracts.yieldDistributor || 'demo-distributor';
  const { data, isPending } = useYield(distributor, publicKey);

  if (!publicKey) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto">
        <Wallet className="w-6 h-6 mx-auto text-sun-400" />
        <h2 className="mt-3 text-xl font-semibold">Connect a wallet</h2>
        <p className="text-sm text-ink-300 mt-1">
          We need to know your Stellar address to compute your claimable yield.
        </p>
      </div>
    );
  }

  const claimable = data?.claimable ?? '0';

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">My yield</h1>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-ink-400">Claimable</span>
            <Coins className="w-4 h-4 text-sun-400" />
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">
            {isPending ? '—' : claimable}{' '}
            <span className="text-ink-400 text-base font-mono">USDC</span>
          </div>
          <button
            disabled={claimable === '0'}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sun-500 to-ember-500 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-ink-950 px-4 py-2.5 text-sm font-semibold shadow-glow transition"
          >
            <Sparkles className="w-4 h-4" /> Claim yield
          </button>
        </div>
        <div className="card p-6">
          <div className="text-xs uppercase tracking-widest text-ink-400">My shares</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">
            {isPending ? '—' : (data?.shares ?? '0')}
          </div>
          <p className="mt-2 text-xs text-ink-400">
            Aggregated across every array you hold shares in.
          </p>
        </div>
        <div className="card p-6">
          <div className="text-xs uppercase tracking-widest text-ink-400">
            Global yield / share
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">
            {isPending ? '—' : (data?.globalYieldPerShare ?? '0')}
          </div>
          <p className="mt-2 text-xs text-ink-400">
            Cumulative since the contract&rsquo;s last fund() call.
          </p>
        </div>
      </div>
    </div>
  );
}

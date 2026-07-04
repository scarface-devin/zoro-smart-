import { Hero } from '../components/Hero';
import { ArrowRight, Zap, Globe, Recycle, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="space-y-10">
      <Hero />
      <section>
        <h2 className="text-lg font-semibold tracking-tight">Why SolShare</h2>
        <p className="text-ink-300 mt-1 max-w-2xl">
          Renters can&rsquo;t install panels — but they can own a fraction of one.
          SolShare turns urban rooftops into a tokenised, yield-bearing asset on
          Stellar, while letting you bring exposure from any chain in seconds.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Zap,
              title: 'On-chain RWA',
              body: 'Every kWh is tracked. Payouts are pull-paid to share-holders.',
            },
            {
              icon: Globe,
              title: 'Cross-chain wrap',
              body: 'Bring USDC, wETH, wSOL or MATIC in seconds, mint on Soroban.',
            },
            {
              icon: Recycle,
              title: 'Yield from daylight',
              body: 'Pull-payment distributor splits energy revenue fairly.',
            },
            {
              icon: Wallet,
              title: 'Self-custodial',
              body: 'Wallet-only access via Freighter — no middlemen.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-5 hover:shadow-glow transition">
              <Icon className="w-5 h-5 text-sun-400" />
              <div className="mt-3 font-semibold tracking-tight">{title}</div>
              <p className="mt-1 text-sm text-ink-300">{body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="card p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h3 className="text-xl font-semibold">Ready to invest in sunlight?</h3>
          <p className="text-ink-300 mt-1">
            Open the dashboard to see live arrays, in-flight wrappers, and your
            accruing yield.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sun-500 to-ember-500 hover:brightness-110 text-ink-950 px-5 py-3 text-sm font-semibold shadow-glow transition"
        >
          Launch dashboard <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}

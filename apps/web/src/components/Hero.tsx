import { ArrowRight, Sparkles, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Hero() {
  return (
    <section className="relative overflow-hidden card p-10 lg:p-14">
      <div className="absolute inset-0 bg-sun-grid pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full bg-gradient-radial from-sun-500/20 to-transparent blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-[420px] h-[420px] rounded-full bg-gradient-radial from-leaf-500/15 to-transparent blur-3xl" />
      <div className="relative max-w-3xl">
        <div className="pill mb-4 ring-1 ring-white/10 bg-white/5 text-ink-100">
          <Sparkles className="w-3 h-3 text-sun-400" />
          <span>Stellar · Soroban · Hackathon-ready</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
          Own a slice of the sun.{' '}
          <span className="bg-gradient-to-r from-sun-400 via-ember-400 to-leaf-400 bg-clip-text text-transparent">
            Crowdfund urban solar.
          </span>
        </h1>
        <p className="mt-5 text-ink-200 text-lg leading-relaxed">
          SolShare is a Soroban-powered real-world-asset engine for crowdfunded
          urban solar arrays — with a cross-chain wrapping middleware so you can
          bridge exposure from any L1 directly onto Stellar in seconds.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sun-500 to-ember-500 hover:brightness-110 text-ink-950 px-5 py-3 text-sm font-semibold shadow-glow transition"
          >
            Open dashboard <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 rounded-xl bg-ink-800 ring-1 ring-white/10 hover:bg-ink-700 px-5 py-3 text-sm font-medium transition"
          >
            <Sun className="w-4 h-4 text-sun-400" /> How it works
          </Link>
        </div>
      </div>

      <div className="relative mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { k: '12', l: 'Verified arrays' },
          { k: '5.2M', l: 'W capacity' },
          { k: '4', l: 'Soroban contracts' },
          { k: '6', l: 'Source chains' },
        ].map(({ k, l }) => (
          <div key={l} className="rounded-xl bg-white/5 ring-1 ring-white/10 p-4">
            <div className="text-2xl font-semibold tracking-tight">{k}</div>
            <div className="text-xs uppercase tracking-widest text-ink-400 mt-1">{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

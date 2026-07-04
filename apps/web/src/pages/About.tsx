import { Sparkles, BookOpen, Github, ExternalLink } from 'lucide-react';

const sections = [
  {
    title: 'RWA engine',
    body: 'Each rooftop array is paired with a unique on-chain registry entry and its own SEP-41 share token. Yields are split pull-payment style so gas costs scale linearly.',
  },
  {
    title: 'Cross-chain wrap',
    body: 'Drop a USDC/wETH/wSOL lock event: validator signatures are aggregated and submitted to a Stellar bridge-wrapper that mints proportional Soroban balances.',
  },
  {
    title: 'Transparent ops',
    body: 'Every event is indexed in Postgres, re-emitted on Redis pub/sub, and surfaced via SSE. No black boxes, no admin-only overrides.',
  },
];

const contracts = [
  { name: 'rwa-token', purpose: 'SEP-41 share token per array.' },
  { name: 'solar-registry', purpose: 'Lifecycle & metadata per array.' },
  { name: 'yield-distributor', purpose: 'Pull-payment revenue splitting.' },
  { name: 'bridge-wrapper', purpose: 'Cross-chain wrap/unwrap orchestration.' },
];

export default function About() {
  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">About SolShare</h1>
        <p className="mt-3 text-ink-300 leading-relaxed">
          SolShare Network is a Soroban-powered Real World Asset (RWA) engine
          for crowdfunded urban solar arrays. It targets Web3&rsquo;s drive
          toward tangible ownership and assets you can verify — without
          needing a roof of your own. Wrap exposure from any chain onto
          Stellar in seconds.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-sun-400" /> How it works
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {sections.map((s) => (
            <div key={s.title} className="card p-5">
              <div className="font-semibold tracking-tight">{s.title}</div>
              <p className="text-sm text-ink-300 mt-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sun-400" /> On-chain contracts
        </h2>
        <div className="card divide-y divide-white/5">
          {contracts.map((c) => (
            <div key={c.name} className="p-4 flex items-center justify-between">
              <div>
                <code className="font-mono text-sm text-sun-400">{c.name}</code>
                <p className="text-sm text-ink-300">{c.purpose}</p>
              </div>
              <a
                href={repoContractUrl(c.name)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-ink-400 hover:text-white inline-flex items-center gap-1"
              >
                source <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </section>

      <section>
        <a
          className="inline-flex items-center gap-2 rounded-xl bg-ink-800 ring-1 ring-white/10 hover:bg-ink-700 px-4 py-2 text-sm transition"
          href="https://github.com/solshare-network/solshare-network"
          target="_blank"
          rel="noreferrer"
        >
          <Github className="w-4 h-4" /> Source on GitHub
        </a>
      </section>
    </div>
  );
}

function repoContractUrl(name: string): string {
  return `https://github.com/solshare-network/solshare-network/tree/main/contracts/${name}/src/lib.rs`;
}

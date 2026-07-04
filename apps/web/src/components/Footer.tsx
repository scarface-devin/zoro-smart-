import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/5 px-6 lg:px-10 py-6 text-xs text-ink-400">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          © {new Date().getFullYear()} SolShare Network · Soroban contracts ·
          Open-source under Apache-2.0
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline">v0.1.0 · testnet</span>
          <a
            className="inline-flex items-center gap-1 hover:text-white"
            href="https://github.com/solshare-network/solshare-network"
            target="_blank"
            rel="noreferrer"
          >
            <Github className="w-3.5 h-3.5" /> GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

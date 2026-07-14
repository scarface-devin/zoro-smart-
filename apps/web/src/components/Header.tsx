import { Link, NavLink } from 'react-router-dom';
import { useStellar } from '../contexts/StellarProvider';
import { ConnectButton } from './ConnectButton';
import { NetworkPill } from './NetworkPill';
import { Sun } from 'lucide-react';

export function Header() {
  const { publicKey } = useStellar();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-ink-950/70 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-16 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-sun-500 to-ember-500 shadow-glow transition group-hover:scale-105">
            <Sun className="w-5 h-5 text-ink-950" />
          </span>
          <span className="font-semibold tracking-tight text-lg">
            SolShare<span className="text-sun-400">·</span>Network
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          {[
            { to: '/dashboard', label: 'Dashboard' },
            { to: '/arrays', label: 'Arrays' },
            { to: '/bridge', label: 'Bridge' },
            { to: '/portfolio', label: 'Portfolio' },
            { to: '/yield', label: 'Yield' },
            { to: '/governance', label: 'Governance' },
            { to: '/about', label: 'About' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg transition ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-ink-300 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <NetworkPill />
          <ConnectButton compact={false} />
          {publicKey && (
            <span className="hidden lg:inline text-xs font-mono text-ink-400">
              {publicKey.slice(0, 4)}…{publicKey.slice(-4)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

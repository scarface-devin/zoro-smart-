import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Sun, ArrowLeftRight, Coins, Info, Sparkles, Vote, PieChart } from 'lucide-react';

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/arrays', label: 'Arrays', icon: Sun },
  { to: '/bridge', label: 'Bridge', icon: ArrowLeftRight },
  { to: '/yield', label: 'Yield', icon: Coins },
  { to: '/portfolio', label: 'Portfolio', icon: PieChart },
  { to: '/governance', label: 'Governance', icon: Vote },
  { to: '/about', label: 'About', icon: Info },
] as const;

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-[68px] xl:w-[240px] shrink-0 border-r border-white/5 bg-ink-950/60 backdrop-blur-md flex-col">
      <div className="px-3 xl:px-5 py-6 flex items-center gap-2">
        <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-sun-500 to-ember-500 shadow-glow">
          <Sparkles className="w-5 h-5 text-ink-950" />
        </div>
        <div className="hidden xl:block">
          <div className="text-sm font-semibold">SolShare</div>
          <div className="text-[10px] uppercase tracking-widest text-ink-400">v0.1 · testnet</div>
        </div>
      </div>
      <nav className="px-2 xl:px-3 flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                isActive
                  ? 'bg-gradient-to-r from-sun-500/20 to-leaf-500/10 text-white ring-1 ring-white/10'
                  : 'text-ink-300 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="hidden xl:inline">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-3 hidden xl:block">
        <div className="card p-4 space-y-2">
          <div className="text-xs uppercase tracking-widest text-ink-400">Tip</div>
          <p className="text-xs leading-relaxed text-ink-200">
            Wrap USDC from any chain into Soroban in seconds — try the
            <span className="px-1.5 py-0.5 rounded bg-white/10 ml-1">Bridge</span>
            tab.
          </p>
        </div>
      </div>
    </aside>
  );
}

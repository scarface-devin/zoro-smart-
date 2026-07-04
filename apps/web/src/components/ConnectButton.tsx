import { useEffect, useState } from 'react';
import { useStellar } from '../contexts/StellarProvider';
import { Wallet, LogOut, Copy, Check } from 'lucide-react';
import { format } from '@solshare/shared';

export function ConnectButton({ compact = false }: { compact?: boolean }) {
  const { publicKey, connect, disconnect, isConnecting } = useStellar();
  const [copyed, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (copyed) {
      const t = setTimeout(() => setCopied(false), 1200);
      return () => clearTimeout(t);
    }
    return;
  }, [copyed]);

  if (!publicKey) {
    return (
      <button
        onClick={() => void connect()}
        disabled={isConnecting}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sun-500 to-ember-500 hover:brightness-110 text-ink-950 px-3.5 py-2 text-sm font-semibold shadow-glow disabled:opacity-60 disabled:cursor-progress transition"
      >
        <Wallet className="w-4 h-4" />
        {compact ? 'Connect' : isConnecting ? 'Connecting…' : 'Connect wallet'}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl bg-ink-800 hover:bg-ink-700 ring-1 ring-white/10 px-3.5 py-2 text-sm transition"
      >
        <span className="w-2 h-2 rounded-full bg-leaf-500 animate-pulse-slow" />
        <span className="font-mono">{format.address(publicKey)}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 card p-1 z-40">
          <button
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm"
            onClick={async () => {
              await navigator.clipboard.writeText(publicKey).catch(() => undefined);
              setCopied(true);
            }}
          >
            {copyed ? <Check className="w-4 h-4 text-leaf-500" /> : <Copy className="w-4 h-4" />}
            Copy address
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-ember-400"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

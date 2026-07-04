import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { SolShareClient, WalletClient } from '@solshare/sdk';
import type { ReactNode } from 'react';

interface StellarContextValue {
  client: SolShareClient;
  wallet: WalletClient;
  publicKey: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  network: string;
}

const StellarContext = createContext<StellarContextValue | null>(null);

export function StellarProvider({ children }: { children: ReactNode }) {
  const client = useMemo(
    () =>
      new SolShareClient({
        network: (import.meta.env.VITE_STELLAR_NETWORK as 'TESTNET' | 'PUBLIC') ?? 'TESTNET',
        horizonUrl: import.meta.env.VITE_HORIZON_URL,
        sorobanRpcUrl: import.meta.env.VITE_SOROBAN_RPC_URL,
        networkPassphrase: import.meta.env.VITE_NETWORK_PASSPHRASE,
        contracts: {
          rwaToken: import.meta.env.VITE_RWA_TOKEN_CONTRACT ?? '',
          solarRegistry: import.meta.env.VITE_REGISTRY_CONTRACT ?? '',
          yieldDistributor: import.meta.env.VITE_DISTRIBUTOR_CONTRACT ?? '',
          bridgeWrapper: import.meta.env.VITE_BRIDGE_CONTRACT ?? '',
        },
      }),
    [],
  );
  const wallet = useMemo(() => client.wallet, [client]);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [network, setNetwork] = useState<string>('TESTNET');

  useEffect(() => {
    wallet.publicKey().then(setPublicKey).catch(() => undefined);
    wallet.getNetwork().then((n) => n && setNetwork(n.network)).catch(() => undefined);
  }, [wallet]);

  const connect = async () => {
    setIsConnecting(true);
    try {
      const pk = await wallet.connect();
      setPublicKey(pk);
    } finally {
      setIsConnecting(false);
    }
  };
  const disconnect = () => setPublicKey(null);

  const value: StellarContextValue = {
    client,
    wallet,
    publicKey,
    isConnecting,
    connect,
    disconnect,
    network,
  };
  return <StellarContext.Provider value={value}>{children}</StellarContext.Provider>;
}

export function useStellar() {
  const ctx = useContext(StellarContext);
  if (!ctx) throw new Error('useStellar must be used inside <StellarProvider>');
  return ctx;
}

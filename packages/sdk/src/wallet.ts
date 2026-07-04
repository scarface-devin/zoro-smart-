/**
 * Version-tolerant wrapper over @stellar/freighter-api.
 *
 * Freighter's API has changed between v3 and v5 (renamed `requestAccess` ->
 * `connect`, added namespace object, dropped some helper methods). To keep
 * this SDK usable against the version currently installed, we import the
 * module as a namespace and dispatch through whatever shape exists.
 */

import * as freighterMod from '@stellar/freighter-api';

import { WalletError } from '@solshare/shared';

// Resolve whichever shape the installed module exports.
type FreighterApi = {
  isConnected?: () => Promise<unknown>;
  getPublicKey?: () => Promise<string | null>;
  signTransaction?: (xdr: string, opts?: unknown) => Promise<unknown>;
  getNetwork?: () => Promise<unknown>;
  setAllowed?: () => Promise<void>;
};
type FreighterModule = FreighterApi & {
  freighterApi?: FreighterApi;
  default?: FreighterApi;
};

const freighter: FreighterModule = (freighterMod as unknown as FreighterModule);
const api: FreighterApi =
  freighter.freighterApi ??
  freighter.default ??
  (freighter as FreighterApi);

async function callBooleanOrObject(method: () => Promise<unknown>): Promise<boolean> {
  try {
    const out = await method();
    if (typeof out === 'boolean') return out;
    if (out && typeof out === 'object' && 'isConnected' in (out as Record<string, unknown>)) {
      return Boolean((out as { isConnected: boolean }).isConnected);
    }
    return Boolean(out);
  } catch {
    return false;
  }
}

/**
 * Freighter browser wallet driver. Used by the dashboard.
 */
export class WalletClient {
  async connect(): Promise<string> {
    try {
      if (api.setAllowed) await api.setAllowed();
      if (!api.getPublicKey) throw new WalletError('Freighter getPublicKey is unavailable');
      const pk = await api.getPublicKey();
      if (!pk) throw new WalletError('Freighter returned no public key');
      return pk;
    } catch (e) {
      if (e instanceof WalletError) throw e;
      throw new WalletError(`Freighter connect failed: ${(e as Error).message}`);
    }
  }

  async isConnected(): Promise<boolean> {
    if (!api.isConnected) return false;
    return callBooleanOrObject(api.isConnected);
  }

  async publicKey(): Promise<string | null> {
    try {
      if (!api.getPublicKey) return null;
      return await api.getPublicKey();
    } catch {
      return null;
    }
  }

  async getNetwork(): Promise<{ network: string; networkPassphrase: string } | null> {
    try {
      if (!api.getNetwork) return null;
      const raw = await api.getNetwork();
      if (!raw) return null;
      if (typeof raw === 'string') return { network: raw, networkPassphrase: '' };
      if (typeof raw === 'object' && raw !== null) {
        const obj = raw as { network?: string; networkPassphrase?: string };
        if (obj.network) {
          return { network: obj.network, networkPassphrase: obj.networkPassphrase ?? '' };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Sign a base64 transaction XDR envelope with Freighter.
   * Returns the signed envelope (also base64-encoded).
   */
  async signTransaction(
    transactionXdr: string,
    _opts: { networkPassphrase?: string; address?: string } = {},
  ): Promise<string> {
    try {
      if (!api.signTransaction) throw new WalletError('Freighter signTransaction is unavailable');
      const result = await api.signTransaction(transactionXdr, undefined);
      if (typeof result === 'string') return result;
      if (typeof result === 'object' && result !== null && 'signedTxXdr' in (result as Record<string, unknown>)) {
        return (result as { signedTxXdr: string }).signedTxXdr;
      }
      return JSON.stringify(result);
    } catch (e) {
      throw new WalletError(`Freighter sign failed: ${(e as Error).message}`);
    }
  }
}

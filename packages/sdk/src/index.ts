/**
 * @solshare/sdk public surface.
 */

export { SolShareClient } from './client.js';
export type { SolShareClientOptions, SolShareNetwork } from './client.js';

export * from './horizon.js';
export * from './soroban.js';
export * from './wallet.js';
export * from './stream.js';

export * from './contracts/index.js';

export { NetworkError, WalletError, SolShareError } from '@solshare/shared';

/**
 * @solshare/sdk public surface.
 */

export { SolShareClient } from './client.js';
export type { SolShareClientOptions, SolShareNetwork } from './client.js';

export { SimulationAccount, fundSimulationAccount } from './simulation-account.js';
export type { SimulationAccountOptions } from './simulation-account.js';

export * from './horizon.js';
export * from './soroban.js';
export * from './wallet.js';
export * from './stream.js';
export * from './retry.js';
export * from './pagination.js';
export * from './event-decoder.js';
export * from './transaction-pipeline.js';

export * from './contracts/index.js';

export { NetworkError, WalletError, SolShareError } from '@solshare/shared';

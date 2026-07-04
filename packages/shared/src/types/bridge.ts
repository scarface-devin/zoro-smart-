import type { SourceChain } from '../constants.js';

export interface DepositMessage {
  chainId: number;
  sourceTxHash: string; // 0x-prefixed
  sourceToken: string; // 0x-prefixed bytes32
  sender: string; // hex bytes
  recipient: string; // Stellar G... address
  amount: string; // i128
  nonce: number;
}

export interface ValidatorSignature {
  validator: string; // Stellar G... address
  signature: string; // 0x-prefixed bytes
}

export interface UnwrapRequest {
  chainId: number;
  recipient: string; // hex bytes
  amount: string;
  nonce: number;
}

export type BridgeStatus =
  | 'observed' // watcher saw it on source chain
  | 'signing' // validators signing
  | 'submitted' // tx sent to bridge-wrapper
  | 'minted' // minted on Stellar
  | 'released' // released on source chain (unwrap)
  | 'failed'
  | 'expired';

export interface BridgeTransaction {
  id: string;
  direction: 'wrap' | 'unwrap';
  sourceChain: SourceChain;
  sourceTxHash: string;
  sorobanTxHash?: string;
  wrappedToken: string;
  amount: string;
  sender: string;
  recipient: string;
  status: BridgeStatus;
  createdAt: number; // unix seconds
  updatedAt: number; // unix seconds
  blockNumber?: number;
  blockConfirmations?: number;
  validatorSet?: string[];
  signaturesReceived?: number;
  signaturesRequired?: number;
  failureReason?: string;
}

export interface BridgeTransactionDetail extends BridgeTransaction {
  ledger: number;
  feeCharged?: string;
  memo?: string;
  /**
   * Optional pre-built Soroban operation that, if present, was the source
   * for this wrap/unwrap record. Stored as `unknown` here to keep this
   * shared DTO dependency-free; consumers in the API re-cast it to
   * `xdr.Operation` if they need it.
   */
  operation?: unknown;
}

/**
 * Cross-package error types. Mirrors the on-chain `TokenError`,
 * `RegistryError`, `YieldError`, and `BridgeError` enums.
 */

export enum TokenErrorCode {
  NotInitialized = 1,
  AlreadyInitialized = 2,
  Unauthorized = 3,
  MathOverflow = 4,
  InsufficientAllowance = 5,
  InsufficientBalance = 6,
  ZeroAmount = 7,
}

export enum RegistryErrorCode {
  NotInitialized = 1,
  AlreadyInitialized = 2,
  Unauthorized = 3,
  ArrayNotFound = 4,
  ArrayAlreadyExists = 5,
  InvalidStateTransition = 6,
  EmptyArrayId = 7,
}

export enum YieldErrorCode {
  NotInitialized = 1,
  AlreadyInitialized = 2,
  Unauthorized = 3,
  UnknownShareToken = 4,
  PaymentTokenFailure = 5,
  NothingToClaim = 6,
  MathOverflow = 7,
}

export enum BridgeErrorCode {
  NotInitialized = 1,
  AlreadyInitialized = 2,
  Unauthorized = 3,
  AlreadyProcessed = 4,
  UnknownChain = 5,
  UnknownToken = 6,
  InvalidSignatures = 7,
  MathOverflow = 8,
  QuorumNotMet = 9,
}

/** Base class for all SolShare SDK errors. */
export class SolShareError extends Error {
  readonly code: number;
  readonly contract?: string;

  constructor(message: string, code: number, contract?: string) {
    super(message);
    this.name = 'SolShareError';
    this.code = code;
    this.contract = contract;
  }

  /** Optionally sub-class. */
  static fromContract(code: number, contract: string, message?: string): SolShareError {
    return new SolShareError(message ?? `Contract ${contract} error code ${code}`, code, contract);
  }
}

/** Network/HTTP-level errors thrown by the SDK. */
export class NetworkError extends SolShareError {
  constructor(message: string, public readonly cause?: unknown) {
    super(message, -1);
    this.name = 'NetworkError';
  }
}

/** Wallet-related errors (Freighter not installed / disconnected). */
export class WalletError extends SolShareError {
  constructor(message: string) {
    super(message, -2);
    this.name = 'WalletError';
  }
}

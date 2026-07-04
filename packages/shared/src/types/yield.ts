export interface YieldDistribution {
  distributorId: string;
  shareToken: string; // Soroban contract address
  paymentToken: string; // Soroban contract address
  totalFunded: string;
  totalClaimed: string;
  yieldPerShare: string;
  lastFundedAt: number;
  funder: string;
}

export interface YieldClaim {
  holder: string;
  distributorId: string;
  amount: string;
  paymentToken: string;
  txHash: string;
  claimedAt: number;
}

export interface HolderYield {
  holder: string;
  distributorId: string;
  shares: string;
  claimable: string;
  paidYieldPerShare: string;
  globalYieldPerShare: string;
}

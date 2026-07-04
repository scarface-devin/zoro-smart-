# Operator scripts

One-shot scripts to set up a Stellar environment, deploy SolShare contracts,
and inspect on-chain state. Run via `pnpm --filter @solshare/tools …` from
the repo root.

| Script                  | Purpose                                                     |
|-------------------------|-------------------------------------------------------------|
| `setup-stellar-env.ts`  | Fund a fresh deployer keypair via Friendbot (testnet).     |
| `deploy-testnet.ts`     | Build + deploy all four Soroban contracts to TESTNET.       |
| `deploy-mainnet.ts`     | Same flow for PUBLIC — extra confirmation prompts.         |
| `inspector.ts`          | Read-only inspector wrapper around the SDK for debugging. |

## Required environment
See [`../../.env.example`](../../.env.example) for the full list. The most
important variables are:

```
SOLSHARE_DEPLOYER_SECRET=<secret seed>
SOLSHARE_ADMIN_PUBLIC=<G.. address>
STELLAR_NETWORK=TESTNET
```

## Install Stellar CLI
```bash
cargo install --locked stellar-cli --features opt
```

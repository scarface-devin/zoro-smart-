# 0001 — `simulateTransaction` uses a synthetic source account (Soroban)

- **Status:** open
- **Labels:** `bug`, `soroban`, `sdk`, `priority: high`
- **Component:** `packages/sdk/src/contracts/contract-client.ts`
- **Milestone:** v0.2 — Live Testnet

## Summary

Every read in `SolShareClient` is dispatched through a Soroban
`simulateTransaction` call. Today the source account is hard-coded to:

```ts
new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', '0')
```

The Testnet / Publicnet Soroban RPCs reject this with `MissingAccount` (or
`BadSourceAccount`) because the address is the well-known zero key and the
sequence number is `0`. As a result, every dashboard call to
`client.arrays()`, `client.yieldForHolder()`, `client.bridge.history()`,
etc. throws before any contract method runs.

## Reproduction

```ts
import { SolShareClient } from '@solshare/sdk';

const c = new SolShareClient({
  network: 'testnet',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  registryContract: 'C…',
});

await c.arrays(); // → throws MissingAccount
```

## Proposed fix

Generate (or accept) a real ed25519 keypair, optionally pre-fund it via
Friendbot for Testnet use, and pass it as the simulation source. The
function is read-only, so no on-chain signature is required; only the RPC
needs to be able to look the account up.

```ts
const source = await this.ensureSimulationAccount(env); // Friendbot on testnet
const tx = new TransactionBuilder(source, { ... })
  .addOperation(contract.call('list_arrays'))
  .setTimeout(30)
  .build();
const sim = await rpc.simulateTransaction(tx);
```

## Acceptance criteria

- [ ] All `read*` methods resolve against the live Testnet RPC.
- [ ] A vitest covers the path against a public Testnet array.
- [ ] `setSimulationAccount(pk)` escape hatch is documented.

## Out of scope

- Send-path signature wiring (covered in #0003).

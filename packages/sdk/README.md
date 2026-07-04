# @solshare/sdk

TypeScript SDK that wraps the four SolShare Soroban contracts
(`rwa-token`, `solar-registry`, `yield-distributor`, `bridge-wrapper`) into
a single ergonomic client, plus Freighter wallet helpers and Horizon/Soroban
RPC utilities.

## Layout

```
src/
├── client.ts              # SolShareClient — main entry point
├── horizon.ts             # Horizon REST helpers (account, payments, stream)
├── soroban.ts             # Soroban JSON-RPC helpers (simulate, send, getEvents)
├── wallet.ts              # Freighter wallets API helpers
├── stream.ts              # Server-Sent Events (SSE) consumer for live updates
└── contracts/
    ├── index.ts           # Sub-export
    ├── rwa-token.ts       # SEP-41 token wrapping
    ├── solar-registry.ts  # Array registry queries
    ├── yield-distributor.ts # Yield claim and fund helpers
    └── bridge-wrapper.ts  # Cross-chain wrapping helpers
```

## Quick start

```ts
import { SolShareClient } from '@solshare/sdk';

const client = SolShareClient.forTestnet();
const registry = await client.registry.getAllArrays();
for (const arr of registry) {
  console.log(arr.name, arr.status, `${arr.ratedCapacityW}W`);
}
```

## Live streaming

```ts
const stream = await client.stream.liveBridgeTransitions();
stream.on('event', (e) => console.log('Bridge update', e));
```

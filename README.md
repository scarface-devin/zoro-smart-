# ☀️ SolShare Network

> **A Soroban-powered Real World Asset (RWA) engine for crowdfunded urban solar arrays, with cross-chain wrapping middleware.**

Crowdfund urban solar arrays as on-chain share tokens, pull energy-revenue
yields, and bridge exposure from Ethereum, Solana, Polygon and more onto
Stellar in seconds.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![pnpm](https://img.shields.io/badge/managed_with-pnpm-ffd86b)](https://pnpm.io)
[![Soroban](https://img.shields.io/badge/powered_by-Soroban-3fc06a)](https://soroban.stellar.org)

---

## What's in the box

```
solshare-network/
├── contracts/              Soroban smart contracts (Rust)
│   ├── rwa-token           SEP-41 share token per array
│   ├── solar-registry      Lifecycle & metadata per array
│   ├── yield-distributor   Pull-payment revenue splitter
│   └── bridge-wrapper      Cross-chain wrap/unwrap orchestrator
├── packages/
│   ├── shared              Cross-package types, constants, formatters
│   └── sdk                 Soroban + Horizon + Freighter TypeScript SDK
├── apps/
│   ├── api                 Fastify REST + SSE gateway
│   ├── indexer             Soroban event indexer + Postgres + Redis pub/sub
│   └── web                 Vite + React + TypeScript dashboard
├── tools/scripts           Setup + deploy + inspect utilities
├── docker/                 Per-service Dockerfiles + nginx config
├── docs/                   Architecture notes + curated issue backlog
└── .github/
    ├── ISSUE_TEMPLATE/     bug_report, feature_request, good_first_issue
    └── workflows           CI (lint, typecheck, test, build) + contracts + deploy
```

The whole polyrepo runs as a single **pnpm workspace** — packages can be split
into separate git repositories in the future without changing the source code.

> **Polyrepo strategy.** The Drips Wave rubric calls for a polyrepo layout
> (`solshare-contracts`, `solshare-relayer`, `solshare-dashboard`). Today this
> repo combines all three: `contracts/*` is `solshare-contracts`, `apps/api`
> + `apps/indexer` together form `solshare-relayer`, and `apps/web` is
> `solshare-dashboard`. The source is structured so each top-level folder
> can be promoted to its own repository on day one — the package
> boundaries (`@solshare/shared`, `@solshare/sdk`) are designed for that
> move and the Dockerfiles already treat the apps as independent images.

### Repository-to-repository communication map

```
+--------------------+         +---------------------+         +---------------------+
|  Source chains     |         |   SolShare API      |         |   SolShare Web      |
|  (ETH / SOL / POL) |         |   (Fastify)         |         |   (Vite + React)    |
+--------+-----------+         +----+---------+------+         +-----+-----------+----+
         |  Lock tx               |  /api/bridge/tx   SSE        |  TanStack Query
         v                        |  /api/stream/events           |  EventSource
+--------+-----------+         +----+---------+------+         +-----+-----------+----+
|  bridge-wrapper    |  events |  indexer      |  pub/sub      |  packages/sdk        |
|  (Soroban)         +-------->|  (Drizzle)    +------------->|  (Horizon, Soroban)  |
+--------+-----------+         +----+---------+------+         +-----+-----------+----+
         ^                              |                             |
         |      invoke_contract         v                             |
+--------+-----------+         +-------+--------+----+                |
|  yield-distributor |         |  Postgres  | Redis  |<---------------+
|  (Soroban)         |         +------------+--------+   reads
+--------+-----------+                       ^
         ^                                   | events
         |                                   |
+--------+-----------+         +-------------+--------+
|  rwa-token         |         |  solar-registry       |
|  (Soroban)         |         |  (Soroban)            |
+--------------------+         +----------------------+
```

Solid arrows = data flow. Dashed = polled reads. The `bridge-wrapper` is
the only contract that crosses chain boundaries; everything else is
purely Soroban-native and reads from the indexer's Postgres tables.

## Quickstart (Testnet)

```bash
# 1. Install dependencies (pnpm 9+ recommended)
pnpm install

# 2. Spin up PostgreSQL + Redis (and the API/indexer if you want)
docker compose -f docker-compose.dev.yml up -d postgres redis

# 3. Build the Soroban contracts once
cargo install --locked stellar-cli --features opt
rustup target add wasm32-unknown-unknown
cd contracts && cargo build --workspace --target wasm32-unknown-unknown --release
cd ..

# 4. Bootstrap a funded Testnet keypair + deploy the four contracts
pnpm --filter @solshare/tools run setup
pnpm --filter @solshare/tools run deploy:testnet
# (the script writes .stellar/deployments/testnet.json which the API
#  and dashboard pick up automatically)

# 5. Run the API + indexer
pnpm --filter @solshare/api run dev
pnpm --filter @solshare/indexer run dev

# 6. Run the dashboard
pnpm --filter @solshare/web run dev
# → http://localhost:5173
```

### Optional flags

- `?demo=1` on the dashboard URL — enables the synthetic cross-chain
  simulator (offline previews).
- `VITE_DEMO_MODE=1` in `apps/web/.env` — same effect, but persistent
  for the whole dev session.
- `VITE_API_BASE_URL=https://api.example.com/api` in `apps/web/.env` —
  point the dashboard at a non-default backend.

## Smart contracts

Each Soroban contract is a self-contained Rust workspace member that compiles
to WebAssembly via the official `stellar-cli`.

```bash
# one-time setup
cargo install --locked stellar-cli --features opt
rustup target add wasm32-unknown-unknown

# build all contracts
cargo build --workspace --target wasm32-unknown-unknown --release

# test all contracts
cargo test --workspace

# deploy (testnet)
pnpm --filter @solshare/tools run setup        # generates a funded keypair
pnpm --filter @solshare/tools run deploy:testnet
```

## Architecture

```
        +--------------+      +-------------+      +-----------------+
 ETH →  |  Watcher(s)  | ---> | Validators  | ---> | bridge-wrapper |
 SOL →  +--------------+      +-------------+      +-----------------+
 POL →        |                                       (Soroban)
               v                                         |
        +---------------+                                v
        |   Indexer     | --> Postgres --> REST API -->   Web
        +---------------+            (SSE)        ↑
                                +---------------+
                                | rwa-token | yield-distributor |
                                +---------------+   …linked to…
                              solar-registry  (one entry per array)
```

Read [`apps/web/src/pages/About.tsx`](apps/web/src/pages/About.tsx) for a
diagram in the dashboard, or [`contracts/README.md`](contracts/README.md)
for the full contract surface.

## Configuration

Copy [`/.env.example`](.env.example) to `/.env` and fill in the real values.
Never commit secrets. The API/indexer validate env vars with `zod` at startup
and exit if anything is missing.

## Tests

```bash
# Soroban (Rust)
cd contracts && cargo test --workspace

# TypeScript (vitest)
pnpm -r test
pnpm --filter @solshare/api test
pnpm --filter @solshare/indexer test
pnpm --filter @solshare/sdk test
pnpm --filter @solshare/web test

# Type-only checks across the polyrepo
pnpm -r run typecheck
```

Every Soroban contract ships with native `#[test]`s in
`contracts/*/src/test.rs`; CI runs them in
[`.github/workflows/contracts.yml`](.github/workflows/contracts.yml).

## Contributing

Bug reports, feature requests, and good first issues all live under
[`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/). A curated
backlog of open issues lives in [`docs/issues/`](docs/issues/) — start
there if you want to pick something up. The dashboard accepts an
opt-in `?demo=1` flag so contributors can preview UI changes without
standing up the API.

### Project board + milestones

The repository tracks work across three milestones that match the
`Milestone:` field on every curated issue:

| Milestone | Description |
| --- | --- |
| `v0.2` | Live Testnet |
| `v0.3` | Cross-chain MVP |
| `v0.4` | Drips Wave submission polish |

Issues are also tagged with a `status:` label that mirrors a Kanban
column:

| Label | Column equivalent |
| --- | --- |
| `status: backlog` | Backlog |
| `status: in progress` | In Progress |
| `status: review` | Review |
| `status: done` | Done |

The full **`SolShare Roadmap`** project board (with the four columns
above) needs to be created once via the GitHub web UI
(Issues tab → Projects → New project → Board with Backlog / In
Progress / Review / Done columns). The gh CLI integration used by
`tools/scripts/setup-project-board.sh` does not have the `project`
scope, so it creates the milestones + status labels + initial
assignments but stops short of the board itself. The script is
idempotent: once the board exists, re-run it to populate the
columns. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full
**Project bootstrap scripts** section (prerequisites, idempotency
caveats, and the `create-issues.sh` companion script for re-creating
the curated issue backlog from `docs/issues/`).

## Deploy

* `pnpm deploy:testnet`     — installs all four contracts on Testnet.
* `pnpm deploy:mainnet`     — same on Public, with explicit confirmations.

The output is written to `.stellar/deployments/<network>.json` and is the
source of truth for frontend env vars in CI deployments.

## License

Apache-2.0 — see [`LICENSE`](LICENSE).

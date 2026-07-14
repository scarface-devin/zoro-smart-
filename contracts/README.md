# SolShare Network — Smart Contracts (Soroban / Rust)

Soroban smart contracts are the on-chain backbone of **SolShare Network**.
Each contract is a self-contained Rust crate that compiles to WebAssembly and
runs on the Stellar smart-contract platform.

| Contract             | SEP / Role                              | Purpose                                                  |
|----------------------|-----------------------------------------|----------------------------------------------------------|
| `rwa-token`          | SEP-41 fungible token                   | Issues fractional ownership shares for each solar array. |
| `solar-registry`     | Custom                                  | Stores verified metadata for every physical array.      |
| `yield-distributor`  | Custom pull-payment                     | Splits energy revenue proportionally to share holders.  |
| `bridge-wrapper`     | Custom lock-and-mint                    | Mints wrapped assets on Stellar from ETH/SOL/POL locks. |

## Build (requires `cargo` + `wasm32-unknown-unknown` target)

```bash
# from repo root
cargo install --locked stellar-cli --features opt
cargo build --workspace --target wasm32-unknown-unknown --release
```

Optimised WASM artefacts are written to `target/wasm32-unknown-unknown/release/`.

## Test

```bash
cargo test --workspace
```

Soroban test snapshots in `contracts/*/test_snapshots/test/*.json` are gitignored and regenerated locally on every `cargo test` run — if a fresh checkout fails on missing snapshots, run `INSTRUCTIONS_BUILD_TEST_SNAPSHOTS=true cargo test --workspace` to force write mode.

## Deploy

See [`tools/scripts/README.md`](../tools/scripts/README.md) and
[the network configs](../stellar.toml) located at the repo root.

## Event topics (consumed by `@solshare/indexer`)

| Contract             | Topics                                              |
|----------------------|-----------------------------------------------------|
| `rwa-token`          | `mint`, `burn`, `transfer`, `approve`, `clawback`  |
| `solar-registry`     | `register`, `update`, `decommission`                |
| `yield-distributor`  | `deposit`, `claim`, `fund`                          |
| `bridge-wrapper`     | `wrap`, `unwrap`, `validatorset`                    |

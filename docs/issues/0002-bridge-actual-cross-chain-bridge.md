# 0002 — Bridge wrapper is scaffold-only; needs a real source-chain watcher

- **Status:** open
- **Labels:** `enhancement`, `bridge`, `priority: high`
- **Component:** `contracts/bridge-wrapper/`, `apps/indexer/`, `tools/scripts/`
- **Milestone:** v0.3 — Cross-chain MVP

## Summary

`bridge-wrapper` today is a self-contained Soroban contract: it verifies
ed25519 validator signatures, dispatches `wrap` / `unwrap` events, and
guards against replays. But it does **not** mint the wrapped Soroban
token on a successful wrap — the contract just emits `WrappedEvent` and
expects an off-chain relayer to perform the actual mint.

We need at least one source-chain watcher (Ethereum first) that:

1. Watches `Lock` events on the bridge contract deployed on the source
   chain.
2. Builds a canonical `DepositMessage` and asks the validator set to
   sign.
3. Submits the resulting `wrap` transaction to the Soroban bridge.

The bridge contract itself needs the wrapper to **carry the minter role**
on the wrapped token, or for the indexer to drive the mint from the
wrapper's perspective.

## Acceptance criteria

- [ ] An Ethereum watcher under `apps/indexer/src/watchers/eth.ts` that
  polls Infura / Alchemy for `Lock(recipient, amount, nonce)` events.
- [ ] A matching Soroban transaction builder that calls `wrap(...)` with
  the validator signatures.
- [ ] Bridge carries the minter role on the bound wrapped token, so the
  scaffold "emit only" path can be replaced with a real cross-contract
  `invoke_contract(wrapped, mint, recipient, amount)`.
- [ ] An end-to-end testnet walkthrough recorded in `docs/walkthroughs/`.

## Out of scope

- Solana / Polygon watchers (separate issues).
- Multi-sig slashing economics.

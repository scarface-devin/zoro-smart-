# 0005 — README: add a platform / network support matrix

- **Status:** open
- **Labels:** `good first issue`, `documentation`, `priority: low`
- **Component:** `README.md`
- **Milestone:** v0.4 — Drips Wave submission polish

## Summary

New contributors keep asking "does it work on Public yet?", "which
chains are bridged?", "which wallets?". Add a single table at the top
of `README.md` that captures:

| Surface | Testnet | Mainnet | Source of truth |
| --- | --- | --- | --- |
| Stellar Horizon | ✅ | ✅ | `packages/shared/src/constants/networks.ts` |
| Soroban RPC | ✅ | ⏳ pending audit | `packages/shared/src/constants/networks.ts` |
| Ethereum bridge watcher | ⏳ scaffold | ❌ | `apps/indexer/src/watchers/eth.ts` (TBD) |
| Solana bridge watcher | ❌ | ❌ | not started |
| Polygon bridge watcher | ❌ | ❌ | not started |
| Freighter wallet | ✅ | ✅ | `packages/sdk/src/wallets/freighter.ts` |
| Albedo wallet | ⏳ scaffold | ❌ | not started |
| Lobstr wallet | ❌ | ❌ | not started |

## Acceptance criteria

- [ ] Table renders correctly in the GitHub README.
- [ ] Every cell is backed by a code path or marked "not started".
- [ ] PR also updates `packages/shared/src/constants/platforms.ts` so the
  table is generated, not hard-coded.

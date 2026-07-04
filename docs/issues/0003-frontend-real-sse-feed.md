# 0003 — Dashboard `CrossChainMonitor` is a JS-timer demo, not a real feed

- **Status:** open
- **Labels:** `good first issue`, `frontend`, `api`, `priority: medium`
- **Component:** `apps/web/src/components/CrossChainMonitor.tsx`,
  `apps/web/src/hooks/useStats.ts`, `apps/web/src/pages/Dashboard.tsx`,
  `apps/web/src/pages/Bridge.tsx`
- **Milestone:** v0.2 — Live Testnet

## Summary

The live "cross-chain" panel on the dashboard is driven by a
`setInterval` inside `CrossChainMonitor` that produces fake
`BridgeTransaction` objects. This is intentional for offline previews
but means the dashboard is **not** pointing at the real
`/api/bridge/transactions` endpoint or the `/api/stream/events` SSE
gateway — both of which already exist in `apps/api`.

We need:

1. `useBridgeTransactionsCombined()` to subscribe to
   `/api/stream/events` via `EventSource` and merge new events into the
   TanStack Query cache.
2. `CrossChainMonitor` to take an `items` prop and only fall back to the
   internal simulator when `?demo=1` is set in the URL **or**
   `VITE_DEMO_MODE=1` is configured.
3. The empty state to read "Waiting for first event from {chain}…".
4. A vitest with MSW that asserts the merge logic.

## Acceptance criteria

- [ ] `pnpm --filter @solshare/web run dev` shows real events from a
  running `pnpm --filter @solshare/api run dev` (no fake data).
- [ ] `?demo=1` re-enables the simulator for offline previews.
- [ ] README mentions the SSE endpoint.

## Out of scope

- Replaying historical events into the dashboard (covered in #0005).

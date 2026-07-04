# @solshare/web

Vite + React + TypeScript dashboard for SolShare Network.

## Pages
- `/` — landing page + hero CTA
- `/dashboard` — protocol stats, recent events, leaderboard
- `/arrays` — list registered arrays with status filters
- `/arrays/:id` — array detail with capacity, location, environmental impact
- `/bridge` — cross-chain wrapping live monitor
- `/yield` — connected wallet's claimable yield

## Develop
```bash
pnpm --filter @solshare/web run dev
# open http://localhost:5173
```

## Build
```bash
pnpm --filter @solshare/web run build
```

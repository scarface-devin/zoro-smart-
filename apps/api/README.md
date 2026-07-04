# @solshare/api

Fastify-based backend gateway that fronts the SolShare SDK and the indexer.
Exposes REST endpoints and Server-Sent Events to the dashboard.

## Endpoints

| Method | Path                       | Description                                          |
|--------|----------------------------|------------------------------------------------------|
| GET    | `/api/health`              | Liveness / readiness check.                          |
| GET    | `/api/stats`               | Aggregate protocol stats.                            |
| GET    | `/api/arrays`              | List registered solar arrays.                        |
| GET    | `/api/arrays/:id`          | One array, with computed fields.                     |
| GET    | `/api/bridge/transactions` | List cross-chain wrap/unwrap operations.             |
| POST   | `/api/bridge/wrap`         | Submit a verified deposit message to mint wrapped.   |
| POST   | `/api/bridge/unwrap`       | Burn wrapped tokens and request release.             |
| GET    | `/api/yield/:distributor/:holder` | Claimable yield for a holder.                 |
| GET    | `/api/stream/events`       | SSE stream of protocol events.                       |
| GET    | `/docs`                    | OpenAPI documentation.                               |

## Run

```bash
pnpm --filter @solshare/api run dev
```

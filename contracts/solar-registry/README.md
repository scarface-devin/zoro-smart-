# solar-registry

Canonical on-chain registry of every urban solar array registered in SolShare.

Each array has a unique `BytesN<32>` id (off-chain documented as a SHA-256 of
the metering endpoint ID), full geospatial metadata, environmental impact
estimates, and an optional pointer to the `rwa-token` contract that represents
its fractional ownership shares.

## Lifecycle

```
Pending → Active ⇄ Maintenance → Decommissioned
```

## Roles

| Role       | Powers                                                          |
|------------|-----------------------------------------------------------------|
| `admin`    | Decommission arrays, update admin/verifier.                    |
| `verifier` | Register arrays, bind token contracts, transition status (except decommission). |

## Events

- `ArrayRegisteredEvent(id, operator, rated_capacity_w)`
- `ArrayUpdatedEvent(id, new_status)`
- `ArrayDecommissionedEvent(id, reason)`

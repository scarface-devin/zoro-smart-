# @solshare/indexer

Background worker that subscribes to Soroban RPC `getEvents` for every
SolShare contract address and persists decoded events to Postgres. A second
channel re-emits the events over Redis pub/sub so the API and dashboard can
listen in real time.

## Pipeline

```
   Soroban RPC
       │  (poll every N ms)
       ▼
  EventsFetcher ──► EventRouter ──► PostgresWriter
                                  └► RedisPublisher
```

## Setup Postgres

```bash
docker compose -f docker-compose.dev.yml up -d postgres
pnpm --filter @solshare/indexer run db:push
```

## Run

```bash
pnpm --filter @solshare/indexer run dev
```

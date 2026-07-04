# Contributing to SolShare Network

Thanks for taking a look! The SolShare monorepo is a pnpm workspace with
four Soroban contracts and three TypeScript apps. Everything you need
to get up and running is in [`README.md`](README.md).

## Workflow

1. **Pick an issue.** Browse [`docs/issues/`](docs/issues/) — every
   entry has an acceptance checklist and a `good first issue` label
   where appropriate. If you want to work on something not listed,
   open a feature request via
   [`.github/ISSUE_TEMPLATE/feature_request.md`](.github/ISSUE_TEMPLATE/feature_request.md)
   first.
2. **Branch.** Use a topic branch off `main` named after the issue
   (`0003-frontend-sse-live-feed`, `fix/soroban-decimal-overflow`, …).
3. **Develop.** Follow the existing code style — `pnpm lint` runs
   ESLint + Prettier; `cargo fmt` + `cargo clippy` handle the Rust
   side. Every contract has a `src/test.rs`; mirror that pattern when
   adding a new contract.
4. **Validate locally.**
   ```bash
   pnpm -r run typecheck
   pnpm -r test
   cd contracts && cargo test --workspace
   ```
5. **Open a PR.** Reference the issue (`Closes #0003`), include a
   short description of the change, and attach a screenshot if the
   dashboard is involved.

## Branch naming

- `feat/<short-topic>` — new feature
- `fix/<short-topic>` — bug fix
- `docs/<short-topic>` — docs only
- `chore/<short-topic>` — refactors, dependency bumps, etc.

## Commit messages

We use the [Conventional Commits](https://www.conventionalcommits.org/)
style so `release-please` can cut changelogs automatically. Types we
commonly use: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`,
`build`, `ci`.

## Local dev tips

- The dashboard accepts a `?demo=1` query parameter to drive a built-in
  cross-chain simulator; this lets you iterate on UI without standing
  up the API + indexer.
- The API exposes a Server-Sent-Events gateway at
  `GET /api/stream/events`. Subscribing from `curl` is a great way to
  inspect what the indexer is publishing.
- Contract addresses, Horizon / Soroban RPC URLs, and admin keys all
  live in `.env` (see `.env.example`).

## Code of conduct

Be kind, assume good faith, and focus on the work. Harassment of any
kind is not tolerated.

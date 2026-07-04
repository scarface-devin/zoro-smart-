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

## Project bootstrap scripts

`tools/scripts/` holds two bash helpers used to seed the project
after a fresh clone. They are intended to be run by the repo
maintainer, not by every contributor — but they are checked in so the
process is reproducible across environments. Both scripts are
**idempotent in the parts that work via the REST API** (label and
milestone creation, issue assignment); the optional Project v2
board creation is a no-op after the first attempt regardless of
outcome, because the gh CLI integration we use does not have the
`project` scope (see the note in `README.md`).

### Prerequisites

- `gh` CLI v2.80+ ([install](https://cli.github.com/manual/installation))
- `python3` (used inline for JSON parsing — no third-party deps)
- `gh auth login` with at minimum the `repo` scope (the `project`
  scope is optional and will only be used if present)

- **`tools/scripts/create-issues.sh`** — reads the five files in
  `docs/issues/0001-*.md … 0005-*.md`, ensures the required project
  labels exist (`bug`, `enhancement`, `good first issue`, `documentation`,
  `frontend`, `api`, `sdk`, `soroban`, `bridge`, `help wanted`,
  `needs-triage`, `priority: high/medium/low`), and opens one
  GitHub issue per file with the labels and body parsed from the
  frontmatter. Re-runs detect existing issues by title and skip them.

- **`tools/scripts/setup-project-board.sh`** — creates the
  `v0.2` / `v0.3` / `v0.4` milestones and the `status: backlog /
  in progress / review / done` labels, then assigns every open
  issue to its milestone and initial status column. It will
  additionally try to create the `SolShare Roadmap` project board
  and populate its columns if the gh CLI integration has the
  `project` scope; otherwise it stops short of the board itself
  and prints a one-line instruction to create it via the web UI.

To re-run after a fresh clone:

```bash
bash tools/scripts/create-issues.sh
bash tools/scripts/setup-project-board.sh
```

## Code of conduct

Be kind, assume good faith, and focus on the work. Harassment of any
kind is not tolerated.

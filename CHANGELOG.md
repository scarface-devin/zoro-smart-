# Changelog

All notable changes to the SolShare Network project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- **governance**: New governance module with proposal creation, voting, tallying,
  and execution. Includes shared types (`GovernanceProposal`, `ProposalVote`,
  `ProposalTally`), SDK contract client (`GovernanceClient`), API routes, indexer
  event handler, and Governance web page with create-proposal modal.
- **portfolio**: Portfolio tracking feature showing holder investments across all
  solar arrays. Includes shared types (`PortfolioSummary`, `PortfolioHolding`),
  API endpoint for holdings aggregation, and Portfolio web page with stats and
  quick actions.
- **notifications**: Real-time notification system with in-app notification bell,
  unread badge, category filtering, and mark-read functionality. Includes shared
  types, API routes for list/count/mark-read, and SSE-ready architecture.
- **search**: Global search with `Cmd+K` shortcut, searching across arrays and
  governance proposals. Includes shared types, API endpoint with caching, and
  `SearchBar` component with keyboard-first UX.
- **analytics**: Analytics API with volume tracking, top arrays ranking, and
  yield projections. Includes shared types and three REST endpoints.
- **web/docs**: FAQ page with category-filtered accordion and Docs page with
  protocol reference, bridge guide, governance, and API documentation sections.
- **web/nav**: Expanded navigation with Portfolio, Governance, FAQ, and Docs
  links in both header and sidebar. Notification bell integrated into header.
- **yield-distributor**: `funder()` and `total_claimed()` read helpers now
  exposed on the public contract surface. The SDK `YieldDistributorContract`
  wrapper includes typed methods for both getters. ([#0e88d01])
- **rwa-token**: Unit test `test_version_returns_cargo_pkg_version()` that
  exercises the existing `version()` function and guards against regressions.
  ([#c26b283])
- **indexer/poller**: Extended `classifyEvent()` helper to parse both
  plain-string topics and the canonical ScVal JSON-object format returned by
  the live Soroban RPC (e.g. `{"type":"symbol","value":"mint"}`). Added seven
  new test cases covering the descend encoding path. ([#<COMMIT_4>])

### Fixed

- **rwa-token**: `approve()` now calls `extend_ttl` on the persistent
  `Allowance` storage key with a computed target TTL derived from
  `expiration_ledger` (floor: 1 day, target: max(expiration - current, 1 day)).
  Before this fix the approval could be garbage-collected by the Soroban runtime
  before the specified expiration was reached. ([#c26b283])
- **yield-distributor**: `fund()` now returns `YieldError::ZeroAmount` (new
  discriminant 8) when `amount <= 0`, replacing the incorrect `MathOverflow`
  error code. Added `test_fund_rejects_zero_amount()` to pin the corrected
  behaviour. ([#6620f84])
- **yield-distributor**: `claim()` now calls `extend_ttl` on the persistent
  `PaidYieldPerShare(holder)` key with a 90-day target (7,776,000 ledgers) to
  prevent the holder's claim ledger from being evicted between revenue epochs.
  A stale or missing entry would cause the holder to be treated as a
  first-time claimant, leading to a double-payout bug. ([#6620f84])

### Changed

- **indexer**: `classifyEvent()` logic refactored to extract the topic string
  from either the legacy plain-string format or the JSON-encoded ScVal object
  format used by the live Soroban RPC. This ensures event classification
  remains correct regardless of RPC version or environment. ([#<COMMIT_4>])

---

## [0.1.0] – 2026-07-07

Initial release. Includes four Soroban contracts (`rwa-token`, `solar-registry`,
`yield-distributor`, `bridge-wrapper`), a TypeScript SDK, a Fastify-based REST
API with SSE streaming, a Vite + React dashboard, and a Postgres + Redis event
indexer.

---

[Unreleased]: https://github.com/scarface-devin/zoro-smart-/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/scarface-devin/zoro-smart-/releases/tag/v0.1.0

# 0004 — Add a docs site + centralise the architecture diagrams

- **Status:** open
- **Labels:** `good first issue`, `documentation`, `priority: low`
- **Component:** `docs/`, `README.md`
- **Milestone:** v0.4 — Drips Wave submission polish

## Summary

We have architecture diagrams scattered across `README.md` and
`apps/web/src/pages/About.tsx`, but no first-class docs site. A first
PR can:

1. Move the ASCII diagram from `README.md` into `docs/architecture.md`
   with Mermaid sources.
2. Add a `docs/contract-surface.md` that lists every public function of
   `rwa-token`, `solar-registry`, `yield-distributor`, `bridge-wrapper`,
   cross-referenced from each contract's `//!` doc-comment.
3. Add a `docs/faq.md` answering "How do I become a validator?", "How is
   the wrapper token audited?", and "What happens when an array is
   decommissioned?".

## Acceptance criteria

- [ ] Mermaid sources render in GitHub markdown previews.
- [ ] Every public contract function appears in the surface doc.
- [ ] `README.md` links to each docs file.

## Why this is a good first issue

- Touches only markdown — no runtime code.
- The architecture decisions are already made; you're just documenting
  them.
- A great way to learn the codebase top-to-bottom.

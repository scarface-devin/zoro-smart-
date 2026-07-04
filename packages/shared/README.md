# @solshare/shared

Shared TypeScript types, constants, errors, and formatters used across every
package in the SolShare Network polyrepo (frontend, SDK, API, indexer).

The package is **type-only** at runtime — it adds zero dependencies and
should remain compile-time/importable on both Node.js and the browser. Any
time you need a value used in two packages, add it here.

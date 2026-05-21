# Faro Agent Notes

This repo is a civic-tech investigation product. Work conservatively.

## Product Rule

Faro does not accuse. Faro shows where to look, why to look there, what official
evidence exists, and what still needs verification.

Do not add copy or logic that implies guilt, corruption, fraud, theft, or a
wrongdoing score.

## Engineering Rules

- Prefer simple functions over abstract class hierarchies.
- Do not create generic abstractions until there are at least 3 real use cases.
- Keep controllers and route handlers thin. Business logic belongs in
  `src/lib/data` or `src/lib/caseRepository.ts`.
- Avoid modifying unrelated files.
- Preserve existing patterns unless explicitly instructed otherwise.
- Do not add dependencies without a concrete reason.

## Data Rules

- Do not invent, geocode, infer, or auto-correct coordinates.
- Map exposure requires validated official geometry.
- Invalid coordinates must remain available as data gaps in explorer/export
  paths, but must not be drawn on the map.
- Receipts, raw paths, hashes, locator types and caveats are part of the product,
  not implementation details.
- Dataset URLs must not be presented as direct official case pages.

## Read First

- `README.md`
- `docs/agent-onboarding.md`
- `docs/product/faro-product-context.md`
- `docs/handoffs/2026-05-17-argentina-contract-expansion-handoff.md`
- `docs/handoffs/2026-05-17-argentina-historical-judicial-cases-handoff.md`
- `docs/handoffs/2026-05-17-data-integrity-and-quality-sprint-handoff.md`

## Known State

Run `npm run data:build`, `npm run data:verify`, `npm run data:geo-report`,
`npm run data:quality-report`, `npm test`, `npm run typecheck`, and
`npm run build` before release work that changes code or data.

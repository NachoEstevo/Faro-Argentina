# Institutional Trust Package

## Goal

Strengthen Faro for an institutional presentation without turning it into a
promotional demo. The product must show a real operational path:

`mapa oficial -> Explorer -> expediente -> rastro economico -> evidencia oficial -> aporte privado -> carpeta de investigacion -> informe descargable`

The work improves the existing product surfaces. It does not add a separate
landing page, accusation layer, AI search, public community feed or case gallery.

## Product Rules

- Faro does not accuse. It shows where to look, what official evidence exists,
  what caveats apply and what still needs verification.
- Curated cases must be few and defensible. Four strong cases are acceptable;
  five is acceptable only if the additional case adds a distinct official source,
  agency, geography or workflow lesson.
- Judicial context and data-gap cases stay off the map unless the case has
  validated official geometry.
- Aportes are private review material. Approval means "ready for internal use",
  not true, published, official or public.
- "Sin contacto" is not a guarantee of anonymity. The product can reduce the
  contact data requested, but must explain technical metadata and legal limits.

## Slice 1: Curated Strong Cases

`src/data/curatedCases.ts` remains the source for selected cases.

Selection criteria:

- real Faro case id;
- official receipt;
- visible caveats;
- report route available;
- useful next verification step;
- map state matches `shouldExposeCaseOnMap`;
- copy avoids accusations and certainty language.

Current four cases remain valid. Add only one candidate if it improves the
institutional range: `AR-CONTRACT-74-0052-CON23`, a map-ready contract from
Administracion de Parques Nacionales with official amount, official budget,
validated geometry, caveats and clear follow-up checks.

Explorer selected preset must show not only the rows but also the reason for
selection: official basis, caveat and next step. This should be compact and
scannable, not a large gallery or marketing card.

## Slice 2: Privacy And No-Contact Aportes

The public Aportes flow must make these points visible at the moment of upload:

- no-contact mode does not ask for name or email;
- no-contact mode redacts original filenames in Faro's stored manifest;
- Faro still receives file contents;
- image/PDF metadata may remain inside files unless reviewed/redacted later;
- hosting, network, browser or legal processes may generate technical metadata;
- no material appears automatically in map, Explorer, reports or exports.

Admin review must show the privacy mode so reviewers know whether they should
avoid contact attempts and handle filenames/files carefully.

Legal pages must be updated from "baseline" to a serious operational policy
with explicit remaining legal closure items: responsible party, contact address,
retention period, provider agreements and international transfer review.

Legal references for the policy copy:

- Ley 25.326 on information, consent, security, confidentiality, transfer and
  data-subject rights.
- AAIP data-subject rights: access response in 10 calendar days; rectification,
  update or deletion in 5 business days.
- AAIP international-transfer guidance for cloud/provider flows.
- AAIP Resolution 47/2018 on recommended security measures for personal data.

## Slice 3: Institutional Presentation Package

Create a single internal document at
`docs/presentation/2026-05-25-institutional-demo-package.md`.

It must include:

- the institutional narrative in one paragraph;
- the exact route sequence to present;
- the curated case list and why each is defensible;
- the evidence boundary: official evidence vs. contextual material vs. private
  aporte;
- a three-minute script;
- presenter checklist;
- what not to claim.

The package must use the current app routes and avoid stale counts unless they
are verified in the current run.

## Acceptance Criteria

- `/` stays map-first with a discreet `Expedientes seleccionados` entry.
- `/pais/AR?mode=explorer&preset=selected` shows selected cases, exit control,
  and compact rationale for why those cases were selected.
- Every curated case exists, has a receipt, has caveats and has map state that
  matches the official geometry gate.
- Aportes UI says no-contact is limited and explains file metadata.
- Admin Aportes detail displays privacy mode.
- Legal pages include retention, metadata, provider and international-transfer
  caveats without pretending legal review is complete.
- Presentation package is a document, not a new product surface.
- Tests cover curated rationale, Aportes privacy copy, admin privacy display and
  non-accusatory presentation copy.
